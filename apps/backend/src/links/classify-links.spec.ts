import { describe, expect, vi } from 'vitest';

import { classifyLinks, ClassifyLinksError, normalizeSuggestions } from './classify-links.js';

const create = vi.hoisted(() => vi.fn());

vi.mock('@anthropic-ai/sdk', () => ({
	default: class {
		messages = { create };
	},
}));

describe('classifyLinks', () => {
	const folders = [{ id: 'f0', path: '개발', sampleTitles: [] }];
	const links = [
		{ id: 'l0', title: null, description: null, url: 'https://www.youtube.com/watch?v=x', savedReason: null },
	];

	function respond(stopReason: string, text: string) {
		create.mockResolvedValueOnce({
			stop_reason: stopReason,
			usage: { input_tokens: 1, output_tokens: 1 },
			content: [{ type: 'text', text }],
		});
	}

	test('응답의 번호를 id로 바꾸고, 제목이 없는 링크는 호스트명을 제목으로 보낸다', async () => {
		respond('end_turn', JSON.stringify({ results: [{ link: 0, folder: 0 }] }));

		const result = await classifyLinks(folders, links);

		expect(Object.fromEntries(result)).toEqual({ l0: 'f0' });
		expect(JSON.parse(create.mock.lastCall?.[0].messages[0].content).links[0].title).toBe('www.youtube.com');
	});

	test('AI가 거절하면 ClassifyLinksError를 던진다(한도를 돌려받게)', async () => {
		respond('refusal', '');

		await expect(classifyLinks(folders, links)).rejects.toBeInstanceOf(ClassifyLinksError);
	});

	test('응답을 JSON으로 읽을 수 없으면 ClassifyLinksError를 던진다', async () => {
		respond('end_turn', '폴더는 개발입니다');

		await expect(classifyLinks(folders, links)).rejects.toBeInstanceOf(ClassifyLinksError);
	});

	test('API 호출이 실패하면 ClassifyLinksError를 던진다', async () => {
		create.mockRejectedValueOnce(new Error('credit balance too low'));

		await expect(classifyLinks(folders, links)).rejects.toBeInstanceOf(ClassifyLinksError);
	});
});

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
