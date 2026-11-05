import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';

import { deleteUser, sendKakaoMessage, signIn } from './support';

let userId: string;

test.beforeEach(async ({ context }) => {
	userId = await signIn(context);
});

test.afterEach(async () => {
	await deleteUser(userId);
});

test('설정에서 봇을 연동하고, 봇으로 보낸 링크가 카카오톡으로 등록 폴더에 저장된다', async ({
	page,
	request,
}, testInfo) => {
	const botUserKey = `e2e-${randomUUID()}`;

	await page.goto('/settings');
	const linkGroup = page.getByRole('region', { name: '링크 등록' });
	await linkGroup.getByRole('button', { name: '연동하기' }).click();

	const dialog = page.getByRole('dialog');
	const code = (await dialog.getByText(/^\d{6}$/).textContent()) ?? '';
	expect(await dialog.getByText(/남음$/).textContent()).toMatch(/^(5:00|[0-4]:[0-5]\d) 남음$/);
	await page.screenshot({ path: testInfo.outputPath('1-code-dialog.png') });

	expect(await sendKakaoMessage(request, botUserKey, code)).toBe('연동됐어요! 이제 링크를 보내면 저장해 드려요');
	await expect(dialog.getByText('연동 완료!')).toBeVisible();
	await page.screenshot({ path: testInfo.outputPath('2-linked.png') });

	await dialog.getByRole('button', { name: '확인' }).click();
	await expect(linkGroup.getByText('연동됨')).toBeVisible();

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
