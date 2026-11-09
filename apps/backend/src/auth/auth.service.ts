import { Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Cron } from '@nestjs/schedule';

import { createHash, randomBytes } from 'crypto';
import { and, eq, gt, lte, notExists, sql } from 'drizzle-orm';

import { DRIZZLE, type DrizzleDb, type DrizzleTx } from '../db/drizzle.module.js';
import { accounts, folders, kakaoBotLinks, links, notificationChannels, refreshTokens, users } from '../db/schema.js';
import { findLiveSystemFolder } from '../folders/find-live-system-folder.js';
import { lockUserFolders } from '../folders/lock-user-folders.js';
import { unlinkKakaoUser } from '../notifications/kakao-api.js';

import { type AuthUser, type LoginUser, type OAuthProfile, type TokenPair } from './auth.types.js';

@Injectable()
export class AuthService {
	private readonly logger = new Logger(AuthService.name);

	constructor(
		@Inject(DRIZZLE) private readonly db: DrizzleDb,
		private readonly jwt: JwtService,
	) {}

	private tokenToHash(rawToken: string) {
		return createHash('sha256').update(rawToken).digest('hex');
	}

	/**
	 * 소셜 계정으로 사용자를 찾거나 만든다. guestUserId가 있으면 게스트 데이터를 그 계정으로 이어받는다.
	 * - 처음 보는 계정: 게스트 행에 계정을 붙이고 프로필로 채워 정식 사용자로 바꾼다.
	 * - 이미 가입된 계정: 게스트의 폴더·링크를 기존 사용자로 옮기고 게스트 행을 지운다.
	 * welcome은 가입 직후 온보딩 카드를 띄울지 여부다. 새로 가입했거나 게스트가 처음 보는 계정으로 로그인하면 true,
	 * 게스트가 기존 계정으로 로그인하면 그 계정이 카카오 알림(active)과 봇을 둘 다 연동했을 때만 false, 일반 재로그인은 false.
	 * @param profile OAuthProfile
	 * @param guestUserId string | undefined 현재 세션이 게스트일 때 그 users.id
	 * @returns LoginUser
	 */
	async findOrCreateUser(
		{ provider, providerAccountId, email, nickname, avatarUrl }: OAuthProfile,
		guestUserId?: string,
	): Promise<LoginUser> {
		const [account] = await this.db
			.select()
			.from(accounts)
			.where(and(eq(accounts.provider, provider), eq(accounts.providerAccountId, providerAccountId)));

		if (account) {
			if (guestUserId) {
				await this.mergeGuestInto(guestUserId, account.userId);
			}

			const welcome = guestUserId ? !(await this.hasKakaoSetup(account.userId)) : false;
			const [user] = await this.db.select().from(users).where(eq(users.id, account.userId));

			if (avatarUrl && avatarUrl !== user.avatarUrl) {
				const [updated] = await this.db.update(users).set({ avatarUrl }).where(eq(users.id, user.id)).returning();
				return { ...updated, welcome };
			}

			return { ...user, welcome };
		}

		const created = await this.db.transaction(async (tx) => {
			const [claimed] = guestUserId
				? await tx
						.update(users)
						.set({ email, nickname, avatarUrl: avatarUrl ?? null, isGuest: false })
						.where(and(eq(users.id, guestUserId), eq(users.isGuest, true)))
						.returning()
				: [];
			if (claimed) {
				await tx.delete(refreshTokens).where(eq(refreshTokens.userId, claimed.id));
			}
			// 게스트 행이 그새 사라졌으면(동시에 다른 콜백이 이어받았거나 정리 크론) 새 사용자로 만든다
			const user = claimed ?? (await tx.insert(users).values({ email, nickname, avatarUrl }).returning())[0];
			await tx.insert(accounts).values({ userId: user.id, provider, providerAccountId });
			return user;
		});

		return { ...created, welcome: true };
	}

