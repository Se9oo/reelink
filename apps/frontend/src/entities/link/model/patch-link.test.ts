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
		remindAt: null,
		pinnedAt: null,
		viewedAt: null,
		deletedAt: null,
		...overrides,
	};
}

const target = link({ id: 'l1' });
const other = link({ id: 'l2', url: 'https://example.com', thumbnailUrl: 'https://img.example.com/other.png' });
const newThumbnail = () => ({ thumbnailUrl: 'https://img.example.com/new.png' });

describe('patchLink', () => {
	test('링크 배열(폴더, 검색)에서 같은 id 링크만 바꾼다', () => {
		const result = patchLink([target, other], 'l1', newThumbnail);

		expect(result).toEqual([{ ...target, ...newThumbnail() }, other]);
		expect(result[1]).toBe(other);
	});

	test('돌려준 필드만 바꾸고, 그사이 사용자가 바꾼 다른 필드는 그대로 둔다', () => {
		const edited = { ...target, title: '사용자가 고친 제목', status: 'viewed' as const, folderId: 'f2' };

		const [result] = patchLink([edited], 'l1', (cached) => ({
			title: cached.title ?? 'OG 제목',
			thumbnailUrl: 'https://img.example.com/new.png',
		}));

		expect(result).toEqual({ ...edited, thumbnailUrl: 'https://img.example.com/new.png' });
	});

	test('홈 요약처럼 중첩된 모양에서도 찾아 바꾼다', () => {
		const home = {
			remind: { unviewedCount: 1, revisitCount: 0, oldestUnviewed: target, previews: [target] },
			upcoming: [],
			stale: [other],
			recent: [target],
		};

		const result = patchLink(home, 'l1', newThumbnail);

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

		const result = patchLink(trash, 'l1', newThumbnail);

		expect(result.folders).toBe(trash.folders);
		expect(result.links[0]).toEqual({ ...target, ...newThumbnail(), parentFolderName: '원래 폴더' });
	});

	test('바꿀 링크가 없거나 바뀐 필드가 없으면 원래 객체를 그대로 돌려준다', () => {
		const feed = { unviewed: [target], revisit: [other] };

		expect(patchLink(feed, 'missing', newThumbnail)).toBe(feed);
		expect(patchLink(feed, 'l1', () => ({ thumbnailUrl: target.thumbnailUrl }))).toBe(feed);
	});
});
