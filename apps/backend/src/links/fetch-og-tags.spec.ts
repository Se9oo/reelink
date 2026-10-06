import ogs from 'open-graph-scraper';
import { describe, expect, it, vi } from 'vitest';

import { fetchOgTags } from './fetch-og-tags.js';

vi.mock('open-graph-scraper');

describe('fetchOgTags', () => {
	test('og:title과 og:image를 가져온다', async () => {
		vi.mocked(ogs).mockResolvedValue({
			error: false,
			html: '',
			response: {},
			result: { ogTitle: '제목', ogImage: [{ url: 'https://example.com/thumb.jpg' }] },
		} as never);

		const result = await fetchOgTags('https://example.com');

		expect(result).toEqual({ title: '제목', thumbnailUrl: 'https://example.com/thumb.jpg' });
	});

	test('추출에 실패하면 title/thumbnailUrl이 null이다', async () => {
		vi.mocked(ogs).mockResolvedValue({
			error: true,
			html: undefined,
			response: undefined,
			result: {},
		} as never);

		const result = await fetchOgTags('https://example.com');

		expect(result).toEqual({ title: null, thumbnailUrl: null });
	});

	test('ogs가 예외를 던져도 title/thumbnailUrl이 null이다', async () => {
		vi.mocked(ogs).mockRejectedValue(new Error('network error'));

		const result = await fetchOgTags('https://example.com');

		expect(result).toEqual({ title: null, thumbnailUrl: null });
	});

	test('og:image가 없으면 thumbnailUrl만 null이다', async () => {
		vi.mocked(ogs).mockResolvedValue({
			error: false,
			html: '',
			response: {},
			result: { ogTitle: '제목' },
		} as never);

		const result = await fetchOgTags('https://example.com');

		expect(result).toEqual({ title: '제목', thumbnailUrl: null });
	});
});
