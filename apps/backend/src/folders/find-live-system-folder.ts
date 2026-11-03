import { and, eq, isNull } from 'drizzle-orm';

import { type DrizzleTx } from '../db/drizzle.module.js';
import { folders } from '../db/schema.js';

import { Folder } from './folders.types.js';

/**
 * 휴지통에 없는 시스템 폴더를 이름으로 찾는다.
 * @param userId string
 * @param name string 시스템 폴더 이름(예: "미분류")
 * @param tx DrizzleTx lockUserFolders를 잡은 트랜잭션
 * @returns Folder | undefined
 */
export async function findLiveSystemFolder(userId: string, name: string, tx: DrizzleTx): Promise<Folder | undefined> {
	const [folder] = await tx
		.select()
		.from(folders)
		.where(
			and(eq(folders.userId, userId), eq(folders.isSystem, true), eq(folders.name, name), isNull(folders.deletedAt)),
		);

	return folder;
}
