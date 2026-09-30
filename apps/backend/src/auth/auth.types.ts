export interface OAuthProfile {
	provider: string;
	providerAccountId: string;
	email: string;
	nickname: string;
}

export interface AuthUser {
	id: string;
	email: string;
	nickname: string;
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
