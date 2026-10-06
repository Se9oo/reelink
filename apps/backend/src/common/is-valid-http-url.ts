/**
 * 문자열이 http/https 스킴을 가진 유효한 URL 형식인지 확인한다.
 * @param value string
 * @returns boolean
 */
export function isValidHttpUrl(value: string): boolean {
	try {
		const url = new URL(value);

		return url.protocol === 'http:' || url.protocol === 'https:';
	} catch {
		return false;
	}
}
