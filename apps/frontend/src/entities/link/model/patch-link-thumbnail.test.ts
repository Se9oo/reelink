import { describe, expect, test } from 'vitest';

import { patchLinkThumbnail } from '@/entities/link/model/patch-link-thumbnail';

const target = { id: 'l1', url: 'https://www.threads.com/a', thumbnailUrl: 'https://img.example.com/old.png' };
const other = { id: 'l2', url: 'https://example.com', thumbnailUrl: 'https://img.example.com/other.png' };

describe('patchLinkThumbnail', () => {
	test('링크 배열(폴더, 검색)에서 같은 id 링크의 썸네일만 바꾼다', () => {
		const result = patchLinkThumbnail([target, other], 'l1', 'https://img.example.com/new.png');

		expect(result).toEqual([{ ...target, thumbnailUrl: 'https://img.example.com/new.png' }, other]);
		expect(result[1]).toBe(other);
	});

	test('홈 요약처럼 중첩된 모양에서도 찾아 바꾼다', () => {
		const home = {
			remind: { unviewedCount: 1, revisitCount: 0, oldestUnviewed: target, previews: [target] },
			upcoming: [],
			stale: [other],
			recent: [target],
		};

		const result = patchLinkThumbnail(home, 'l1', 'https://img.example.com/new.png');

		expect(result.remind.oldestUnviewed?.thumbnailUrl).toBe('https://img.example.com/new.png');
		expect(result.remind.previews[0].thumbnailUrl).toBe('https://img.example.com/new.png');
		expect(result.recent[0].thumbnailUrl).toBe('https://img.example.com/new.png');
		expect(result.stale).toBe(home.stale);
	});

	test('휴지통 링크의 다른 필드는 그대로 두고, 같은 id여도 썸네일 필드가 없는 폴더는 건드리지 않는다', () => {
		const trash = {
			folders: [{ id: 'l1', name: '폴더' }],
			links: [{ ...target, parentFolderName: '원래 폴더' }],
		};

		const result = patchLinkThumbnail(trash, 'l1', 'https://img.example.com/new.png');

		expect(result.folders).toBe(trash.folders);
		expect(result.links[0]).toEqual({
			...target,
			parentFolderName: '원래 폴더',
			thumbnailUrl: 'https://img.example.com/new.png',
		});
	});

	test('바꿀 링크가 없거나 썸네일이 같으면 원래 객체를 그대로 돌려준다', () => {
		const feed = { unviewed: [target], revisit: [other] };

		expect(patchLinkThumbnail(feed, 'missing', 'https://img.example.com/new.png')).toBe(feed);
		expect(patchLinkThumbnail(feed, 'l1', target.thumbnailUrl)).toBe(feed);
	});
});
