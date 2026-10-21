import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';

import { and, asc, count, desc, eq, gte, ilike, isNull, lt, or, type SQL, sql } from 'drizzle-orm';
import { type AnyPgColumn } from 'drizzle-orm/pg-core';

import { countGraphemes } from '../common/count-graphemes.js';
import { isValidHttpUrl } from '../common/is-valid-http-url.js';
import { DRIZZLE, type DrizzleDb } from '../db/drizzle.module.js';
import { folders, links } from '../db/schema.js';

import { fetchOgTags } from './fetch-og-tags.js';
import { HomeSummary, Link } from './links.types.js';

const MAX_TEXT_LENGTH = 500;
const REVISIT_AFTER_DAYS = 7;
const REVISIT_LIMIT = 20;
const HOME_PREVIEW_COUNT = 3;
const HOME_RECENT_LIMIT = 5;

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
	constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

	/**
	 * 웹에서 링크를 등록한다. OG 태그(제목·썸네일) 추출은 별도로 처리하고, 여기서는 null로 둔다.
	 * @param userId string
	 * @param url string http/https 형식이어야 함
	 * @param folderId string 등록할 폴더, 내 폴더여야 함
	 * @param savedReason unknown 생략 가능, 앞뒤 공백을 지우고 비어 있으면 null로 저장
	 * @returns Link
	 * @throws BadRequestException folderId가 없거나 url이 http/https 형식이 아닌 경우, 저장 이유가 문자열이 아니거나 500자를 넘는 경우
	 * @throws NotFoundException folderId가 내 폴더가 아니거나 존재하지 않는 경우
	 */
	async createLink({ userId, url, folderId, savedReason }: CreateLinkParams): Promise<Link> {
		if (!folderId) {
			throw new BadRequestException('folderId는 필수입니다.');
		}

		if (!isValidHttpUrl(url)) {
			throw new BadRequestException('http/https 형식의 URL만 등록할 수 있습니다.');
		}

		const normalizedSavedReason = normalizeOptionalText('savedReason', savedReason);

		const [folder] = await this.db
			.select()
			.from(folders)
			.where(and(eq(folders.id, folderId), eq(folders.userId, userId)));

		if (!folder) {
			throw new NotFoundException();
		}

		const [link] = await this.db
			.insert(links)
			.values({ userId, folderId, url, savedReason: normalizedSavedReason })
			.returning();

		void this.applyOgTags(link.id, url);

		return link;
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
	 * 이번 주·저번 주 기록(월요일 0시 KST 기준), 최근 저장 5개, 그때 저장한 링크(한 달 전·석 달 전)를 돌려준다.
	 * @param userId string
	 * @returns HomeSummary
	 */
	async getHome({ userId }: { userId: string }): Promise<HomeSummary> {
		const mine = and(eq(links.userId, userId), isNull(links.deletedAt));
		const thisWeekStart = sql`date_trunc('week', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul'`;
		const lastWeekStart = sql`${thisWeekStart} - interval '7 days'`;

		const countIn = (column: AnyPgColumn, from: SQL, to?: SQL) =>
			this.db
				.select({ value: count() })
				.from(links)
				.where(and(eq(links.userId, userId), gte(column, from), to ? lt(column, to) : undefined))
				.then(([row]) => row.value);

		const [feed, saved, viewed, cleaned, viewedLastWeek, recent, oneMonth, threeMonths] = await Promise.all([
			this.getFeed({ userId }),
			countIn(links.createdAt, thisWeekStart).then((value) => value),
			countIn(links.viewedAt, thisWeekStart),
			countIn(links.deletedAt, thisWeekStart),
			countIn(links.viewedAt, lastWeekStart, thisWeekStart),
			this.db.select().from(links).where(mine).orderBy(desc(links.createdAt)).limit(HOME_RECENT_LIMIT),
			this.findThrowback(userId, 30, 3),
			this.findThrowback(userId, 90, 7),
		]);

		const throwbacks = [
			...(oneMonth ? [{ label: 'oneMonth' as const, link: oneMonth }] : []),
			...(threeMonths ? [{ label: 'threeMonths' as const, link: threeMonths }] : []),
		];

		return {
			remind: {
				unviewedCount: feed.unviewed.length,
				revisitCount: feed.revisit.length,
				oldestUnviewed: feed.unviewed[0] ?? null,
				previews: [...feed.unviewed, ...feed.revisit].slice(0, HOME_PREVIEW_COUNT),
			},
			week: { saved, viewed, cleaned, viewedLastWeek },
			recent,
			throwbacks,
		};
	}

	/**
	 * 오늘 기준 정확히 daysAgo일 전에서 ±toleranceDays일 안에 저장한 링크 중 그 날짜에 가장 가까운 1개를 찾는다.
	 * @param userId string
	 * @param daysAgo number
	 * @param toleranceDays number
	 * @returns Link | null
	 */
	private async findThrowback(userId: string, daysAgo: number, toleranceDays: number): Promise<Link | null> {
		const target = sql`now() - interval '${sql.raw(String(daysAgo))} days'`;
		const tolerance = sql`interval '${sql.raw(String(toleranceDays))} days'`;

		const [link] = await this.db
			.select()
			.from(links)
			.where(
				and(
					eq(links.userId, userId),
					isNull(links.deletedAt),
					gte(links.createdAt, sql`${target} - ${tolerance}`),
					lt(links.createdAt, sql`${target} + ${tolerance}`),
				),
			)
			.orderBy(sql`abs(extract(epoch from (${links.createdAt} - ${target})))`)
			.limit(1);

		return link ?? null;
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

		const [folder] = await this.db
			.select()
			.from(folders)
			.where(and(eq(folders.id, folderId), eq(folders.userId, userId), isNull(folders.deletedAt)));

		if (!folder) {
			throw new NotFoundException();
		}

		const [link] = await this.db
			.update(links)
			.set({ folderId, pinnedAt: null })
			.where(and(eq(links.id, linkId), eq(links.userId, userId), isNull(links.deletedAt)))
			.returning();

		if (!link) {
			throw new NotFoundException();
		}

		return link;
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
