import { isValidHttpUrl } from '../common/is-valid-http-url.js';

const URL_PATTERN = /https?:\/\/[^\s<>"'()[\]{},]+/g;
const TRAILING_PUNCTUATION = /[.!?;:]+$/;

/**
 * 메시지 텍스트에서 http/https URL을 등장 순서대로, 중복 없이 뽑는다.
 * @param text string
 * @returns string[]
 */
export function extractUrls(text: string): string[] {
	const urls = (text.match(URL_PATTERN) ?? []).map((url) => url.replace(TRAILING_PUNCTUATION, ''));

	return [...new Set(urls.filter(isValidHttpUrl))];
}
