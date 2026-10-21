import { describe, expect, test } from 'vitest';

import { mergeFeed } from '@/widgets/remind-feed/model/merge-feed';

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
		viewedAt: null,
		deletedAt: null,
		...overrides,
	};
}

describe('mergeFeed', () => {
	test('화면에 있는 카드는 순서를 지키면서 서버의 최신 내용으로 바꾼다', () => {
		const local = { unviewed: [link({ id: 'a' }), link({ id: 'b' })], revisit: [] };
		const server = { unviewed: [link({ id: 'b', title: 'B 제목' }), link({ id: 'a', title: 'A 제목' })], revisit: [] };

		expect(mergeFeed(local, server).unviewed.map((item) => [item.id, item.title])).toEqual([
			['a', 'A 제목'],
			['b', 'B 제목'],
		]);
	});

	test('서버에 새로 생긴 안 본 링크는 뒤에 붙인다', () => {
		const local = { unviewed: [link({ id: 'a' })], revisit: [] };
		const server = { unviewed: [link({ id: 'a' }), link({ id: 'new' })], revisit: [] };

		expect(mergeFeed(local, server).unviewed.map((item) => item.id)).toEqual(['a', 'new']);
	});

	test('서버 목록에서 빠진 카드(방금 본 카드)도 화면에서는 그대로 남긴다', () => {
		const local = { unviewed: [link({ id: 'viewed' }), link({ id: 'b' })], revisit: [link({ id: 'r' })] };
		const server = { unviewed: [link({ id: 'b' })], revisit: [] };

		const merged = mergeFeed(local, server);

		expect(merged.unviewed.map((item) => item.id)).toEqual(['viewed', 'b']);
		expect(merged.revisit.map((item) => item.id)).toEqual(['r']);
	});

	test('화면에서 지운 카드는 서버 응답에 아직 남아 있어도 되살리지 않는다', () => {
		const local = { unviewed: [link({ id: 'a' })], revisit: [] };
		const server = { unviewed: [link({ id: 'a' }), link({ id: 'removed' }), link({ id: 'new' })], revisit: [] };

		expect(mergeFeed(local, server, new Set(['removed'])).unviewed.map((item) => item.id)).toEqual(['a', 'new']);
	});
});
