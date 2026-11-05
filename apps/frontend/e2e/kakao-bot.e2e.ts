import { expect, type Page, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';

import { deleteUser, sendKakaoMessage, signIn, startGuest } from './support';

let userId: string;

test.afterEach(async () => {
	await deleteUser(userId);
});

async function openLinkDialog(page: Page) {
	await page.goto('/settings');
	await page.getByRole('region', { name: '링크 등록' }).getByRole('button', { name: '연동하기' }).click();
	return page.getByRole('dialog');
}

test.describe('로그인 사용자', () => {
	test.beforeEach(async ({ context }) => {
		userId = await signIn(context);
	});

	test('설정에서 봇을 연동하고, 봇으로 보낸 링크가 카카오톡으로 등록 폴더에 저장된다', async ({
		page,
		request,
	}, testInfo) => {
		const botUserKey = `e2e-${randomUUID()}`;

		const dialog = await openLinkDialog(page);
		const code = (await dialog.getByText(/^\d{6}$/).textContent()) ?? '';
		expect(await dialog.getByText(/남음$/).textContent()).toMatch(/^(5:00|[0-4]:[0-5]\d) 남음$/);
		await page.screenshot({ path: testInfo.outputPath('1-code-dialog.png') });

		expect(await sendKakaoMessage(request, botUserKey, code)).toBe('연동됐어요! 이제 링크를 보내면 저장해 드려요');
		await expect(dialog.getByText('연동 완료!')).toBeVisible();
		await page.screenshot({ path: testInfo.outputPath('2-linked.png') });

		await dialog.getByRole('button', { name: '확인' }).click();
		await expect(page.getByRole('region', { name: '링크 등록' }).getByText('연동됨')).toBeVisible();

		expect(await sendKakaoMessage(request, botUserKey, '[테스트] 나중에 볼 글 https://example.com/e2e')).toBe(
			'저장했어요 ✅',
		);

		await page.goto('/folders');
		await page.getByRole('link', { name: '카카오톡으로 등록' }).first().click();
		await expect(page.getByText(/example\.com|Example Domain/).first()).toBeVisible();
		await page.screenshot({ path: testInfo.outputPath('3-saved-link.png') });
	});

	test('알림 동의에서 홈으로 돌아오면(onboarding=bot) 봇 연동 코드 모달이 바로 열린다', async ({ page }, testInfo) => {
		await page.goto('/home?onboarding=bot');

		await expect(page.getByRole('dialog').getByText(/^\d{6}$/)).toBeVisible();
		await expect(page).toHaveURL('/home');
		await page.screenshot({ path: testInfo.outputPath('onboarding-bot.png') });
	});

	test.describe('연동 실패', () => {
		test('틀린 코드를 보내면 봇이 남은 시도를 알려주고, 모달은 연동되지 않은 채 코드를 계속 보여준다', async ({
			page,
			request,
		}, testInfo) => {
			const dialog = await openLinkDialog(page);
			const code = (await dialog.getByText(/^\d{6}$/).textContent()) ?? '';
			const wrongCode = code === '000000' ? '999999' : '000000';

			expect(await sendKakaoMessage(request, `e2e-${randomUUID()}`, wrongCode)).toBe(
				'코드가 맞지 않아요. 설정 > 카카오톡 봇 연동에서 받은 6자리 코드를 확인해 주세요. 코드는 발급 후 5분 동안만 쓸 수 있어요. (남은 시도 4번)',
			);

			await page.waitForResponse('**/notifications/kakao-bot/link-status');
			await expect(dialog.getByText(code)).toBeVisible();
			await expect(dialog.getByText('연동 완료!')).toHaveCount(0);
			await page.screenshot({ path: testInfo.outputPath('wrong-code.png') });
		});

		test('5분이 지나면 만료 안내로 바뀌고, 새 코드 받기로 다른 코드를 받는다', async ({ page }, testInfo) => {
			await page.clock.install();
			const dialog = await openLinkDialog(page);
			const firstCode = (await dialog.getByText(/^\d{6}$/).textContent()) ?? '';

			await page.clock.fastForward('05:01');

			await expect(dialog.getByText('코드가 만료됐어요')).toBeVisible();
			await page.screenshot({ path: testInfo.outputPath('expired.png') });

			await dialog.getByRole('button', { name: '새 코드 받기' }).click();
			const secondCode = (await dialog.getByText(/^\d{6}$/).textContent()) ?? '';
			expect(secondCode).not.toBe(firstCode);
		});

		test('코드 발급에 실패하면 다시 시도 안내를 보여주고, 다시 시도로 코드를 받는다', async ({ page }, testInfo) => {
			await page.route('**/notifications/kakao-bot/link-code', (route) => route.fulfill({ status: 500, body: '{}' }));

			const dialog = await openLinkDialog(page);

			await expect(dialog.getByText('코드를 받지 못했어요')).toBeVisible();
			await page.screenshot({ path: testInfo.outputPath('issue-failed.png') });

			await page.unroute('**/notifications/kakao-bot/link-code');
			await dialog.getByRole('button', { name: '다시 시도' }).click();
			await expect(dialog.getByText(/^\d{6}$/)).toBeVisible();
		});
	});
});

test.describe('게스트', () => {
	test.beforeEach(async ({ context }) => {
		userId = await startGuest(context);
	});

	test('설정의 봇 연동 행에 연동하기 대신 로그인 버튼이 보인다', async ({ page }, testInfo) => {
		await page.goto('/settings');
		const linkGroup = page.getByRole('region', { name: '링크 등록' });

		await expect(linkGroup.getByRole('link', { name: '로그인' })).toHaveAttribute('href', '/login');
		await expect(linkGroup.getByRole('button', { name: '연동하기' })).toHaveCount(0);
		await page.screenshot({ path: testInfo.outputPath('guest.png') });
	});
});
