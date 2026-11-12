import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';

import { and, asc, desc, eq, gt, ilike, isNull, lt, or, sql } from 'drizzle-orm';

import { countGraphemes } from '../common/count-graphemes.js';
import { isValidHttpUrl } from '../common/is-valid-http-url.js';
import { DRIZZLE, type DrizzleDb } from '../db/drizzle.module.js';
import { folders, links } from '../db/schema.js';
import { FoldersService } from '../folders/folders.service.js';
import { lockUserFolders } from '../folders/lock-user-folders.js';

import { fetchOgTags } from './fetch-og-tags.js';
import { HomeSummary, Link } from './links.types.js';

const MAX_TEXT_LENGTH = 500;
const REVISIT_AFTER_DAYS = 7;
const REVISIT_LIMIT = 20;
const HOME_PREVIEW_COUNT = 3;
const HOME_RECENT_LIMIT = 5;
const HOME_UPCOMING_LIMIT = 10;
const HOME_STALE_AFTER_DAYS = 14;
const HOME_STALE_LIMIT = 3;

interface CreateLinkParams {
	userId: string;
	url: string;
	folderId: string;
	savedReason?: unknown;
}

/**
 * 선택 입력 텍스트를 검증하고 정리한다. 앞뒤 공백을 지운 뒤 비어 있으면 null로 바꾼다.
 * @param key string 오류 메시지에 쓸 필드 이름
 * @param value unknown 생략(undefined)이면 그대로 undefined를 돌려줌
 * @returns string | null | undefined
 * @throws BadRequestException 문자열/null이 아니거나 500자를 넘는 경우
 */
function normalizeOptionalText(key: string, value: unknown): string | null | undefined {
	if (value === undefined) {
		return undefined;
	}

	if (value !== null && typeof value !== 'string') {
		throw new BadRequestException(`${key}는 문자열이어야 합니다.`);
	}

	const trimmed = value?.trim() || null;

	if (trimmed && countGraphemes(trimmed) > MAX_TEXT_LENGTH) {
		throw new BadRequestException(`${key}는 ${MAX_TEXT_LENGTH}자 이하여야 합니다.`);
	}

	return trimmed;
}

@Injectable()
export class LinksService {
	constructor(
		@Inject(DRIZZLE) private readonly db: DrizzleDb,
		private readonly foldersService: FoldersService,
	) {}

	/**
	 * 웹에서 링크를 등록한다. OG 태그(제목·썸네일) 추출은 별도로 처리하고, 여기서는 null로 둔다.
	 * @param userId string
	 * @param url string http/https 형식이어야 함
	 * @param folderId string 등록할 폴더, 내 폴더여야 함
	 * @param savedReason unknown 생략 가능, 앞뒤 공백을 지우고 비어 있으면 null로 저장
	 * @returns Link
	 * @throws BadRequestException folderId가 없거나 url이 http/https 형식이 아닌 경우, 저장 이유가 문자열이 아니거나 500자를 넘는 경우
	 * @throws NotFoundException folderId가 내 폴더가 아니거나 존재하지 않거나 삭제된 경우
	 */
	async createLink({ userId, url, folderId, savedReason }: CreateLinkParams): Promise<Link> {
		if (!folderId) {
			throw new BadRequestException('folderId는 필수입니다.');
		}

		if (!isValidHttpUrl(url)) {
			throw new BadRequestException('http/https 형식의 URL만 등록할 수 있습니다.');
		}

		const normalizedSavedReason = normalizeOptionalText('savedReason', savedReason);

		const link = await this.db.transaction(async (tx) => {
			await lockUserFolders(tx, userId);

			const [folder] = await tx
				.select()
				.from(folders)
				.where(and(eq(folders.id, folderId), eq(folders.userId, userId), isNull(folders.deletedAt)));

			if (!folder) {
				throw new NotFoundException();
			}

			const [created] = await tx
				.insert(links)
				.values({ userId, folderId, url, savedReason: normalizedSavedReason })
				.returning();

			return created;
		});

		void this.applyOgTags(link.id, url);

		return link;
	}

