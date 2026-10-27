const KAKAO_TIMEOUT_MS = 5000;

export class KakaoApiError extends Error {
	constructor(
		readonly status: number,
		action: string,
		readonly error: string | null = null,
	) {
		super(`Kakao ${action} failed: ${status}${error ? ` ${error}` : ''}`);
	}
}

export interface KakaoTokens {
	accessToken: string;
	refreshToken: string;
	expiresIn: number;
	scope: string;
}

export interface RefreshedKakaoTokens {
	accessToken: string;
	refreshToken: string | null;
	expiresIn: number;
}

/**
 * 카카오 토큰 엔드포인트(/oauth/token)를 호출한다. client_id·client_secret은 환경변수에서 채운다.
 * @param params Record<string, string> grant_type 등 요청마다 다른 값
 * @param action string 에러 메시지에 쓸 동작 이름
 * @returns 카카오 응답 본문
 * @throws KakaoApiError 응답이 실패면 status와 카카오 error 값(invalid_grant 등)을 담아서
 */
async function requestKakaoToken(params: Record<string, string>, action: string) {
	const res = await fetch('https://kauth.kakao.com/oauth/token', {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
		body: new URLSearchParams({
			client_id: process.env.KAKAO_CLIENT_ID ?? '',
			client_secret: process.env.KAKAO_CLIENT_SECRET ?? '',
			...params,
		}),
		signal: AbortSignal.timeout(KAKAO_TIMEOUT_MS),
	});

	if (!res.ok) {
		const body = await res.json().catch(() => null);
		throw new KakaoApiError(res.status, action, body?.error ?? null);
	}

	return await res.json();
}

/**
 * 알림 연동 OAuth 콜백으로 받은 인가 코드를 access/refresh token으로 바꾼다.
 * @param code string
 * @returns KakaoTokens scope에는 사용자가 실제로 동의한 권한이 공백으로 구분돼 들어온다
 * @throws KakaoApiError
 */
export async function exchangeKakaoCode(code: string): Promise<KakaoTokens> {
	const body = await requestKakaoToken(
		{
			grant_type: 'authorization_code',
			redirect_uri: process.env.KAKAO_NOTIFY_CALLBACK_URL ?? '',
			code,
		},
		'token exchange',
	);

	return {
		accessToken: body.access_token,
		refreshToken: body.refresh_token,
		expiresIn: body.expires_in,
		scope: body.scope ?? '',
	};
}

/**
 * refresh token으로 새 access token을 받는다.
 * @param refreshToken string
 * @returns RefreshedKakaoTokens refresh token은 남은 기간이 1개월 미만일 때만 새로 내려오고, 아니면 null
 * @throws KakaoApiError refresh token이 무효면 error가 invalid_grant
 */
export async function refreshKakaoToken(refreshToken: string): Promise<RefreshedKakaoTokens> {
	const body = await requestKakaoToken({ grant_type: 'refresh_token', refresh_token: refreshToken }, 'token refresh');

	return {
		accessToken: body.access_token,
		refreshToken: body.refresh_token ?? null,
		expiresIn: body.expires_in,
	};
}

/**
 * access token 주인의 카카오 회원번호를 가져온다.
 * @param accessToken string
 * @returns string
 * @throws KakaoApiError
 */
export async function fetchKakaoUserId(accessToken: string): Promise<string> {
	const res = await fetch('https://kapi.kakao.com/v2/user/me', {
		headers: { Authorization: `Bearer ${accessToken}` },
		signal: AbortSignal.timeout(KAKAO_TIMEOUT_MS),
	});

	if (!res.ok) {
		throw new KakaoApiError(res.status, 'user lookup');
	}

	const body = await res.json();

	return String(body.id);
}

/**
 * 카카오 '나에게 보내기' 기본 텍스트 템플릿으로 메시지를 보낸다.
 * @param accessToken string
 * @param text string 최대 200자
 * @param linkUrl string 메시지와 "리마인드 보기" 버튼이 여는 주소. 콘솔에 등록한 Web 사이트 도메인이어야 한다
 * @throws KakaoApiError 실패면 status와 카카오 code 값(-401, -402 등)을 담아서
 */
export async function sendKakaoMemo(accessToken: string, text: string, linkUrl: string): Promise<void> {
	const templateObject = {
		object_type: 'text',
		text,
		link: { web_url: linkUrl, mobile_web_url: linkUrl },
		button_title: '리마인드 보기',
	};

	const res = await fetch('https://kapi.kakao.com/v2/api/talk/memo/default/send', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${accessToken}`,
			'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
		},
		body: new URLSearchParams({ template_object: JSON.stringify(templateObject) }),
		signal: AbortSignal.timeout(KAKAO_TIMEOUT_MS),
	});

	if (!res.ok) {
		const body = await res.json().catch(() => null);
		throw new KakaoApiError(res.status, 'memo send', body?.code != null ? String(body.code) : null);
	}
}
