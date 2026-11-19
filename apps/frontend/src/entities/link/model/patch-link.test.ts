import { describe, expect, test } from 'vitest';

import { patchLink } from '@/entities/link/model/patch-link';
import { Link } from '@/entities/link/model/types';

function link(overrides: Partial<Link> & Pick<Link, 'id'>): Link {
	return {
		userId: 'u',
		folderId: 'f1',
		url: 'https://www.threads.com/a',
		title: null,
		thumbnailUrl: 'https://img.example.com/old.png',
		folderSource: 'user',
		shelfLifeDays: null,
		savedReason: null,
		status: 'unviewed',
		createdAt: '2026-10-20T00:00:00Z',
		lastRemindedAt: null,
		remindAt: null,
		pinnedAt: null,
		viewedAt: null,
		deletedAt: null,
		...overrides,
	};
}

const target = link({ id: 'l1' });
const other = link({ id: 'l2', url: 'https://example.com', thumbnailUrl: 'https://img.example.com/other.png' });
const newThumbnail = { ...target, thumbnailUrl: 'https://img.example.com/new.png' };

describe('patchLink', () => {
	test('링크 배열(폴더, 검색)에서 같은 id 링크만 바꾼다', () => {
		const result = patchLink([target, other], newThumbnail);

		expect(result).toEqual([newThumbnail, other]);
		expect(result[1]).toBe(other);
	});

	test('서버가 준 제목도 덮어쓴다', () => {
		const result = patchLink([target], { ...target, title: '새 제목' });

		expect(result[0].title).toBe('새 제목');
	});

	test('홈 요약처럼 중첩된 모양에서도 찾아 바꾼다', () => {
		const home = {
			remind: { unviewedCount: 1, revisitCount: 0, oldestUnviewed: target, previews: [target] },
			upcoming: [],
			stale: [other],
			recent: [target],
		};

		const result = patchLink(home, newThumbnail);

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

		const result = patchLink(trash, newThumbnail);

		expect(result.folders).toBe(trash.folders);
		expect(result.links[0]).toEqual({ ...newThumbnail, parentFolderName: '원래 폴더' });
	});

	test('바꿀 링크가 없거나 바뀐 필드가 없으면 원래 객체를 그대로 돌려준다', () => {
		const feed = { unviewed: [target], revisit: [other] };

		expect(patchLink(feed, { ...newThumbnail, id: 'missing' })).toBe(feed);
		expect(patchLink(feed, { ...target })).toBe(feed);
	});
});
