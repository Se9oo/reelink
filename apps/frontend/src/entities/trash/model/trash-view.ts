import { TrashFolder, TrashLink } from '@/entities/trash/model/types';

const RETENTION_DAYS = 30;
const URGENT_THRESHOLD_DAYS = 3;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** deletedAt 기준 완전 삭제까지 남은 일수. 30일이 지났어도 음수는 반환하지 않는다. */
export function getDaysUntilPurge(deletedAt: string, now = new Date()): number {
	const elapsedDays = Math.floor((now.getTime() - new Date(deletedAt).getTime()) / MS_PER_DAY);

	return Math.max(0, RETENTION_DAYS - elapsedDays);
}

export function isUrgent(daysLeft: number): boolean {
	return daysLeft <= URGENT_THRESHOLD_DAYS;
}

/** 펼치기 미리보기용 — 특정 폴더의 직속 하위 폴더·링크 개수(둘 다 삭제된 전체 목록 기준). */
export function getChildSummary(
	folderId: string,
	allFolders: TrashFolder[],
	allLinks: TrashLink[],
): { subfolderCount: number; linkCount: number } {
	return {
		subfolderCount: allFolders.filter((folder) => folder.parentFolderId === folderId).length,
		linkCount: allLinks.filter((link) => link.folderId === folderId).length,
	};
}