	/**
	 * 카카오톡 봇으로 받은 링크들을 "카카오톡으로 등록" 시스템 폴더(없으면 지연 생성)에 저장한다. OG 태그 추출은 별도로 처리한다.
	 * @param userId string
	 * @param urls string[] http/https 형식이어야 함, 순서대로 저장
	 * @returns Link[]
	 */
	async createBotLinks(userId: string, urls: string[]): Promise<Link[]> {
		const created = await this.db.transaction(async (tx) => {
			await lockUserFolders(tx, userId);

			const folder = await this.foldersService.getOrCreateSystemFolder(userId, '카카오톡으로 등록', tx);

			return await tx
				.insert(links)
				.values(urls.map((url) => ({ userId, folderId: folder.id, url, folderSource: 'kakao_bot' })))
				.returning();
		});

		for (const link of created) {
			void this.applyOgTags(link.id, link.url);
		}

		return created;
	}

	/**
	 * URL·제목·저장 이유에서 검색어를 대소문자 구분 없이 부분 일치로 찾는다. 내 링크 전체가 대상이고 소프트 삭제된 링크는 제외된다.
	 * @param userId string
	 * @param q string 비어 있으면 빈 배열을 반환
	 * @returns Link[] 최신 등록순, 최대 100개
	 */
	async searchLinks({ userId, q }: { userId: string; q: string }): Promise<Link[]> {
		const keyword = q.trim();

		if (!keyword) {
			return [];
		}

		const pattern = `%${keyword.replace(/[\\%_]/g, '\\$&')}%`;

		return await this.db
			.select()
			.from(links)
			.where(
				and(
					eq(links.userId, userId),
					isNull(links.deletedAt),
					or(ilike(links.url, pattern), ilike(links.title, pattern), ilike(links.savedReason, pattern)),
				),
			)
			.orderBy(desc(links.createdAt))
			.limit(100);
	}

	/**
	 * 리마인드 피드를 조회한다. 아직 안 본 내 링크 전체(오래된 등록순)와, 본 지 1주가 지난 링크 중 오늘 다시 꺼내볼 최대 20개(다시 보기)를 함께 돌려준다.
	 * 다시 보기 순서는 링크 id와 오늘 날짜(KST)로 정해서, 같은 날에는 그대로이고 날이 바뀌면 섞인다. 소프트 삭제된 링크는 제외된다.
	 * @param userId string
	 * @returns { unviewed: Link[]; revisit: Link[] }
	 */
	async getFeed({ userId }: { userId: string }): Promise<{ unviewed: Link[]; revisit: Link[] }> {
		const [unviewed, revisit] = await Promise.all([
			this.db
				.select()
				.from(links)
				.where(and(eq(links.userId, userId), eq(links.status, 'unviewed'), isNull(links.deletedAt)))
				.orderBy(asc(links.createdAt)),
			this.db
				.select()
				.from(links)
				.where(
					and(
						eq(links.userId, userId),
						eq(links.status, 'viewed'),
						isNull(links.deletedAt),
						lt(links.viewedAt, sql`now() - interval '${sql.raw(String(REVISIT_AFTER_DAYS))} days'`),
					),
				)
				.orderBy(sql`md5(${links.id}::text || (now() at time zone 'Asia/Seoul')::date::text)`)
				.limit(REVISIT_LIMIT),
		]);

		return { unviewed, revisit };
	}

	/**
	 * 홈 화면용 요약을 한 번에 조회한다. 리마인드 요약(안 본/다시 볼 링크 수, 가장 오래된 안 본 링크, 미리보기 3장),
	 * 알림 예약한 링크(remindAt이 지금 이후, 가까운 순 10개), 오래 쌓인 링크(저장한 지 2주가 지난 안 본 링크, 오래된 순 3개),
	 * 최근 저장 5개를 돌려준다.
	 * @param userId string
	 * @returns HomeSummary
	 */
	async getHome({ userId }: { userId: string }): Promise<HomeSummary> {
		const mine = and(eq(links.userId, userId), isNull(links.deletedAt));
		const staleBefore = Date.now() - HOME_STALE_AFTER_DAYS * 24 * 60 * 60 * 1000;

		const [feed, upcoming, recent] = await Promise.all([
			this.getFeed({ userId }),
			this.db
				.select()
				.from(links)
				.where(and(mine, gt(links.remindAt, sql`now()`)))
				.orderBy(asc(links.remindAt))
				.limit(HOME_UPCOMING_LIMIT),
			this.db.select().from(links).where(mine).orderBy(desc(links.createdAt)).limit(HOME_RECENT_LIMIT),
		]);

		return {
			remind: {
				unviewedCount: feed.unviewed.length,
				revisitCount: feed.revisit.length,
				oldestUnviewed: feed.unviewed[0] ?? null,
				previews: [...feed.unviewed, ...feed.revisit].slice(0, HOME_PREVIEW_COUNT),
			},
			upcoming,
			stale: feed.unviewed.filter((link) => link.createdAt.getTime() < staleBefore).slice(0, HOME_STALE_LIMIT),
			recent,
		};
	}

