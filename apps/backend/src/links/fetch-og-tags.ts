import ogs from 'open-graph-scraper';

export interface OgTags {
	title: string | null;
	thumbnailUrl: string | null;
}

/**
 * URL의 OG 태그(og:title, og:image)를 가져온다. 실패하거나 값이 없으면 null로 채운다.
 * @param url string
 * @returns OgTags
 */
export async function fetchOgTags(url: string): Promise<OgTags> {
	try {
		const { error, result } = await ogs({ url, timeout: 5 });

		if (error) {
			return { title: null, thumbnailUrl: null };
		}

		return {
			title: result.ogTitle ?? null,
			thumbnailUrl: result.ogImage?.[0]?.url ?? null,
		};
	} catch {
		return { title: null, thumbnailUrl: null };
	}
}
