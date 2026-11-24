import { describe, expect } from 'vitest';

import { normalizeSuggestions } from './classify-links.js';

describe('normalizeSuggestions', () => {
	const folderIds = ['f0', 'f1'];
	const linkIds = ['l0', 'l1', 'l2'];

	test('번호를 id로 바꾸고 빠진 링크는 null로 채운다', () => {
		const result = normalizeSuggestions(
			[
				{ link: 0, folder: 1 },
				{ link: 1, folder: null },
			],
			folderIds,
			linkIds,
		);

		expect(Object.fromEntries(result)).toEqual({ l0: 'f1', l1: null, l2: null });
	});

	test('범위 밖 번호, 중복 링크는 null로 처리한다', () => {
		const result = normalizeSuggestions(
			[
				{ link: 0, folder: 5 },
				{ link: 1, folder: 0 },
				{ link: 1, folder: 1 },
				{ link: 9, folder: 0 },
			],
			folderIds,
			linkIds,
		);

		expect(Object.fromEntries(result)).toEqual({ l0: null, l1: null, l2: null });
	});

	test('배열이 아니면 전부 null', () => {
		expect([...normalizeSuggestions({}, folderIds, linkIds).values()]).toEqual([null, null, null]);
	});
});
