import { isValidHttpUrl } from '../common/is-valid-http-url.js';

const URL_PATTERN = /https?:\/\/[^\s<>"'[\]{}]+/g;
const TRAILING_PUNCTUATION = /[.,!?;:]$/;

/**
 * URL 끝에 붙은 문장부호와, 여는 괄호 없이 닫히는 괄호를 떼어낸다. URL 안의 쉼표·짝 맞는 괄호는 남긴다.
 * @param url string
 * @returns string
 */
function trimTrailing(url: string): string {
	let trimmed = url;

	while (TRAILING_PUNCTUATION.test(trimmed) || endsWithUnbalancedParen(trimmed)) {
		trimmed = trimmed.slice(0, -1);
	}

	return trimmed;
}

function endsWithUnbalancedParen(url: string): boolean {
	return url.endsWith(')') && url.split('(').length < url.split(')').length;
}

/**
 * 메시지 텍스트에서 http/https URL을 등장 순서대로, 중복 없이 뽑는다.
 * @param text string
 * @returns string[]
 */
export function extractUrls(text: string): string[] {
	const urls = (text.match(URL_PATTERN) ?? []).map(trimTrailing);

	return [...new Set(urls.filter(isValidHttpUrl))];
}
