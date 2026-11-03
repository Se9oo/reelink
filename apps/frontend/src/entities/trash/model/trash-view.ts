import { TrashFolder, TrashLink } from '@/entities/trash/model/types';

export const RETENTION_DAYS = 30;
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

export type TrashItem =
	| { kind: 'folder'; id: string; daysLeft: number; folder: TrashFolder; children: TrashChildren }
	| { kind: 'link'; id: string; daysLeft: number; link: TrashLink };

interface TrashChildren {
	folders: TrashFolder[];
	links: TrashLink[];
}

/** 폴더·링크를 한 목록으로 합쳐 완전 삭제까지 남은 일수가 적은 순으로 정렬한다. */
export function buildTrashItems(folders: TrashFolder[], links: TrashLink[], now = new Date()): TrashItem[] {
	const items: TrashItem[] = [
		...folders.map((folder) => ({
			kind: 'folder' as const,
			id: folder.id,
			daysLeft: getDaysUntilPurge(folder.deletedAt ?? now.toISOString(), now),
			folder,
			children: getChildren(folder.id, folders, links),
		})),
		...links.map((link) => ({
			kind: 'link' as const,
			id: link.id,
			daysLeft: getDaysUntilPurge(link.deletedAt ?? now.toISOString(), now),
			link,
		})),
	];

	return items.sort((a, b) => a.daysLeft - b.daysLeft);
}

/** 특정 폴더의 직속 하위 폴더·링크(둘 다 삭제된 전체 목록 기준). */
export function getChildren(folderId: string, allFolders: TrashFolder[], allLinks: TrashLink[]): TrashChildren {
	return {
		folders: allFolders.filter((folder) => folder.parentFolderId === folderId),
		links: allLinks.filter((link) => link.folderId === folderId),
	};
}
