const KAKAO_TIMEOUT_MS = 5000;

export interface KakaoTokens {
	accessToken: string;
	refreshToken: string;
	expiresIn: number;
	scope: string;
}

export async function exchangeKakaoCode(code: string): Promise<KakaoTokens> {
	const res = await fetch('https://kauth.kakao.com/oauth/token', {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
		body: new URLSearchParams({
			grant_type: 'authorization_code',
			client_id: process.env.KAKAO_CLIENT_ID ?? '',
			client_secret: process.env.KAKAO_CLIENT_SECRET ?? '',
			redirect_uri: process.env.KAKAO_NOTIFY_CALLBACK_URL ?? '',
			code,
		}),
		signal: AbortSignal.timeout(KAKAO_TIMEOUT_MS),
	});

	if (!res.ok) {
		throw new Error(`Kakao token exchange failed: ${res.status}`);
	}

	const body = await res.json();

	return {
		accessToken: body.access_token,
		refreshToken: body.refresh_token,
		expiresIn: body.expires_in,
		scope: body.scope ?? '',
	};
}

export async function fetchKakaoUserId(accessToken: string): Promise<string> {
	const res = await fetch('https://kapi.kakao.com/v2/user/me', {
		headers: { Authorization: `Bearer ${accessToken}` },
		signal: AbortSignal.timeout(KAKAO_TIMEOUT_MS),
	});

	if (!res.ok) {
		throw new Error(`Kakao user lookup failed: ${res.status}`);
	}

	const body = await res.json();

	return String(body.id);
}
