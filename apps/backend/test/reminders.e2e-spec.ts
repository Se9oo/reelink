import { eq } from 'drizzle-orm';

import { DrizzleDb } from '../src/db/drizzle.module.js';
import { folders, links, notificationChannels, users } from '../src/db/schema.js';
import { KakaoApiError, refreshKakaoToken, sendKakaoMemo } from '../src/notifications/kakao-api.js';
import { RemindersService } from '../src/notifications/reminders.service.js';

import { type E2ETestContext, setupE2EApp, teardownE2EApp } from './utils/setup-e2e-app.js';

vi.mock('../src/notifications/kakao-api.js', async (importOriginal) => ({
	...(await importOriginal<typeof import('../src/notifications/kakao-api.js')>()),
	refreshKakaoToken: vi.fn(),
	sendKakaoMemo: vi.fn(),
}));

const NOW = new Date('2001-01-10T00:00:00Z');
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);
const invalidGrant = () => new KakaoApiError(400, 'token refresh', 'invalid_grant');

describe('RemindersService (e2e)', () => {
	let context: E2ETestContext;
	let db: DrizzleDb;
	let testUserId: string;
	let reminders: RemindersService;
	let channelId: string;
	let folderId: string;

	beforeAll(async () => {
		context = await setupE2EApp('reminders-e2e@test.com', '리마인드테스트');
		({ db, testUserId } = context);
		reminders = context.app.get(RemindersService);
		const [folder] = await db.insert(folders).values({ userId: testUserId, name: '폴더' }).returning();
		folderId = folder.id;
	});

	afterAll(async () => {
		await teardownE2EApp(context);
	});

	beforeEach(async () => {
		vi.mocked(sendKakaoMemo).mockReset().mockResolvedValue();
		vi.mocked(refreshKakaoToken).mockReset();
		await db.update(users).set({ notificationMethod: 'kakao', lastRemindedAt: null }).where(eq(users.id, testUserId));
		await db.delete(links).where(eq(links.userId, testUserId));
		await db.delete(notificationChannels).where(eq(notificationChannels.userId, testUserId));
		const [channel] = await db
			.insert(notificationChannels)
			.values({
				userId: testUserId,
				provider: 'kakao',
				externalId: '1',
				accessToken: 'valid-access',
				refreshToken: 'valid-refresh',
				tokenExpiresAt: new Date(NOW.getTime() + 60 * 60 * 1000),
			})
			.returning();
		channelId = channel.id;
	});

	async function insertLink(values: Partial<typeof links.$inferInsert> = {}) {
		await db.insert(links).values({
			userId: testUserId,
			folderId,
			url: 'https://example.com/a',
			title: '글',
			createdAt: daysAgo(8),
			...values,
		});
	}

	async function getChannel() {
		const [channel] = await db.select().from(notificationChannels).where(eq(notificationChannels.id, channelId));
		return channel;
	}

	async function getLastRemindedAt() {
		const [user] = await db.select().from(users).where(eq(users.id, testUserId));
		return user.lastRemindedAt;
	}

	test('7일 넘은 안 본 링크가 있으면 안 본 링크 전체를 오래된 순으로 한 통에 담아 보내고 발송 시각을 남긴다.', async () => {
		await insertLink({ title: '최근 글', createdAt: daysAgo(3) });
		await insertLink({ title: '오래된 글', createdAt: daysAgo(9) });
		await insertLink({ title: null, url: 'https://n.news.naver.com/x', createdAt: daysAgo(8) });
		await insertLink({ title: '본 글', status: 'viewed' });
		await insertLink({ title: '지운 글', deletedAt: daysAgo(1) });

		await reminders.sendDailyReminders(NOW);

		expect(sendKakaoMemo).toHaveBeenCalledTimes(1);
		expect(sendKakaoMemo).toHaveBeenCalledWith(
			'valid-access',
			'안 본 링크 3개가 기다려요\n· 오래된 글\n· n.news.naver.com\n· 최근 글',
			expect.stringMatching(/\/feed$/),
		);
		expect(await getLastRemindedAt()).toEqual(NOW);
	});

	test('안 본 링크가 모두 7일이 안 됐으면 보내지 않는다.', async () => {
		await insertLink({ createdAt: daysAgo(3) });

		await reminders.sendDailyReminders(NOW);

		expect(sendKakaoMemo).not.toHaveBeenCalled();
	});

	test('마지막 알림 후 3일이 안 지났으면 보내지 않는다.', async () => {
		await db
			.update(users)
			.set({ lastRemindedAt: daysAgo(2) })
			.where(eq(users.id, testUserId));
		await insertLink();

		await reminders.sendDailyReminders(NOW);

		expect(sendKakaoMemo).not.toHaveBeenCalled();
	});

	test('3일 전 알림보다 크론이 조금 일찍 시작돼도 날짜 기준으로 3일이 지났으면 보낸다.', async () => {
		await db
			.update(users)
			.set({ lastRemindedAt: new Date(daysAgo(3).getTime() + 150) })
			.where(eq(users.id, testUserId));
		await insertLink();

		await reminders.sendDailyReminders(NOW);

		expect(sendKakaoMemo).toHaveBeenCalledTimes(1);
	});

	test('마지막 알림 후 3일이 지났으면 다시 보낸다.', async () => {
		await db
			.update(users)
			.set({ lastRemindedAt: daysAgo(3) })
			.where(eq(users.id, testUserId));
		await insertLink();

		await reminders.sendDailyReminders(NOW);

		expect(sendKakaoMemo).toHaveBeenCalledTimes(1);
	});

	test('알림을 끈 사용자(manual)에게는 보내지 않는다.', async () => {
		await db.update(users).set({ notificationMethod: 'manual' }).where(eq(users.id, testUserId));
		await insertLink();

		await reminders.sendDailyReminders(NOW);

		expect(sendKakaoMemo).not.toHaveBeenCalled();
	});

	test('revoked 채널에는 보내지 않는다.', async () => {
		await db.update(notificationChannels).set({ status: 'revoked' }).where(eq(notificationChannels.id, channelId));
		await insertLink();

		await reminders.sendDailyReminders(NOW);

		expect(sendKakaoMemo).not.toHaveBeenCalled();
	});

	test('access token이 곧 만료되면 갱신해서 저장한 뒤 새 토큰으로 보낸다.', async () => {
		await db
			.update(notificationChannels)
			.set({ tokenExpiresAt: new Date(NOW.getTime() + 60 * 1000) })
			.where(eq(notificationChannels.id, channelId));
		vi.mocked(refreshKakaoToken).mockResolvedValue({ accessToken: 'new-access', refreshToken: null, expiresIn: 21599 });
		await insertLink();

		await reminders.sendDailyReminders(NOW);

		expect(refreshKakaoToken).toHaveBeenCalledWith('valid-refresh');
		expect(sendKakaoMemo).toHaveBeenCalledWith('new-access', expect.any(String), expect.any(String));
		expect(await getChannel()).toMatchObject({
			accessToken: 'new-access',
			refreshToken: 'valid-refresh',
			tokenExpiresAt: new Date(NOW.getTime() + 21599 * 1000),
			status: 'active',
		});
	});

	test('refresh token이 무효(invalid_grant)면 채널을 revoked로 바꾸고 보내지 않는다.', async () => {
		await db.update(notificationChannels).set({ tokenExpiresAt: NOW }).where(eq(notificationChannels.id, channelId));
		vi.mocked(refreshKakaoToken).mockRejectedValue(invalidGrant());
		await insertLink();

		await reminders.sendDailyReminders(NOW);

		expect(sendKakaoMemo).not.toHaveBeenCalled();
		expect((await getChannel()).status).toBe('revoked');
		expect(await getLastRemindedAt()).toBeNull();
	});

	test('서버 설정 오류(invalid_client)로 갱신이 실패하면 revoked로 바꾸지 않는다.', async () => {
		await db.update(notificationChannels).set({ tokenExpiresAt: NOW }).where(eq(notificationChannels.id, channelId));
		vi.mocked(refreshKakaoToken).mockRejectedValue(new KakaoApiError(401, 'token refresh', 'invalid_client'));
		await insertLink();

		await reminders.sendDailyReminders(NOW);

		expect(sendKakaoMemo).not.toHaveBeenCalled();
		expect((await getChannel()).status).toBe('active');
	});

	test('발송이 일시적으로 실패하면 발송 시각을 남기지 않아 다음 날 다시 대상이 된다.', async () => {
		vi.mocked(sendKakaoMemo).mockRejectedValue(new KakaoApiError(500, 'memo send'));
		await insertLink();

		await reminders.sendDailyReminders(NOW);

		expect(await getLastRemindedAt()).toBeNull();
		expect((await getChannel()).status).toBe('active');
	});

	test('발송이 401로 실패하면 토큰을 갱신해 한 번 더 보낸다.', async () => {
		vi.mocked(sendKakaoMemo).mockRejectedValueOnce(new KakaoApiError(401, 'memo send'));
		vi.mocked(refreshKakaoToken).mockResolvedValue({ accessToken: 'new-access', refreshToken: null, expiresIn: 21599 });
		await insertLink();

		await reminders.sendDailyReminders(NOW);

		expect(sendKakaoMemo).toHaveBeenLastCalledWith('new-access', expect.any(String), expect.any(String));
		expect(await getLastRemindedAt()).toEqual(NOW);
		expect((await getChannel()).status).toBe('active');
	});

	test('발송이 401이고 갱신도 invalid_grant면 revoked로 바꾼다.', async () => {
		vi.mocked(sendKakaoMemo).mockRejectedValueOnce(new KakaoApiError(401, 'memo send'));
		vi.mocked(refreshKakaoToken).mockRejectedValue(invalidGrant());
		await insertLink();

		await reminders.sendDailyReminders(NOW);

		expect((await getChannel()).status).toBe('revoked');
		expect(await getLastRemindedAt()).toBeNull();
	});

	test('발송이 403(-402, 메시지 권한 철회)으로 실패하면 바로 revoked로 바꾼다.', async () => {
		vi.mocked(sendKakaoMemo).mockRejectedValue(new KakaoApiError(403, 'memo send', '-402'));
		await insertLink();

		await reminders.sendDailyReminders(NOW);

		expect(refreshKakaoToken).not.toHaveBeenCalled();
		expect((await getChannel()).status).toBe('revoked');
	});

	test('권한 철회가 아닌 403(앱 설정 문제 등)은 revoked로 바꾸지 않는다.', async () => {
		vi.mocked(sendKakaoMemo).mockRejectedValue(new KakaoApiError(403, 'memo send', '-3'));
		await insertLink();

		await reminders.sendDailyReminders(NOW);

		expect((await getChannel()).status).toBe('active');
		expect(await getLastRemindedAt()).toBeNull();
	});

	describe('refreshExpiringTokens', () => {
		test('보낼 링크가 없어도 만료가 가까운 토큰을 갱신해 refresh token을 살려둔다.', async () => {
			await db.update(notificationChannels).set({ tokenExpiresAt: NOW }).where(eq(notificationChannels.id, channelId));
			vi.mocked(refreshKakaoToken).mockResolvedValue({
				accessToken: 'new-access',
				refreshToken: 'new-refresh',
				expiresIn: 21599,
			});

			await reminders.refreshExpiringTokens(NOW);

			expect(refreshKakaoToken).toHaveBeenCalledWith('valid-refresh');
			expect(await getChannel()).toMatchObject({ accessToken: 'new-access', refreshToken: 'new-refresh' });
		});

		test('알림을 꺼둔 사용자(manual)도 토큰을 갱신해 나중에 다시 켰을 때 연동이 살아 있게 한다.', async () => {
			await db.update(users).set({ notificationMethod: 'manual' }).where(eq(users.id, testUserId));
			await db.update(notificationChannels).set({ tokenExpiresAt: NOW }).where(eq(notificationChannels.id, channelId));
			vi.mocked(refreshKakaoToken).mockResolvedValue({
				accessToken: 'new-access',
				refreshToken: null,
				expiresIn: 21599,
			});

			await reminders.refreshExpiringTokens(NOW);

			expect(refreshKakaoToken).toHaveBeenCalledWith('valid-refresh');
			expect((await getChannel()).accessToken).toBe('new-access');
		});

		test('아직 유효한 토큰은 갱신하지 않는다.', async () => {
			await reminders.refreshExpiringTokens(NOW);

			expect(refreshKakaoToken).not.toHaveBeenCalled();
		});

		test('refresh token이 무효(invalid_grant)면 revoked로 바꾼다.', async () => {
			await db.update(notificationChannels).set({ tokenExpiresAt: NOW }).where(eq(notificationChannels.id, channelId));
			vi.mocked(refreshKakaoToken).mockRejectedValue(invalidGrant());

			await reminders.refreshExpiringTokens(NOW);

			expect((await getChannel()).status).toBe('revoked');
		});
	});
});
