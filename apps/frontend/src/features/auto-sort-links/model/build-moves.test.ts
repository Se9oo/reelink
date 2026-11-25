import { describe, expect, test } from 'vitest';

import { buildMoves, toRows } from '@/features/auto-sort-links/model/build-moves';

describe('toRows', () => {
	test('추천이 있으면 체크된 ai, 없으면 체크 해제', () => {
		expect(
			toRows([
				{ linkId: 'a', folderId: 'f' },
				{ linkId: 'b', folderId: null },
			]),
		).toEqual([
			{ linkId: 'a', folderId: 'f', source: 'ai', checked: true },
			{ linkId: 'b', folderId: null, source: 'ai', checked: false },
		]);
	});
});

describe('buildMoves', () => {
	test('체크되고 폴더가 있는 행만 옮긴다', () => {
		expect(
			buildMoves([
				{ linkId: 'a', folderId: 'f', source: 'ai', checked: true },
				{ linkId: 'b', folderId: 'g', source: 'user', checked: true },
				{ linkId: 'c', folderId: 'f', source: 'ai', checked: false },
				{ linkId: 'd', folderId: null, source: 'ai', checked: true },
			]),
		).toEqual([
			{ linkId: 'a', folderId: 'f', source: 'ai' },
			{ linkId: 'b', folderId: 'g', source: 'user' },
		]);
	});
});
