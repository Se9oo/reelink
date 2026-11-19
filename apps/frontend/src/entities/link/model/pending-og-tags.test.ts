import { describe, expect, test } from 'vitest';

import { collectLinksWithoutOgTags, selectPendingIds } from '@/entities/link/model/pending-og-tags';

const now = new Date('2026-10-20T12:00:15Z');

describe('collectLinksWithoutOgTags', () => {
	test('홈 요약처럼 중첩된 데이터에서 제목과 썸네일이 모두 없는 링크만 모은다', () => {
		const home = {
			remind: { unviewedCount: 1, previews: [{ id: 't', title: '제목', thumbnailUrl: null, createdAt: 'x' }] },
			stale: [{ id: 'i', title: null, thumbnailUrl: 'https://img.example.com/a.png', createdAt: 'x' }],
			recent: [{ id: 'n', title: null, thumbnailUrl: null, createdAt: '2026-10-20T12:00:10Z' }],
		};

		expect(collectLinksWithoutOgTags(home)).toEqual([{ id: 'n', createdAt: '2026-10-20T12:00:10Z' }]);
	});
});

describe('selectPendingIds', () => {
	test('등록 후 15초가 지난 링크는 기다리지 않는다', () => {
		const entries = [
			{ id: 'recent', createdAt: '2026-10-20T12:00:01Z' },
			{ id: 'expired', createdAt: '2026-10-20T12:00:00Z' },
		];

		expect(selectPendingIds(entries, now)).toEqual(['recent']);
	});

	test('같은 링크가 여러 캐시에 있어도 한 번만 고른다', () => {
		const entries = [
			{ id: 'a', createdAt: '2026-10-20T12:00:10Z' },
			{ id: 'a', createdAt: '2026-10-20T12:00:10Z' },
		];

		expect(selectPendingIds(entries, now)).toEqual(['a']);
	});

	test('20개를 넘으면 앞 20개만 고른다', () => {
		const entries = Array.from({ length: 25 }, (_, index) => ({
			id: `id-${String(index).padStart(2, '0')}`,
			createdAt: '2026-10-20T12:00:10Z',
		}));

		expect(selectPendingIds(entries, now)).toEqual(entries.slice(0, 20).map((entry) => entry.id));
	});
});
