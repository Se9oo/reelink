import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { and, eq, gt } from 'drizzle-orm';
import { type AuthUser, type OAuthProfile, type TokenPair } from './auth.types.js';
import { DRIZZLE, type DrizzleDb } from '../db/drizzle.module.js';
import { accounts, refreshTokens, users } from '../db/schema.js';
import { createHash, randomBytes } from 'crypto';

@Injectable()
export class AuthService {
	constructor(
		@Inject(DRIZZLE) private readonly db: DrizzleDb,
		private readonly jwt: JwtService,
	) {}

	private tokenToHash(rawToken: string) {
		return createHash('sha256').update(rawToken).digest('hex');
	}

	async findOrCreateUser({ provider, providerAccountId, email, nickname }: OAuthProfile): Promise<AuthUser> {
		const [account] = await this.db
			.select()
			.from(accounts)
			.where(and(eq(accounts.provider, provider), eq(accounts.providerAccountId, providerAccountId)));

		if (account) {
			const [user] = await this.db.select().from(users).where(eq(users.id, account.userId));
			return user;
		}

		return this.db.transaction(async (tx) => {
			const [newUser] = await tx.insert(users).values({ email, nickname }).returning();
			await tx.insert(accounts).values({ userId: newUser.id, provider, providerAccountId });
			return newUser;
		});
	}

	/**
	 * access token(JWT, 15분)과 refresh token(랜덤 문자열, 30일)을 새로 발급.
	 * refresh token은 원문이 아니라 해시로 refresh_tokens에 저장
	 */
	async issueTokens(userId: string): Promise<TokenPair> {
		const accessToken = await this.jwt.signAsync({ sub: userId });

		const rawToken = randomBytes(32).toString('hex');
		const tokenHash = this.tokenToHash(rawToken);

		const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

		await this.db.insert(refreshTokens).values({
			userId,
			tokenHash,
			expiresAt,
		});

		return { accessToken, refreshToken: rawToken };
	}

	/**
	 * 넘어온 refresh token을 해시해서 refresh_tokens에서 조회.
	 * - 없거나 만료면 에러(로그인 다시 필요).
	 * - 있으면 그 행을 지우고 issueTokens로 새 토큰 쌍을 발급(rotation).
	 */
	async rotateRefreshToken(refreshToken: string): Promise<TokenPair> {
		const tokenHash = this.tokenToHash(refreshToken);

		const [deleted] = await this.db
			.delete(refreshTokens)
			.where(and(eq(refreshTokens.tokenHash, tokenHash), gt(refreshTokens.expiresAt, new Date())))
			.returning();

		if (!deleted) {
			throw new UnauthorizedException();
		}

		return this.issueTokens(deleted.userId);
	}

	/** 로그아웃: 넘어온 refresh token에 해당하는 행을 삭제. */
	async revokeRefreshToken(refreshToken: string): Promise<void> {
		const tokenHash = this.tokenToHash(refreshToken);

		await this.db.delete(refreshTokens).where(eq(refreshTokens.tokenHash, tokenHash));
	}
}
