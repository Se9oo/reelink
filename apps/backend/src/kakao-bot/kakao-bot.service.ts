import { Inject, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

import { randomInt } from 'crypto';
import { and, eq, ne } from 'drizzle-orm';

import { DRIZZLE, type DrizzleDb } from '../db/drizzle.module.js';
import { kakaoBotLinks } from '../db/schema.js';
import { LinksService } from '../links/links.service.js';
import { REDIS, type RedisClient } from '../redis/redis.module.js';

import { extractUrls } from './extract-urls.js';
import { type LinkCode, type LinkStatus } from './kakao-bot.types.js';

const CODE_TTL_SECONDS = 300;
const MAX_ISSUE_ATTEMPTS = 10;
const FAIL_WINDOW_SECONDS = 600;
const MAX_FAILS = 5;
const MAX_URLS = 20;
const CODE_PATTERN = /^\d{6}$/;

const settingsUrl = () => `${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/settings`;

const MESSAGES = {
	linked: '연동됐어요! 이제 링크를 보내면 저장해 드려요',
	notLinked: () =>
		`아직 연동되지 않은 채팅방이라 링크를 저장하지 못했어요.\n설정 > 카카오톡 봇 연동에서 6자리 코드를 받아 여기로 보내주세요.\n👉 ${settingsUrl()}`,
	greeting: () =>
		`안녕하세요! 이 채팅방에 링크를 보내면 바로 저장해 드려요.\n먼저 설정 > 카카오톡 봇 연동에서 6자리 코드를 받아 여기로 보내주세요.\n👉 ${settingsUrl()}`,
	sendLink: '링크를 보내주시면 저장해 드려요',
	wrongCode: (remaining: number) =>
		`코드가 맞지 않아요. 설정 > 카카오톡 봇 연동에서 받은 6자리 코드를 확인해 주세요. 코드는 발급 후 5분 동안만 쓸 수 있어요. (남은 시도 ${remaining}번)`,
	locked: (minutes: number) =>
		`코드를 여러 번 잘못 입력해서 잠시 연동을 막아뒀어요. ${minutes}분 뒤에 설정에서 새 코드를 받아 다시 보내주세요.`,
	saved: (count: number) => (count === 1 ? '저장했어요 ✅' : `링크 ${count}개를 저장했어요 ✅`),
	savedPartially: (skipped: number) =>
		`링크 ${MAX_URLS}개를 저장했어요 ✅ 한 번에 ${MAX_URLS}개까지만 저장돼서 나머지 ${skipped}개는 저장하지 못했어요. 나머지 링크만 따로 보내주세요.`,
};

const codeKey = (code: string) => `botcode:${code}`;
const failKey = (botUserKey: string) => `botfail:${botUserKey}`;

@Injectable()
export class KakaoBotService {
	private readonly logger = new Logger(KakaoBotService.name);

	constructor(
		@Inject(DRIZZLE) private readonly db: DrizzleDb,
		@Inject(REDIS) private readonly redis: RedisClient,
		private readonly linksService: LinksService,
	) {}

	/**
	 * 봇 채팅방에 보낼 6자리 연동 코드를 발급한다. 5분 동안 한 번만 쓸 수 있다.
	 * 이미 쓰이고 있는 코드와 겹치면 다시 뽑는다.
	 * @param userId string
	 * @returns LinkCode
	 * @throws ServiceUnavailableException 10번 연속 겹쳐서 발급하지 못했거나 Redis가 응답하지 않는 경우
	 */
	async issueLinkCode(userId: string): Promise<LinkCode> {
		for (let attempt = 0; attempt < MAX_ISSUE_ATTEMPTS; attempt++) {
			const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
			let saved: string | null;

			try {
				saved = await this.redis.set(codeKey(code), userId, 'EX', CODE_TTL_SECONDS, 'NX');
			} catch (error) {
				this.logger.error(error);
				break;
			}

			if (saved) {
				return { code, expiresAt: new Date(Date.now() + CODE_TTL_SECONDS * 1000) };
			}
		}

		throw new ServiceUnavailableException('연동 코드를 발급하지 못했어요. 다시 시도해주세요.');
	}

	/**
	 * 봇 채팅방 연동 여부와 마지막 연동 시각을 반환한다.
	 * @param userId string
	 * @returns LinkStatus
	 */
	async getLinkStatus(userId: string): Promise<LinkStatus> {
		const [link] = await this.db
			.select({ linkedAt: kakaoBotLinks.linkedAt })
			.from(kakaoBotLinks)
			.where(eq(kakaoBotLinks.userId, userId));

		return { linked: !!link, linkedAt: link?.linkedAt ?? null };
	}

	/**
	 * 봇 채팅방에서 온 메시지를 처리하고 답장 문구를 반환한다.
	 * 6자리 숫자면 연동 여부와 상관없이 연동 코드로 처리하고, 연동된 채팅방이면 메시지 속 URL을 최대 20개까지 저장한다.
	 * @param botUserKey string 오픈빌더 botUserKey(userRequest.user.id)
	 * @param utterance string 사용자가 보낸 텍스트
	 * @returns string 봇 답장
	 */
	async handleMessage(botUserKey: string, utterance: string): Promise<string> {
		const trimmed = utterance.trim();

		if (CODE_PATTERN.test(trimmed)) {
			return await this.linkByCode(botUserKey, trimmed);
		}

		const [link] = await this.db
			.select({ userId: kakaoBotLinks.userId })
			.from(kakaoBotLinks)
			.where(eq(kakaoBotLinks.botUserKey, botUserKey));

		const urls = extractUrls(utterance);

		if (!link) {
			return urls.length > 0 ? MESSAGES.notLinked() : MESSAGES.greeting();
		}

		if (urls.length === 0) {
			return MESSAGES.sendLink;
		}

		await this.linksService.createBotLinks(link.userId, urls.slice(0, MAX_URLS));

		return urls.length > MAX_URLS ? MESSAGES.savedPartially(urls.length - MAX_URLS) : MESSAGES.saved(urls.length);
	}

	/**
	 * 연동 코드로 채팅방을 사용자에게 연결한다. 같은 채팅방이 다른 사용자에게 연결돼 있으면 옮기고, 사용자의 이전 채팅방 연결은 교체한다.
	 * 채팅방마다 10분에 5번까지만 틀릴 수 있다.
	 * @param botUserKey string
	 * @param code string 6자리 숫자
	 * @returns string 봇 답장
	 */
	private async linkByCode(botUserKey: string, code: string): Promise<string> {
		const fails = Number((await this.redis.get(failKey(botUserKey))) ?? 0);

		if (fails >= MAX_FAILS) {
			return await this.lockedMessage(botUserKey);
		}

		const userId = await this.redis.getdel(codeKey(code));

		if (!userId) {
			const count = await this.redis.incr(failKey(botUserKey));
			await this.redis.expire(failKey(botUserKey), FAIL_WINDOW_SECONDS, 'NX');

			return count >= MAX_FAILS ? await this.lockedMessage(botUserKey) : MESSAGES.wrongCode(MAX_FAILS - count);
		}

		await this.db.transaction(async (tx) => {
			await tx
				.delete(kakaoBotLinks)
				.where(and(eq(kakaoBotLinks.botUserKey, botUserKey), ne(kakaoBotLinks.userId, userId)));
			await tx
				.insert(kakaoBotLinks)
				.values({ userId, botUserKey })
				.onConflictDoUpdate({ target: kakaoBotLinks.userId, set: { botUserKey, linkedAt: new Date() } });
		});

		return MESSAGES.linked;
	}

	private async lockedMessage(botUserKey: string): Promise<string> {
		const ttl = await this.redis.ttl(failKey(botUserKey));

		return MESSAGES.locked(Math.max(1, Math.ceil(ttl / 60)));
	}
}
