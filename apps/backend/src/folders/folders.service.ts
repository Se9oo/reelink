import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DRIZZLE, type DrizzleDb } from '../db/drizzle.module.js';
import { Folder } from './folders.types.js';
import { folders } from '../db/schema.js';
import { and, eq, isNull } from 'drizzle-orm';

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
