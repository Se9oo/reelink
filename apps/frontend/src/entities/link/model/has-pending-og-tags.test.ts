import { describe, expect, test } from 'vitest';

import { hasPendingOgTags } from '@/entities/link/model/has-pending-og-tags';
import { Link } from '@/entities/link/model/types';

const now = new Date('2026-10-20T12:00:00Z');

function link(overrides: Partial<Link>): Link {
	return {
		id: 'l1',
		userId: 'u',
		folderId: 'f1',
		url: 'https://react.dev',
		title: null,
		thumbnailUrl: null,
		folderSource: 'user',
		shelfLifeDays: null,
		savedReason: null,
		status: 'unviewed',
		createdAt: now.toISOString(),
		lastRemindedAt: null,
		pinnedAt: null,
		deletedAt: null,
		...overrides,
	};
}

function secondsAgo(seconds: number) {
	return new Date(now.getTime() - seconds * 1000).toISOString();
}

describe('hasPendingOgTags', () => {
	test('15초 안에 등록됐고 제목과 썸네일이 둘 다 비어 있는 링크가 있으면 true', () => {
		expect(hasPendingOgTags([link({ createdAt: secondsAgo(3) })], now)).toBe(true);
	});

	test('제목이나 썸네일 중 하나라도 채워졌으면 기다리지 않는다', () => {
		expect(hasPendingOgTags([link({ createdAt: secondsAgo(3), title: 'React' })], now)).toBe(false);
		expect(hasPendingOgTags([link({ createdAt: secondsAgo(3), thumbnailUrl: 'https://img' })], now)).toBe(false);
	});

	test('등록된 지 15초가 지났으면 비어 있어도 기다리지 않는다', () => {
		expect(hasPendingOgTags([link({ createdAt: secondsAgo(16) })], now)).toBe(false);
	});

	test('목록이 없거나 비어 있으면 false', () => {
		expect(hasPendingOgTags(undefined, now)).toBe(false);
		expect(hasPendingOgTags([], now)).toBe(false);
	});
});
