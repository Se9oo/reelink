import ogs from 'open-graph-scraper';
import { describe, expect, it, vi } from 'vitest';

import { fetchOgTags } from './fetch-og-tags.js';
import { publicDispatcher } from './public-dispatcher.js';

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

	test('og:image가 상대 경로면 페이지 URL 기준 절대 주소로 바꾼다', async () => {
		vi.mocked(ogs).mockResolvedValue({
			error: false,
			html: '',
			response: {},
			result: { ogTitle: '제목', ogImage: [{ url: '/images/cover.png' }] },
		} as never);

		const result = await fetchOgTags('https://blog.example.com/post/1');

		expect(result.thumbnailUrl).toBe('https://blog.example.com/images/cover.png');
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

	test('우리 봇 이름에 facebookexternalhit 토큰을 붙인 User-Agent로 요청한다(YouTube Music이 그 외 요청엔 지원 중단 브라우저 페이지를 줘서)', async () => {
		vi.mocked(ogs).mockResolvedValue({ error: false, html: '', response: {}, result: {} } as never);

		await fetchOgTags('https://music.youtube.com');

		expect(ogs).toHaveBeenCalledWith(
			expect.objectContaining({
				fetchOptions: expect.objectContaining({
					headers: { 'user-agent': 'Mozilla/5.0 (compatible; ReelinkBot/1.0) facebookexternalhit/1.1' },
				}),
			}),
		);
	});

	test('공개 IP에만 연결하는 dispatcher로 요청한다(사용자가 저장한 URL로 내부망에 요청하지 않게)', async () => {
		vi.mocked(ogs).mockResolvedValue({ error: false, html: '', response: {}, result: {} } as never);

		await fetchOgTags('https://example.com');

		expect(ogs).toHaveBeenCalledWith(
			expect.objectContaining({ fetchOptions: expect.objectContaining({ dispatcher: publicDispatcher }) }),
		);
	});
});