	/**
	 * 링크를 열람 처리한다. 이미 본 링크면 처음 본 시각(viewedAt)을 그대로 둔다.
	 * @param userId string
	 * @param linkId string
	 * @returns Link
	 * @throws NotFoundException 링크가 없거나 삭제됐거나 내 링크가 아닌 경우
	 */
	async viewLink({ userId, linkId }: { userId: string; linkId: string }): Promise<Link> {
		const [link] = await this.db
			.update(links)
			.set({ status: 'viewed', viewedAt: sql`coalesce(${links.viewedAt}, now())` })
			.where(and(eq(links.id, linkId), eq(links.userId, userId), isNull(links.deletedAt)))
			.returning();

		if (!link) {
			throw new NotFoundException();
		}

		return link;
	}

	/**
	 * 링크의 제목과 저장 이유를 수정한다. 보낸 필드만 바꾸고, 앞뒤 공백을 지운 뒤 비어 있으면 null로 저장한다.
	 * @param userId string
	 * @param linkId string
	 * @param title unknown 문자열 또는 null, 생략하면 그대로 둠
	 * @param savedReason unknown 문자열 또는 null, 생략하면 그대로 둠
	 * @returns Link
	 * @throws BadRequestException 수정할 필드가 없거나 문자열/null이 아닌 값, 500자를 넘는 값이 들어온 경우
	 * @throws NotFoundException 링크가 없거나 삭제됐거나 내 링크가 아닌 경우
	 */
	async updateLink({
		userId,
		linkId,
		title,
		savedReason,
	}: {
		userId: string;
		linkId: string;
		title?: unknown;
		savedReason?: unknown;
	}): Promise<Link> {
		const values: { title?: string | null; savedReason?: string | null } = {};
		const normalizedTitle = normalizeOptionalText('title', title);
		const normalizedSavedReason = normalizeOptionalText('savedReason', savedReason);

		if (normalizedTitle !== undefined) {
			values.title = normalizedTitle;
		}

		if (normalizedSavedReason !== undefined) {
			values.savedReason = normalizedSavedReason;
		}

		if (Object.keys(values).length === 0) {
			throw new BadRequestException('수정할 값이 없습니다.');
		}

		const [link] = await this.db
			.update(links)
			.set(values)
			.where(and(eq(links.id, linkId), eq(links.userId, userId), isNull(links.deletedAt)))
			.returning();

		if (!link) {
			throw new NotFoundException();
		}

		return link;
	}

	/**
	 * 링크별 알림 시각을 지정하거나 해제한다. 매분 도는 크론이 이 시각에 켜진 채널(카카오, 웹 푸시)로 보낸다.
	 * @param userId string
	 * @param linkId string
	 * @param remindAt unknown ISO 문자열(지금보다 미래)이면 지정, null이면 해제
	 * @returns Link
	 * @throws BadRequestException remindAt이 null도 날짜 문자열도 아니거나, 지금 이전 시각인 경우
	 * @throws NotFoundException 링크가 없거나 삭제됐거나 내 링크가 아닌 경우
	 */
	async setRemindAt({
		userId,
		linkId,
		remindAt,
	}: {
		userId: string;
		linkId: string;
		remindAt: unknown;
	}): Promise<Link> {
		const date = typeof remindAt === 'string' ? new Date(remindAt) : null;

		if (remindAt !== null && (!date || Number.isNaN(date.getTime()))) {
			throw new BadRequestException('remindAt은 날짜 문자열 또는 null이어야 합니다.');
		}
		if (date && date.getTime() <= Date.now()) {
			throw new BadRequestException('알림 시각은 지금 이후여야 합니다.');
		}

		const [link] = await this.db
			.update(links)
			.set({ remindAt: date })
			.where(and(eq(links.id, linkId), eq(links.userId, userId), isNull(links.deletedAt)))
			.returning();

		if (!link) {
			throw new NotFoundException();
		}

		return link;
	}

