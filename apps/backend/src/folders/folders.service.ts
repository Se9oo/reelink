import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE, type DrizzleDb } from '../db/drizzle.module.js';
import { Folder } from './folders.types.js';
import { folders } from '../db/schema.js';
import { and, eq, isNull } from 'drizzle-orm';

@Injectable()
export class FoldersService {
	constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

	/**
	 *
	 * @param userId string;
	 * @param name string;
	 * @returns Folder
	 */
	async createFolder({
		userId,
		name,
		parentFolderId,
	}: {
		userId: string;
		name: string;
		parentFolderId?: string | null;
	}): Promise<Folder> {
		const siblings = await this.db
			.select()
			.from(folders)
			.where(
				and(
					eq(folders.userId, userId),
					parentFolderId ? eq(folders.parentFolderId, parentFolderId) : isNull(folders.parentFolderId),
				),
			);

		const sortOrder = siblings.length === 0 ? 0 : Math.max(...siblings.map((f) => f.sortOrder)) + 1;

		const [folder] = await this.db
			.insert(folders)
			.values({
				userId,
				name,
				parentFolderId,
				sortOrder,
			})
			.returning();

		return folder;
	}
}
