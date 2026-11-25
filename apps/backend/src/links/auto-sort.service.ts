import {
	BadRequestException,
	HttpException,
	HttpStatus,
	Inject,
	Injectable,
	NotFoundException,
	ServiceUnavailableException,
} from '@nestjs/common';

import { and, asc, eq, isNotNull, isNull, sql } from 'drizzle-orm';

import { DRIZZLE, type DrizzleDb } from '../db/drizzle.module.js';
import { folders, links } from '../db/schema.js';
import { REDIS, type RedisClient } from '../redis/redis.module.js';

import { type ClassifyFolder, classifyLinks, ClassifyLinksError } from './classify-links.js';

export const AUTO_SORT_DAILY_LIMIT = 50;
const QUOTA_TTL_SECONDS = 86_400;
const SAMPLE_TITLES_PER_FOLDER = 3;

export interface AutoSortResult {
	suggestions: { linkId: string; folderId: string | null }[];
	remaining: number;
	skipped: number;
}

function quotaKey(userId: string): string {
	const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date()).replaceAll('-', '');

	return `aisort:${userId}:${today}`;
}

@Injectable()
export class AutoSortService {
	constructor(
		@Inject(DRIZZLE) private readonly db: DrizzleDb,
		@Inject(REDIS) private readonly redis: RedisClient,
	) {}

	/**
	 * 오늘(KST) 폴더 자동 배치로 더 보낼 수 있는 링크 수를 돌려준다.
	 * @param userId string
	 * @returns number
	 * @throws ServiceUnavailableException Redis가 실패한 경우
	 */
	async getRemaining(userId: string): Promise<number> {
		try {
			const used = Number(await this.redis.get(quotaKey(userId))) || 0;

			return Math.max(0, AUTO_SORT_DAILY_LIMIT - used);
		} catch {
			throw new ServiceUnavailableException('잠시 후 다시 시도해주세요.');
		}
	}

	/**
	 * 시스템 폴더의 링크를 오래된 순으로 남은 한도만큼 AI에 보내 폴더를 추천받는다. 링크는 옮기지 않는다.
	 * @param userId string
	 * @param folderId string 내 시스템 폴더("카카오톡으로 등록", "미분류")
	 * @returns AutoSortResult
	 * @throws NotFoundException 폴더가 없거나 삭제됐거나 내 폴더가 아닌 경우
	 * @throws BadRequestException 시스템 폴더가 아닌 경우
	 * @throws HttpException 429 오늘 한도를 다 쓴 경우
	 * @throws ServiceUnavailableException Redis로 한도를 확인할 수 없거나 AI 호출이 실패한 경우(차감한 한도는 되돌림)
	 */
	async suggest({ userId, folderId }: { userId: string; folderId: string }): Promise<AutoSortResult> {
		const [folder] = await this.db
			.select()
			.from(folders)
			.where(and(eq(folders.id, folderId), eq(folders.userId, userId), isNull(folders.deletedAt)));

		if (!folder) {
			throw new NotFoundException();
		}

		if (!folder.isSystem) {
			throw new BadRequestException('시스템 폴더에서만 자동 배치할 수 있습니다.');
		}

		const targets = await this.db
			.select()
			.from(links)
			.where(and(eq(links.folderId, folderId), eq(links.userId, userId), isNull(links.deletedAt)))
			.orderBy(asc(links.createdAt));
		const candidates = await this.findCandidateFolders(userId);

		if (targets.length === 0 || candidates.length === 0) {
			return {
				suggestions: targets.map(({ id }) => ({ linkId: id, folderId: null })),
				remaining: await this.getRemaining(userId),
				skipped: 0,
			};
		}

		const key = quotaKey(userId);
		const allowed = await this.reserveQuota(key, targets.length);

		if (allowed === 0) {
			throw new HttpException('오늘 자동 배치 한도를 다 썼습니다.', HttpStatus.TOO_MANY_REQUESTS);
		}

		const sent = targets.slice(0, allowed);
		let suggestions: Map<string, string | null>;

		try {
			suggestions = await classifyLinks(candidates, sent);
		} catch (error) {
			if (error instanceof ClassifyLinksError) {
				await this.redis.decrby(key, allowed).catch(() => undefined);

				throw new ServiceUnavailableException('잠시 후 다시 시도해주세요.');
			}

			throw error;
		}

		return {
			suggestions: sent.map(({ id }) => ({ linkId: id, folderId: suggestions.get(id) ?? null })),
			remaining: await this.getRemaining(userId),
			skipped: targets.length - allowed,
		};
	}

	/**
	 * 보낼 개수만큼 먼저 차감하고 한도를 넘는 만큼 되돌려서, 동시에 들어온 요청이 합쳐서 한도를 넘지 않게 한다.
	 * 유료 API라 한도를 확인할 수 없으면 보내지 않는다.
	 * @param key string `aisort:<userId>:<YYYYMMDD>`
	 * @param wanted number 보내려는 링크 수
	 * @returns number 실제로 보낼 수 있는 링크 수
	 * @throws ServiceUnavailableException Redis가 실패한 경우
	 */
	private async reserveQuota(key: string, wanted: number): Promise<number> {
		try {
			await this.redis.set(key, 0, 'EX', QUOTA_TTL_SECONDS, 'NX');
			const after = await this.redis.incrby(key, wanted);
			const allowed = Math.min(wanted, Math.max(0, AUTO_SORT_DAILY_LIMIT - (after - wanted)));

			if (allowed < wanted) {
				await this.redis.decrby(key, wanted - allowed);
			}

			return allowed;
		} catch {
			throw new ServiceUnavailableException('잠시 후 다시 시도해주세요.');
		}
	}

	/**
	 * 자동 배치 후보 폴더(삭제되지 않은 일반 폴더)를 `상위/하위` 경로와 최근 링크 제목 3개와 함께 찾는다.
	 * @param userId string
	 * @returns ClassifyFolder[]
	 */
	private async findCandidateFolders(userId: string): Promise<ClassifyFolder[]> {
		const liveFolders = await this.db
			.select()
			.from(folders)
			.where(and(eq(folders.userId, userId), isNull(folders.deletedAt)))
			.orderBy(asc(folders.sortOrder));
		const folderById = new Map(liveFolders.map((folder) => [folder.id, folder]));

		const ranked = this.db
			.select({
				folderId: links.folderId,
				title: links.title,
				rank: sql<number>`row_number() over (partition by ${links.folderId} order by ${links.createdAt} desc)`.as(
					'rank',
				),
			})
			.from(links)
			.where(and(eq(links.userId, userId), isNull(links.deletedAt), isNotNull(links.title)))
			.as('ranked');
		const samples = await this.db
			.select({ folderId: ranked.folderId, title: ranked.title })
			.from(ranked)
			.where(sql`${ranked.rank} <= ${SAMPLE_TITLES_PER_FOLDER}`);

		const titlesByFolder = new Map<string, string[]>();

		for (const { folderId, title } of samples) {
			if (title) {
				titlesByFolder.set(folderId, [...(titlesByFolder.get(folderId) ?? []), title]);
			}
		}

		return liveFolders
			.filter(({ isSystem }) => !isSystem)
			.map((folder) => {
				const names: string[] = [];
				let current: typeof folder | undefined = folder;

				while (current && names.length <= liveFolders.length) {
					names.unshift(current.name);
					current = current.parentFolderId ? folderById.get(current.parentFolderId) : undefined;
				}

				return { id: folder.id, path: names.join('/'), sampleTitles: titlesByFolder.get(folder.id) ?? [] };
			});
	}
}
