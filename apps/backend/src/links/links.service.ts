import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';

import { and, eq } from 'drizzle-orm';

import { isValidHttpUrl } from '../common/is-valid-http-url.js';
import { DRIZZLE, type DrizzleDb } from '../db/drizzle.module.js';
import { folders, links } from '../db/schema.js';

import { Link } from './links.types.js';

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

		return link;
	}
}
