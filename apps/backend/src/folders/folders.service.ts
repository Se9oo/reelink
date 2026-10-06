import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';

import { and, eq, inArray, isNull, sql } from 'drizzle-orm';

import { DRIZZLE, type DrizzleDb } from '../db/drizzle.module.js';
import { folders, links } from '../db/schema.js';

import { Folder } from './folders.types.js';

interface CreateFolderParams {
	userId: string;
	name: string;
	parentFolderId?: string | null;
}

interface UpdateFolderParams {
	userId: string;
	folderId: string;
	name?: string;
	parentFolderId?: string | null;
}

@Injectable()
export class FoldersService {
	constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

	/**
	 * 같은 userId + parentFolderId를 가진 형제 폴더들 사이의 다음 sortOrder(현재 최댓값+1).
	 * @param userId string
	 * @param parentFolderId string | null 최상위 폴더면 null
	 * @returns number
	 */
	private async nextSortOrder(userId: string, parentFolderId: string | null): Promise<number> {
		const siblings = await this.db
			.select()
			.from(folders)
			.where(
				and(
					eq(folders.userId, userId),
					parentFolderId ? eq(folders.parentFolderId, parentFolderId) : isNull(folders.parentFolderId),
				),
			);

		return siblings.length === 0 ? 0 : Math.max(...siblings.map((f) => f.sortOrder)) + 1;
	}