	/**
	 * 카카오 알림 채널이 active이고 카카오톡 봇도 연동돼 있는지 확인한다.
	 * @param userId string
	 * @returns boolean
	 */
	private async hasKakaoSetup(userId: string): Promise<boolean> {
		const [kakaoChannel] = await this.db
			.select({ id: notificationChannels.id })
			.from(notificationChannels)
			.where(
				and(
					eq(notificationChannels.userId, userId),
					eq(notificationChannels.provider, 'kakao'),
					eq(notificationChannels.status, 'active'),
				),
			);
		const [botLink] = await this.db
			.select({ id: kakaoBotLinks.id })
			.from(kakaoBotLinks)
			.where(eq(kakaoBotLinks.userId, userId));

		return !!kakaoChannel && !!botLink;
	}

	/**
	 * 게스트 사용자를 만든다. 소셜 계정(accounts)은 없다.
	 * @returns AuthUser
	 */
	async createGuest(): Promise<AuthUser> {
		const [guest] = await this.db.insert(users).values({ email: '', nickname: 'Guest', isGuest: true }).returning();
		return guest;
	}

	/**
	 * 만료되지 않은 refresh token의 주인이 게스트면 그 users.id를 반환한다.
	 * @param refreshToken string | undefined
	 * @returns string | undefined 토큰이 없거나 무효하거나 게스트가 아니면 undefined
	 */
	async findGuestIdBySession(refreshToken: string | undefined): Promise<string | undefined> {
		if (!refreshToken) {
			return undefined;
		}

		const [row] = await this.db
			.select({ userId: users.id })
			.from(refreshTokens)
			.innerJoin(users, eq(users.id, refreshTokens.userId))
			.where(
				and(
					eq(refreshTokens.tokenHash, this.tokenToHash(refreshToken)),
					gt(refreshTokens.expiresAt, new Date()),
					eq(users.isGuest, true),
				),
			);

		return row?.userId;
	}

	/**
	 * 게스트의 폴더·링크(소프트 삭제 포함)를 기존 사용자에게 옮기고 게스트 행을 지운다.
	 * 게스트 최상위 폴더는 기존 최상위 폴더 뒤에 원래 순서대로 붙고, 양쪽 다 휴지통에 없는 미분류가 있으면 하나로 합친다.
	 * @param guestUserId string
	 * @param userId string
	 */
	private async mergeGuestInto(guestUserId: string, userId: string): Promise<void> {
		await this.db.transaction(async (tx) => {
			await lockUserFolders(tx, userId);
			await lockUserFolders(tx, guestUserId);

			// 동시에 다른 콜백이 이 게스트를 정식 사용자로 바꿨을 수 있어서, 행을 잠그고 아직 게스트인지 다시 확인한다
			const [guest] = await tx
				.select({ id: users.id })
				.from(users)
				.where(and(eq(users.id, guestUserId), eq(users.isGuest, true)))
				.for('update');

			if (!guest) {
				return;
			}

			const guestUncategorized = await findLiveSystemFolder(guestUserId, '미분류', tx);
			const uncategorized = await findLiveSystemFolder(userId, '미분류', tx);

			if (guestUncategorized && uncategorized) {
				await this.appendGuestFolders(tx, guestUserId, userId, guestUncategorized.id, uncategorized.id);
				await tx.update(links).set({ folderId: uncategorized.id }).where(eq(links.folderId, guestUncategorized.id));
				await tx.delete(folders).where(eq(folders.id, guestUncategorized.id));
			}

			await this.appendGuestFolders(tx, guestUserId, userId, null, null);
			await tx.update(folders).set({ userId }).where(eq(folders.userId, guestUserId));
			await tx.update(links).set({ userId }).where(eq(links.userId, guestUserId));
			await tx.delete(users).where(eq(users.id, guestUserId));
		});
	}

