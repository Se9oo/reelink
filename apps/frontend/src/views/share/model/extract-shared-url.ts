import { isValidHttpUrl } from '@/shared/lib/is-valid-http-url';

const URL_PATTERN = /https?:\/\/[^\s<>"'[\]{}]+/;
const TRAILING_PUNCTUATION = /[.,!?;:]$/;

interface SharedData {
	url?: string;
	text?: string;
	title?: string;
}

function trimTrailing(url: string) {
	let trimmed = url;

	while (
		TRAILING_PUNCTUATION.test(trimmed) ||
		(trimmed.endsWith(')') && trimmed.split('(').length < trimmed.split(')').length)
	) {
		trimmed = trimmed.slice(0, -1);
	}

	return trimmed;
}

export function extractSharedUrl({ url, text, title }: SharedData): string | null {
	for (const value of [url, text, title]) {
		const match = value?.match(URL_PATTERN);
		const candidate = match && trimTrailing(match[0]);

		if (candidate && isValidHttpUrl(candidate)) {
			return candidate;
		}
	}

	return null;
}
