import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';

import { and, desc, eq, ilike, isNull, or, sql } from 'drizzle-orm';

import { isValidHttpUrl } from '../common/is-valid-http-url.js';
import { DRIZZLE, type DrizzleDb } from '../db/drizzle.module.js';
import { folders, links } from '../db/schema.js';

import { fetchOgTags } from './fetch-og-tags.js';
import { Link } from './links.types.js';

const MAX_TEXT_LENGTH = 500;

interface CreateLinkParams {
	userId: string;
	url: string;
	folderId: string;
	savedReason?: string;
}

@Injectable()
export class LinksService {
	constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

	/**
	 * 웹에서 링크를 등록한다. OG 태그(제목·썸네일) 추출은 별도로 처리하고, 여기서는 null로 둔다.
	 * @param userId string
	 * @param url string http/https 형식이어야 함
	 * @param folderId string 등록할 폴더, 내 폴더여야 함
	 * @param savedReason string 생략 가능
	 * @returns Link
	 * @throws BadRequestException folderId가 없거나 url이 http/https 형식이 아닌 경우
	 * @throws NotFoundException folderId가 내 폴더가 아니거나 존재하지 않는 경우
	 */
	async createLink({ userId, url, folderId, savedReason }: CreateLinkParams): Promise<Link> {
		if (!folderId) {
			throw new BadRequestException('folderId는 필수입니다.');
		}

		if (!isValidHttpUrl(url)) {
			throw new BadRequestException('http/https 형식의 URL만 등록할 수 있습니다.');
		}

		const [folder] = await this.db
			.select()
			.from(folders)
			.where(and(eq(folders.id, folderId), eq(folders.userId, userId)));

		if (!folder) {
			throw new NotFoundException();
		}

		const [link] = await this.db.insert(links).values({ userId, folderId, url, savedReason }).returning();

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

		for (const [key, value] of [
			['title', title],
			['savedReason', savedReason],
		] as const) {
			if (value === undefined) {
				continue;
			}

			if (value !== null && typeof value !== 'string') {
				throw new BadRequestException(`${key}는 문자열이어야 합니다.`);
			}

			const trimmed = value?.trim() || null;

			if (trimmed && trimmed.length > MAX_TEXT_LENGTH) {
				throw new BadRequestException(`${key}는 ${MAX_TEXT_LENGTH}자 이하여야 합니다.`);
			}

			values[key] = trimmed;
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
	 * 링크를 다른 폴더로 옮긴다.
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
			.set({ folderId })
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
