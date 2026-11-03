import { describe, expect, test } from 'vitest';

import { buildTrashItems, getChildren, getDaysUntilPurge, isUrgent } from '@/entities/trash/model/trash-view';
import { TrashFolder, TrashLink } from '@/entities/trash/model/types';

const NOW = new Date('2026-10-16T00:00:00Z');

describe('getDaysUntilPurge', () => {
	test('방금 삭제됐으면 30일이 남는다', () => {
		expect(getDaysUntilPurge('2026-10-16T00:00:00Z', NOW)).toBe(30);
	});

	test('15일 전에 삭제됐으면 15일이 남는다', () => {
		expect(getDaysUntilPurge('2026-10-01T00:00:00Z', NOW)).toBe(15);
	});

	test('29일 전에 삭제됐으면 1일이 남는다', () => {
		expect(getDaysUntilPurge('2026-09-17T00:00:00Z', NOW)).toBe(1);
	});

	test('30일이 넘게 지났어도 음수가 되지 않고 0을 반환한다', () => {
		expect(getDaysUntilPurge('2026-09-01T00:00:00Z', NOW)).toBe(0);
	});
});

describe('isUrgent', () => {
	test('3일 이하면 true다', () => {
		expect(isUrgent(3)).toBe(true);
		expect(isUrgent(0)).toBe(true);
	});

	test('4일 이상이면 false다', () => {
		expect(isUrgent(4)).toBe(false);
		expect(isUrgent(30)).toBe(false);
	});
});

function trashFolder(overrides: Partial<TrashFolder> & Pick<TrashFolder, 'id'>): TrashFolder {
	return {
		userId: 'user-1',
		name: overrides.id,
		parentFolderId: null,
		sortOrder: 0,
		isSystem: false,
		deletedAt: '2026-10-16T00:00:00Z',
		parentName: null,
		...overrides,
	};
}

function trashLink(overrides: Partial<TrashLink> & Pick<TrashLink, 'id' | 'folderId'>): TrashLink {
	return {
		userId: 'user-1',
		url: 'https://example.com',
		title: null,
		thumbnailUrl: null,
		folderSource: 'user',
		shelfLifeDays: null,
		savedReason: null,
		status: 'unviewed',
		createdAt: '2026-10-16T00:00:00Z',
		lastRemindedAt: null,
		pinnedAt: null,
		viewedAt: null,
		deletedAt: '2026-10-16T00:00:00Z',
		parentFolderName: null,
		...overrides,
	};
}

describe('getChildren', () => {
	test('하위 폴더와 링크가 모두 있으면 둘 다 담는다', () => {
		const folders = [trashFolder({ id: 'parent' }), trashFolder({ id: 'child', parentFolderId: 'parent' })];
		const links = [trashLink({ id: 'l1', folderId: 'parent' }), trashLink({ id: 'l2', folderId: 'parent' })];

		expect(getChildren('parent', folders, links)).toEqual({ folders: [folders[1]], links });
	});

	test('하위 항목이 없으면 빈 목록을 반환한다', () => {
		const folders = [trashFolder({ id: 'lonely' })];

		expect(getChildren('lonely', folders, [])).toEqual({ folders: [], links: [] });
	});

	test('다른 폴더의 하위 항목은 담지 않는다', () => {
		const folders = [
			trashFolder({ id: 'a' }),
			trashFolder({ id: 'b' }),
			trashFolder({ id: 'a-child', parentFolderId: 'a' }),
		];
		const links = [trashLink({ id: 'l1', folderId: 'b' })];

		expect(getChildren('a', folders, links)).toEqual({ folders: [folders[2]], links: [] });
	});
});

describe('buildTrashItems', () => {
	test('폴더와 링크를 한 목록으로 합쳐 완전 삭제가 가까운 순으로 정렬한다', () => {
		const folders = [trashFolder({ id: 'f-old', deletedAt: '2026-09-18T00:00:00Z' })];
		const links = [
			trashLink({ id: 'l-new', folderId: 'x', deletedAt: '2026-10-16T00:00:00Z' }),
			trashLink({ id: 'l-mid', folderId: 'x', deletedAt: '2026-10-01T00:00:00Z' }),
		];

		const items = buildTrashItems(folders, links, NOW);

		expect(items.map((item) => [item.kind, item.id, item.daysLeft])).toEqual([
			['folder', 'f-old', 2],
			['link', 'l-mid', 15],
			['link', 'l-new', 30],
		]);
	});

	test('폴더 항목에는 직속 하위 폴더·링크를 함께 담는다', () => {
		const folders = [trashFolder({ id: 'parent' }), trashFolder({ id: 'child', parentFolderId: 'parent' })];
		const links = [trashLink({ id: 'l1', folderId: 'parent' })];

		const parent = buildTrashItems(folders, links, NOW).find((item) => item.id === 'parent');

		expect(parent).toMatchObject({ kind: 'folder', children: { folders: [folders[1]], links } });
	});
});
