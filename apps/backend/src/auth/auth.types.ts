export interface OAuthProfile {
	provider: string;
	providerAccountId: string;
	email: string;
	nickname: string;
	avatarUrl?: string;
}

export interface AuthUser {
	id: string;
	email: string;
	nickname: string;
	avatarUrl: string | null;
	isGuest: boolean;
}

/** 소셜 로그인 결과. welcome이면 가입 직후 온보딩 카드를 띄운다. */
export interface LoginUser extends AuthUser {
	welcome: boolean;
}

export interface TokenPair {
	accessToken: string;
	refreshToken: string;
}

export interface JwtPayload {
	sub: string;
	iat: number;
	exp: number;
}
