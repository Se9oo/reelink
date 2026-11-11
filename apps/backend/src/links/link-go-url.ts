import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * 링크 id에 대한 서명. JWT_SECRET을 쓰되 용도 접두사를 붙여 JWT 서명과 섞이지 않게 한다.
 * @param linkId string
 * @returns string 64자 hex
 */
function signLinkId(linkId: string): string {
	return createHmac('sha256', process.env.JWT_SECRET ?? '')
		.update(`link-go:${linkId}`)
		.digest('hex');
}

/**
 * 알림 메시지에 넣을 "링크 바로가기" 주소. 서버만 만들 수 있는 서명이 붙어, 우리 도메인이 아무 URL로나 보내는 데(오픈 리다이렉트) 쓰이지 않게 한다.
 * @param linkId string
 * @returns string `${FRONTEND_URL}/api/links/:id/go?sig=...`
 */
export function linkGoUrl(linkId: string): string {
	const base = process.env.FRONTEND_URL ?? 'http://localhost:3000';
	return `${base}/api/links/${linkId}/go?sig=${signLinkId(linkId)}`;
}

/**
 * linkGoUrl이 만든 서명인지 확인한다.
 * @param linkId string
 * @param sig unknown 쿼리스트링 값
 * @returns boolean
 */
export function isValidLinkGoSignature(linkId: string, sig: unknown): boolean {
	if (typeof sig !== 'string') {
		return false;
	}

	const expected = Buffer.from(signLinkId(linkId));
	const actual = Buffer.from(sig);
	return actual.length === expected.length && timingSafeEqual(actual, expected);
}
