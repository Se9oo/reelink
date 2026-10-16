import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';

import { and, eq, gte, inArray, isNotNull, isNull, sql } from 'drizzle-orm';

import { DRIZZLE, type DrizzleDb } from '../db/drizzle.module.js';
import { folders, links } from '../db/schema.js';
import { FoldersService } from '../folders/folders.service.js';
import { Folder } from '../folders/folders.types.js';
import { Link } from '../links/links.types.js';

import { TrashResponse } from './trash.types.js';

@Injectable()
export class TrashService {
	constructor(
		@Inject(DRIZZLE) private readonly db: DrizzleDb,
		private readonly foldersService: FoldersService,
	) {}

	/**
	 * 삭제된 폴더·링크 전체를 반환한다. 부모(소속 폴더)도 같이 삭제된 경우에만 그 이름을 parentName/
	 * parentFolderName으로 채워서, 프론트에서 "OO 안에 있었음" 캡션을 붙일 수 있게 한다.
	 * @param userId string
	 * @returns TrashResponse
	 */
	async getTrash(userId: string): Promise<TrashResponse> {
		const [deletedFolders, deletedLinks] = await Promise.all([
			this.db
				.select()
				.from(folders)
				.where(and(eq(folders.userId, userId), isNotNull(folders.deletedAt))),
			this.db
				.select()
				.from(links)
				.where(and(eq(links.userId, userId), isNotNull(links.deletedAt))),
		]);

		const deletedFolderNameById = new Map(deletedFolders.map((folder) => [folder.id, folder.name]));

		return {
			folders: deletedFolders.map((folder) => ({
				...folder,
				parentName: folder.parentFolderId ? (deletedFolderNameById.get(folder.parentFolderId) ?? null) : null,
			})),
			links: deletedLinks.map((link) => ({
				...link,
				parentFolderName: deletedFolderNameById.get(link.folderId) ?? null,
			})),
		};
	}

	/**
	 * 삭제된 폴더/링크를 복구한다. 원래 부모(폴더)가 살아있으면 그대로, 죽어있으면 최상위(폴더)
	 * 또는 미분류 시스템 폴더(링크)로 옮겨서 복구한다.
	 * @param userId string
	 * @param type 'folder' | 'link'
	 * @param id string
	 * @throws BadRequestException type이 folder/link가 아닌 경우
	 * @throws NotFoundException 항목이 없거나 내 것이 아니거나 삭제된 상태가 아닌 경우
	 */
	async restoreItem({ userId, type, id }: { userId: string; type: string; id: string }): Promise<Folder | Link> {
		if (type === 'folder') {
			return await this.restoreFolder(userId, id);
		}

		if (type === 'link') {
			return await this.restoreLink(userId, id);
		}

		throw new BadRequestException('type은 folder 또는 link여야 합니다.');
	}

	/**
	 * 휴지통에 있는 폴더/링크를 영구 삭제한다. 폴더의 하위 폴더·링크는 FK onDelete cascade로 함께 지워진다.
	 * @param userId string
	 * @param type 'folder' | 'link'
	 * @param id string
	 * @throws BadRequestException type이 folder/link가 아닌 경우
	 * @throws NotFoundException 항목이 없거나 내 것이 아니거나 휴지통에 있는 상태가 아닌 경우
	 */
	async deleteItemPermanently({ userId, type, id }: { userId: string; type: string; id: string }): Promise<void> {
		if (type === 'folder') {
			const deleted = await this.db
				.delete(folders)
				.where(and(eq(folders.id, id), eq(folders.userId, userId), isNotNull(folders.deletedAt)))
				.returning({ id: folders.id });

			if (deleted.length === 0) {
				throw new NotFoundException();
			}

			return;
		}

		if (type === 'link') {
			const deleted = await this.db
				.delete(links)
				.where(and(eq(links.id, id), eq(links.userId, userId), isNotNull(links.deletedAt)))
				.returning({ id: links.id });

			if (deleted.length === 0) {
				throw new NotFoundException();
			}

			return;
		}

		throw new BadRequestException('type은 folder 또는 link여야 합니다.');
	}

	private async restoreFolder(userId: string, folderId: string): Promise<Folder> {
		const [folder] = await this.db
			.select()
			.from(folders)
			.where(and(eq(folders.id, folderId), eq(folders.userId, userId), isNotNull(folders.deletedAt)));

		if (!folder?.deletedAt) {
			throw new NotFoundException();
		}

		const { deletedAt } = folder;
		const parentAlive = folder.parentFolderId ? await this.isFolderAlive(userId, folder.parentFolderId) : false;
		const restoredParentFolderId = parentAlive ? folder.parentFolderId : null;
		const sortOrder = await this.foldersService.nextSortOrder(userId, restoredParentFolderId);

		return await this.db.transaction(async (tx) => {
			const [restored] = await tx
				.update(folders)
				.set({ deletedAt: null, parentFolderId: restoredParentFolderId, sortOrder })
				.where(eq(folders.id, folderId))
				.returning();

			const { rows: descendants } = await tx.execute<{ id: string }>(sql`
				WITH RECURSIVE descendant_folders AS (
					SELECT id FROM folders WHERE id = ${folderId}
					UNION ALL
					SELECT f.id FROM folders f
					INNER JOIN descendant_folders d ON f.parent_folder_id = d.id
				)
				SELECT id FROM descendant_folders
			`);
			const descendantIds = descendants.map((row) => row.id);

			// 삭제 시 이미 지워진 항목의 deletedAt은 덮어쓰지 않으므로, 부모 이후에 찍힌 것만 같이 삭제된 항목이다
			await tx
				.update(folders)
				.set({ deletedAt: null })
				.where(and(inArray(folders.id, descendantIds), gte(folders.deletedAt, deletedAt)));
			await tx
				.update(links)
				.set({ deletedAt: null })
				.where(and(inArray(links.folderId, descendantIds), gte(links.deletedAt, deletedAt)));

			return restored;
		});
	}

	private async restoreLink(userId: string, linkId: string): Promise<Link> {
		const [link] = await this.db
			.select()
			.from(links)
			.where(and(eq(links.id, linkId), eq(links.userId, userId), isNotNull(links.deletedAt)));

		if (!link) {
			throw new NotFoundException();
		}

		const folderAlive = await this.isFolderAlive(userId, link.folderId);
		const restoredFolderId = folderAlive
			? link.folderId
			: (await this.foldersService.getOrCreateUncategorizedFolder(userId)).id;

		const [restored] = await this.db
			.update(links)
			.set({ deletedAt: null, folderId: restoredFolderId })
			.where(eq(links.id, linkId))
			.returning();

		return restored;
	}

	private async isFolderAlive(userId: string, folderId: string): Promise<boolean> {
		const [folder] = await this.db
			.select()
			.from(folders)
			.where(and(eq(folders.id, folderId), eq(folders.userId, userId), isNull(folders.deletedAt)));

		return !!folder;
	}
}