	/**
	 * 카카오 알림의 [링크 바로가기] 버튼이 거쳐 가는 원래 URL을 찾는다. 로그인 없이 부르므로 id만으로 찾는다.
	 * @param linkId string
	 * @returns string 원래 URL
	 * @throws NotFoundException 링크가 없거나 삭제된 경우
	 */
	async getLinkUrl(linkId: string): Promise<string> {
		const [link] = await this.db
			.select({ url: links.url })
			.from(links)
			.where(and(eq(links.id, linkId), isNull(links.deletedAt)));

		if (!link) {
			throw new NotFoundException();
		}

		return link.url;
	}

	/**
	 * 링크를 폴더 상단에 고정하거나 고정을 해제한다. 고정 시각을 pinnedAt에 기록하고, 해제하면 null로 둔다.
	 * @param userId string
	 * @param linkId string
	 * @param pinned unknown true면 고정, false면 해제
	 * @returns Link
	 * @throws BadRequestException pinned가 boolean이 아닌 경우
	 * @throws NotFoundException 링크가 없거나 삭제됐거나 내 링크가 아닌 경우
	 */
	async pinLink({ userId, linkId, pinned }: { userId: string; linkId: string; pinned: unknown }): Promise<Link> {
		if (typeof pinned !== 'boolean') {
			throw new BadRequestException('pinned는 true 또는 false여야 합니다.');
		}

		const [link] = await this.db
			.update(links)
			.set({ pinnedAt: pinned ? new Date() : null })
			.where(and(eq(links.id, linkId), eq(links.userId, userId), isNull(links.deletedAt)))
			.returning();

		if (!link) {
			throw new NotFoundException();
		}

		return link;
	}

	/**
	 * 링크를 다른 폴더로 옮긴다. 상단 고정은 원래 폴더 기준이라 함께 해제된다.
	 * @param userId string
	 * @param linkId string
	 * @param folderId string 옮겨갈 폴더, 내 폴더이고 삭제되지 않아야 함
	 * @returns Link
	 * @throws BadRequestException folderId가 없는 경우
	 * @throws NotFoundException 링크가 없거나 삭제됐거나 내 링크가 아닌 경우, 폴더가 없거나 삭제됐거나 내 폴더가 아닌 경우
	 */
	async moveLink({ userId, linkId, folderId }: { userId: string; linkId: string; folderId: string }): Promise<Link> {
		if (!folderId) {
			throw new BadRequestException('folderId는 필수입니다.');
		}

		return await this.db.transaction(async (tx) => {
			await lockUserFolders(tx, userId);

			const [folder] = await tx
				.select()
				.from(folders)
				.where(and(eq(folders.id, folderId), eq(folders.userId, userId), isNull(folders.deletedAt)));

			if (!folder) {
				throw new NotFoundException();
			}

			const [link] = await tx
				.update(links)
				.set({ folderId, pinnedAt: null })
				.where(and(eq(links.id, linkId), eq(links.userId, userId), isNull(links.deletedAt)))
				.returning();

			if (!link) {
				throw new NotFoundException();
			}

			return link;
		});
	}

	/**
	 * 링크를 소프트 삭제한다.
	 * @param userId string
	 * @param linkId string
	 * @throws NotFoundException 링크가 없거나 내 링크가 아닌 경우
	 */
	async deleteLink({ userId, linkId }: { userId: string; linkId: string }): Promise<void> {
		const [link] = await this.db
			.select()
			.from(links)
			.where(and(eq(links.id, linkId), eq(links.userId, userId)));

		if (!link) {
			throw new NotFoundException();
		}

		await this.db.update(links).set({ deletedAt: new Date() }).where(eq(links.id, linkId));
	}

	/**
	 * OG 태그를 비동기로 가져와 title/thumbnailUrl을 채운다. 등록 응답을 막지 않도록 await 없이 호출됨.
	 * 그 사이 사용자가 제목을 직접 고쳤을 수 있어서 title은 아직 비어 있을 때만 채운다.
	 * @param linkId string
	 * @param url string
	 */
	private async applyOgTags(linkId: string, url: string): Promise<void> {
		const { title, thumbnailUrl } = await fetchOgTags(url);

		if (title === null && thumbnailUrl === null) {
			return;
		}

		await this.db
			.update(links)
			.set({ title: sql`coalesce(${links.title}, ${title})`, thumbnailUrl })
			.where(eq(links.id, linkId));
	}
}
