import { sql } from 'drizzle-orm';

import { type DrizzleTx } from '../db/drizzle.module.js';

/**
 * 같은 사용자의 폴더 트리 변경(폴더 생성·이동·삭제·복구, 링크 등록·이동·복구)을 한 줄로 세우는 advisory lock. 트랜잭션이 끝나면 풀린다.
 * @param tx DrizzleTx
 * @param userId string
 */
export async function lockUserFolders(tx: DrizzleTx, userId: string): Promise<void> {
	await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('folder_tree'), hashtext(${userId}))`);
}
