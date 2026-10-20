import { describe, expect, test } from 'vitest';

import { sortLinks } from '@/entities/link/model/sort-links';
import { Link } from '@/entities/link/model/types';

function link(overrides: Partial<Link> & Pick<Link, 'id'>): Link {
	return {
		userId: 'u',
		folderId: 'f1',
		url: 'https://example.com',
		title: null,
		thumbnailUrl: null,
		folderSource: 'user',
		shelfLifeDays: null,
		savedReason: null,
		status: 'unviewed',
		createdAt: '2026-10-01T00:00:00Z',
		lastRemindedAt: null,
		pinnedAt: null,
		deletedAt: null,
		...overrides,
	};
}

const pinnedOld = link({
	id: 'pinned-old',
	title: '가',
	pinnedAt: '2026-10-10T00:00:00Z',
	createdAt: '2026-09-01T00:00:00Z',
});
const pinnedNew = link({
	id: 'pinned-new',
	title: '하',
	pinnedAt: '2026-10-11T00:00:00Z',
	createdAt: '2026-09-02T00:00:00Z',
});
const old = link({ id: 'old', title: '나무', createdAt: '2026-10-01T00:00:00Z' });
const mid = link({ id: 'mid', title: null, url: 'https://apple.com/a', createdAt: '2026-10-02T00:00:00Z' });
const recent = link({ id: 'recent', title: '다람쥐', createdAt: '2026-10-03T00:00:00Z' });

const ids = (links: Link[]) => links.map((item) => item.id);

describe('sortLinks', () => {
	const input = [old, pinnedOld, recent, pinnedNew, mid];

	test('최신순: 고정 링크(나중에 고정한 순)가 먼저, 나머지는 최근 등록순', () => {
		expect(ids(sortLinks(input, 'newest'))).toEqual(['pinned-new', 'pinned-old', 'recent', 'mid', 'old']);
	});

	test('오래된순: 고정 링크는 그대로 맨 위, 나머지는 오래된 등록순', () => {
		expect(ids(sortLinks(input, 'oldest'))).toEqual(['pinned-new', 'pinned-old', 'old', 'mid', 'recent']);
	});

	test('이름순: 고정 링크는 그대로 맨 위, 나머지는 제목(없으면 호스트명) 가나다순이고 한글 다음 영문', () => {
		expect(ids(sortLinks(input, 'name'))).toEqual(['pinned-new', 'pinned-old', 'old', 'recent', 'mid']);
	});

	test('원본 배열은 바꾸지 않는다', () => {
		const copy = [...input];

		sortLinks(input, 'oldest');

		expect(input).toEqual(copy);
	});
});