	/**
	 * 새 폴더를 생성한다. 같은 parentFolderId를 가진 형제 폴더 중 가장 뒤(sortOrder 최댓값+1)에 추가된다.
	 * @param userId string
	 * @param name string
	 * @param parentFolderId string | null | undefined 생략하거나 null이면 최상위 폴더로 생성
	 * @returns Folder
	 */
	async createFolder({ userId, name, parentFolderId }: CreateFolderParams): Promise<Folder> {
		const sortOrder = await this.nextSortOrder(userId, parentFolderId ?? null);

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

	/**
	 * 내 폴더 전체를 flat 배열로 조회한다. 소프트 삭제(deletedAt)된 폴더는 제외된다.
	 * @param userId string
	 * @returns Folder[]
	 */
	async getMyFolders({ userId }: { userId: string }): Promise<Folder[]> {
		const myFolders = await this.db
			.select()
			.from(folders)
			.where(and(eq(folders.userId, userId), isNull(folders.deletedAt)));

		return myFolders;
	}

	/**
	 * 폴더 이름 변경 및/또는 다른 부모 폴더로 이동.
	 * @param userId string
	 * @param folderId string
	 * @param name string 생략하면 이름은 그대로 둠
	 * @param parentFolderId string 생략하면 부모는 그대로 둠, null이면 최상위로 이동
	 * @returns Folder
	 * @throws NotFoundException 폴더가 없거나 내 폴더가 아닌 경우, 새 부모가 없거나 내 폴더가 아닌 경우
	 * @throws ForbiddenException 시스템 폴더(isSystem)인 경우
	 * @throws BadRequestException 새 부모가 자기 자신이거나 자기 하위 폴더인 경우(순환 방지)
	 */
	async updateFolder({ userId, folderId, name, parentFolderId }: UpdateFolderParams): Promise<Folder> {
		const [folder] = await this.db
			.select()
			.from(folders)
			.where(and(eq(folders.id, folderId), eq(folders.userId, userId)));

		if (!folder) {
			throw new NotFoundException();
		}

		if (folder.isSystem) {
			throw new ForbiddenException();
		}

		const updates: { name?: string; parentFolderId?: string | null; sortOrder?: number } = {};

		if (name !== undefined) {
			updates.name = name;
		}

		if (parentFolderId !== undefined) {
			if (parentFolderId !== null) {
				await this.assertValidNewParent(userId, folderId, parentFolderId);
			}
			updates.parentFolderId = parentFolderId;
			updates.sortOrder = await this.nextSortOrder(userId, parentFolderId);
		}

		const [updatedFolder] = await this.db
			.update(folders)
			.set(updates)
			.where(and(eq(folders.id, folderId), eq(folders.userId, userId)))
			.returning();

		return updatedFolder;
	}

	/**
	 * 폴더를 소프트 삭제한다. 하위 폴더와 그 안의 링크까지 recursive CTE로 전체 자손 id를 한 번에 구해서 cascade 삭제한다.
	 * @param userId string
	 * @param folderId string
	 * @throws NotFoundException 폴더가 없거나 내 폴더가 아닌 경우
	 */
	async deleteFolder({ userId, folderId }: { userId: string; folderId: string }): Promise<void> {
		const [folder] = await this.db
			.select()
			.from(folders)
			.where(and(eq(folders.id, folderId), eq(folders.userId, userId)));

		if (!folder) {
			throw new NotFoundException();
		}

		await this.db.transaction(async (tx) => {
			// WITH RECURSIVE: folderId 자신(앵커)에서 시작해, parent_folder_id로 연결된 자손을
			// 더 이상 안 나올 때까지 반복해서 모음 — DB 안에서 트리 전체를 한 번의 쿼리로 탐색
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

			// 이미 소프트 삭제된 폴더/링크는 deletedAt을 다시 덮어쓰지 않음 — 안 그러면 휴지통 30일
			// 자동 영구삭제 카운트다운이 의도치 않게 지금 시점으로 리셋됨
			await tx
				.update(folders)
				.set({ deletedAt: new Date() })
				.where(and(inArray(folders.id, descendantIds), isNull(folders.deletedAt)));
			await tx
				.update(links)
				.set({ deletedAt: new Date() })
				.where(and(inArray(links.folderId, descendantIds), isNull(links.deletedAt)));
		});
	}

	/**
	 * 형제 폴더들의 순서를 재배열한다. 배열 순서대로 sortOrder 0, 1, 2, ...를 부여한다.
	 * @param userId string
	 * @param folderIds string[] 같은 parentFolderId를 가진 형제 폴더 전체의 id, 새 순서대로
	 * @returns Folder[] 변경된 폴더 배열 (요청한 순서대로)
	 * @throws NotFoundException 폴더가 없거나 내 폴더가 아닌 경우
	 * @throws BadRequestException 서로 다른 부모를 가진 폴더가 섞여 있거나, 형제 폴더 일부만 포함된 경우
	 */
	async reorderFolders({ userId, folderIds }: { userId: string; folderIds: string[] }): Promise<Folder[]> {
		const targetFolders = await this.db
			.select()
			.from(folders)
			.where(and(inArray(folders.id, folderIds), eq(folders.userId, userId)));

		if (targetFolders.length !== folderIds.length) {
			throw new NotFoundException();
		}

		const parentFolderId = targetFolders[0].parentFolderId;

		if (targetFolders.some((folder) => folder.parentFolderId !== parentFolderId)) {
			throw new BadRequestException('형제 폴더만 순서를 바꿀 수 있습니다.');
		}

		const siblings = await this.db
			.select()
			.from(folders)
			.where(
				and(
					eq(folders.userId, userId),
					parentFolderId ? eq(folders.parentFolderId, parentFolderId) : isNull(folders.parentFolderId),
				),
			);

		if (siblings.length !== folderIds.length) {
			throw new BadRequestException('형제 폴더 전체가 포함되어야 합니다.');
		}

		return await this.db.transaction(async (tx) => {
			const updated: Folder[] = [];

			for (const [index, folderId] of folderIds.entries()) {
				const [folder] = await tx.update(folders).set({ sortOrder: index }).where(eq(folders.id, folderId)).returning();

				updated.push(folder);
			}

			return updated;
		});
	}

	/**
	 * 새 부모가 실제로 존재하는 내 폴더인지, 그리고 이동 대상 폴더 자신이나 그 하위 폴더가 아닌지 확인한다.
	 * @param userId string
	 * @param folderId string 이동하려는 폴더 자신의 id
	 * @param newParentFolderId string 옮겨갈 새 부모 폴더의 id
	 * @throws NotFoundException 새 부모가 존재하지 않거나 내 폴더가 아닌 경우
	 * @throws BadRequestException 새 부모가 자기 자신이거나 자기 하위 폴더인 경우(순환 방지)
	 */
	private async assertValidNewParent(userId: string, folderId: string, newParentFolderId: string): Promise<void> {
		if (newParentFolderId === folderId) {
			throw new BadRequestException('폴더를 자기 자신 밑으로 이동할 수 없습니다.');
		}

		let current = newParentFolderId;
		while (true) {
			const [parent] = await this.db
				.select()
				.from(folders)
				.where(and(eq(folders.id, current), eq(folders.userId, userId)));

			if (!parent) {
				throw new NotFoundException();
			}

			if (!parent.parentFolderId) {
				return;
			}

			if (parent.parentFolderId === folderId) {
				throw new BadRequestException('폴더를 자기 하위 폴더 밑으로 이동할 수 없습니다.');
			}

			current = parent.parentFolderId;
		}
	}
}
