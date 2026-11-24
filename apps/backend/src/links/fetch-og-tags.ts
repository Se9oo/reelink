import ogs from 'open-graph-scraper';

import { publicDispatcher } from './public-dispatcher.js';

const MAX_DESCRIPTION_LENGTH = 100;
const segmenter = new Intl.Segmenter();

export interface OgTags {
	title: string | null;
	thumbnailUrl: string | null;
	description: string | null;
}

function trimDescription(description: string | undefined): string | null {
	const trimmed = description?.trim();

	if (!trimmed) {
		return null;
	}

	return [...segmenter.segment(trimmed)]
		.slice(0, MAX_DESCRIPTION_LENGTH)
		.map(({ segment }) => segment)
		.join('');
}

/**
 * URL의 OG 태그(og:title, og:image, og:description)를 가져온다. 실패하거나 값이 없으면 null로 채운다.
 * og:image가 상대 경로면 페이지 URL 기준 절대 주소로 바꾼다.
 * @param url string
 * @returns OgTags
 */
export async function fetchOgTags(url: string): Promise<OgTags> {
	try {
		// 우리 봇 이름을 밝히되, 사이트들이 미리보기용 OG 태그를 내주는 기준인 facebookexternalhit 토큰을 덧붙인다.
		// 이게 없으면 YouTube Music은 지원 중단 브라우저 페이지를, 브라우저 UA면 Threads는 OG 태그 없는 앱 껍데기를 준다
		const { error, result } = await ogs({
			url,
			timeout: 5,
			fetchOptions: {
				headers: {
					'user-agent': 'Mozilla/5.0 (compatible; ReelinkBot/1.0) facebookexternalhit/1.1',
					'accept-encoding': 'identity',
				},
				dispatcher: publicDispatcher,
			},
		});

		if (error) {
			return { title: null, thumbnailUrl: null, description: null };
		}

		const image = result.ogImage?.[0]?.url;

		return {
			title: result.ogTitle ?? null,
			thumbnailUrl: image ? (URL.parse(image, url)?.href ?? null) : null,
			description: trimDescription(result.ogDescription),
		};
	} catch {
		return { title: null, thumbnailUrl: null, description: null };
	}
}