	/**
	 * 게스트의 fromParentId 밑 폴더들을 기존 사용자의 toParentId 밑 형제 폴더 뒤로, 원래 순서를 유지한 채 옮긴다.
	 * @param tx DrizzleTx
	 * @param guestUserId string
	 * @param userId string
	 * @param fromParentId string | null null이면 게스트 최상위
	 * @param toParentId string | null null이면 기존 사용자 최상위
	 */
	private async appendGuestFolders(
		tx: DrizzleTx,
		guestUserId: string,
		userId: string,
		fromParentId: string | null,
		toParentId: string | null,
	): Promise<void> {
		await tx.execute(sql`
			UPDATE folders f
			SET parent_folder_id = ${toParentId}::uuid, sort_order = base.next + moved.rn - 1
			FROM (
				SELECT id, row_number() OVER (ORDER BY sort_order, id) AS rn
				FROM folders
				WHERE user_id = ${guestUserId} AND parent_folder_id IS NOT DISTINCT FROM ${fromParentId}::uuid
			) moved,
			(
				SELECT coalesce(max(sort_order) + 1, 0) AS next
				FROM folders
				WHERE user_id = ${userId} AND parent_folder_id IS NOT DISTINCT FROM ${toParentId}::uuid
			) base
			WHERE f.id = moved.id
		`);
	}

	/**
	 * 매일 KST 00:00, 만료되지 않은 refresh token이 하나도 없는(= 30일 동안 안 들어온) 게스트를 지운다. 폴더·링크는 FK cascade로 함께 지워진다.
	 * @param now Date
	 */
	@Cron('0 0 * * *', { timeZone: 'Asia/Seoul' })
	async deleteAbandonedGuests(now = new Date()): Promise<void> {
		await this.db.delete(users).where(
			and(
				eq(users.isGuest, true),
				notExists(
					this.db
						.select({ id: refreshTokens.id })
						.from(refreshTokens)
						.where(and(eq(refreshTokens.userId, users.id), gt(refreshTokens.expiresAt, now))),
				),
			),
		);
	}

	/**
	 * 매일 KST 00:00, 만료된 refresh token 행을 지운다. 회전·로그아웃 없이 버려진 기기의 토큰이 쌓이지 않게 한다.
	 * @param now Date
	 */
	@Cron('0 0 * * *', { timeZone: 'Asia/Seoul' })
	async deleteExpiredRefreshTokens(now = new Date()): Promise<void> {
		await this.db.delete(refreshTokens).where(lte(refreshTokens.expiresAt, now));
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

	/**
	 * 회원 탈퇴. 카카오 로그인·알림 연동이 있으면 카카오 앱 연결을 먼저 끊고, users 행을 지운다(나머지 데이터는 FK cascade).
	 * 카카오 연결 끊기가 실패해도 개인정보가 남지 않도록 삭제는 그대로 진행하고 로그만 남긴다.
	 * @param userId string
	 */
	async deleteUser(userId: string): Promise<void> {
		const kakaoIds = await this.db
			.select({ id: accounts.providerAccountId })
			.from(accounts)
			.where(and(eq(accounts.userId, userId), eq(accounts.provider, 'kakao')))
			.union(
				this.db
					.select({ id: notificationChannels.externalId })
					.from(notificationChannels)
					.where(and(eq(notificationChannels.userId, userId), eq(notificationChannels.provider, 'kakao'))),
			);

		for (const { id } of kakaoIds) {
			await unlinkKakaoUser(id).catch((error: unknown) => {
				this.logger.error(`카카오 연결 끊기 실패 (userId=${userId})`, error instanceof Error ? error.stack : error);
			});
		}

		await this.db.delete(users).where(eq(users.id, userId));
	}

	/**
	 * users.id로 유저 조회
	 */
	async findUserById(userId: string): Promise<AuthUser> {
		const [user] = await this.db.select().from(users).where(eq(users.id, userId));

		if (!user) {
			throw new UnauthorizedException('Not Exist User');
		}

		const { id, email, nickname, avatarUrl, isGuest } = user;

		return { id, email, nickname, avatarUrl, isGuest };
	}
}
