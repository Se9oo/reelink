import { describe, expect, test } from 'vitest';

import { getChildSummary, getDaysUntilPurge, isUrgent } from '@/entities/trash/model/trash-view';
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

describe('getChildSummary', () => {
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
			deletedAt: '2026-10-16T00:00:00Z',
			parentFolderName: null,
			...overrides,
		};
	}

	test('하위 폴더와 링크가 모두 있으면 둘 다 센다', () => {
		const folders = [trashFolder({ id: 'parent' }), trashFolder({ id: 'child', parentFolderId: 'parent' })];
		const links = [trashLink({ id: 'l1', folderId: 'parent' }), trashLink({ id: 'l2', folderId: 'parent' })];

		expect(getChildSummary('parent', folders, links)).toEqual({ subfolderCount: 1, linkCount: 2 });
	});

	test('하위 항목이 없으면 0, 0을 반환한다', () => {
		const folders = [trashFolder({ id: 'lonely' })];

		expect(getChildSummary('lonely', folders, [])).toEqual({ subfolderCount: 0, linkCount: 0 });
	});

	test('다른 폴더의 하위 항목은 세지 않는다', () => {
		const folders = [
			trashFolder({ id: 'a' }),
			trashFolder({ id: 'b' }),
			trashFolder({ id: 'a-child', parentFolderId: 'a' }),
		];
		const links = [trashLink({ id: 'l1', folderId: 'b' })];

		expect(getChildSummary('a', folders, links)).toEqual({ subfolderCount: 1, linkCount: 0 });
	});
});
