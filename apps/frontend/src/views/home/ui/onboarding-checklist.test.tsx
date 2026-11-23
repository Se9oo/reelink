import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OverlayProvider } from 'overlay-kit';
import { SnackbarProvider } from 'seed-design/ui/snackbar';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { OnboardingChecklist } from '@/views/home/ui/onboarding-checklist';

import { getBrowserSubscription, turnOnWebPush } from '@/features/web-push-notification/lib/browser-push';
import type { PushEnvironment } from '@/features/web-push-notification/lib/push-environment';

import { apiClient } from '@/shared/api/client';
import { promptInstall } from '@/shared/lib/install-prompt';

const device = vi.hoisted(() => ({ environment: 'desktop' as PushEnvironment, canPromptInstall: true }));

vi.mock('@/shared/api/client', () => ({
	apiClient: { get: vi.fn(), post: vi.fn() },
}));

vi.mock('@/features/web-push-notification/lib/push-environment', async (importOriginal) => ({
	...(await importOriginal<object>()),
	usePushEnvironment: () => device.environment,
}));

vi.mock('@/features/web-push-notification/lib/browser-push', () => ({
	browserPushSubscriptionKey: ['browser-push-subscription'],
	getBrowserSubscription: vi.fn(),
	turnOnWebPush: vi.fn(),
	PushPermissionDeniedError: class extends Error {},
}));

vi.mock('@/shared/lib/install-prompt', () => ({
	useCanPromptInstall: () => device.canPromptInstall,
	promptInstall: vi.fn(),
}));

const TITLE = 'Reelink 시작하기';
const DAY_MS = 24 * 60 * 60 * 1000;
const UA = {
	android: 'Mozilla/5.0 (Linux; Android 14) Chrome/130',
	ios: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)',
	desktop: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/130',
};

function setup({
	platform = 'desktop' as keyof typeof UA,
	environment = 'desktop' as PushEnvironment,
	botLinked = false,
	subscribed = false,
	isGuest = false,
	canPromptInstall = true,
} = {}) {
	vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(UA[platform]);
	device.environment = environment;
	device.canPromptInstall = canPromptInstall;

	const responses: Record<string, unknown> = {
		'auth/me': { id: 'u', email: '', nickname: '테스터', avatarUrl: null, isGuest },
		'notifications/kakao-bot/link-status': {
			linked: botLinked,
			linkedAt: botLinked ? '2026-11-01T00:00:00Z' : null,
		},
	};
	vi.mocked(apiClient.get).mockImplementation(((url: string) => ({ json: async () => responses[url] })) as never);
	vi.mocked(apiClient.post).mockReturnValue({
		json: async () => ({ code: '482913', expiresAt: new Date(Date.now() + 300_000).toISOString() }),
	} as never);
	vi.mocked(getBrowserSubscription).mockResolvedValue(subscribed ? ({ endpoint: 'e' } as PushSubscription) : null);
	vi.mocked(turnOnWebPush).mockResolvedValue({ endpoint: 'e' } as PushSubscription);
}

function renderCard() {
	render(
		<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
			<SnackbarProvider>
				<OverlayProvider>
					<OnboardingChecklist />
				</OverlayProvider>
			</SnackbarProvider>
		</QueryClientProvider>,
	);
}

describe('OnboardingChecklist', () => {
	beforeEach(() => {
		vi.mocked(promptInstall).mockReset();
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.useRealTimers();
		window.localStorage.clear();
	});

	test('게스트 안드로이드에는 설치하기와 알림 로그인 안내를 보여준다', async () => {
		setup({ isGuest: true, platform: 'android', environment: 'install-required' });
		renderCard();

		expect(await screen.findByRole('button', { name: '설치하기' })).toBeInTheDocument();
		expect(screen.getByRole('link', { name: '로그인' })).toHaveAttribute('href', '/login');
	});

	test('게스트 데스크톱에는 봇 연동 없이 알림 로그인 안내만 보여준다', async () => {
		setup({ isGuest: true });
		renderCard();

		expect(await screen.findByRole('link', { name: '로그인' })).toBeInTheDocument();
		expect(screen.getByText('로그인하면 알림을 받을 수 있어요')).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: '연동하기' })).not.toBeInTheDocument();
	});

	test('저장과 알림이 모두 끝났으면 카드를 보여주지 않는다', async () => {
		setup({ botLinked: true, subscribed: true });
		renderCard();

		await vi.waitFor(() => expect(getBrowserSubscription).toHaveBeenCalled());
		expect(screen.queryByText(TITLE)).not.toBeInTheDocument();
	});

	test('안드로이드 브라우저 탭에서는 설치하기가 설치 창을 띄우고, 알림은 설치 후로 안내한다', async () => {
		setup({ platform: 'android', environment: 'install-required' });
		renderCard();

		await userEvent.click(await screen.findByRole('button', { name: '설치하기' }));

		expect(promptInstall).toHaveBeenCalled();
		expect(screen.getByText('설치 후 켤 수 있어요')).toBeInTheDocument();
	});

	test('안드로이드에서 설치 창을 띄울 수 없으면 크롬 메뉴로 안내한다', async () => {
		setup({ platform: 'android', environment: 'install-required', canPromptInstall: false });
		renderCard();

		expect(await screen.findByText('크롬 메뉴(⋮)에서 홈 화면에 추가 → 설치를 눌러주세요')).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: '설치하기' })).not.toBeInTheDocument();
	});

	test('아이폰에서는 연동하기가 카카오 알림 동의 없이 봇 코드 모달을 연다', async () => {
		setup({ platform: 'ios', environment: 'install-required' });
		renderCard();

		await userEvent.click(await screen.findByRole('button', { name: '연동하기' }));

		expect(await screen.findAllByText('482913')).not.toHaveLength(0);
		expect(vi.mocked(apiClient.get).mock.calls.map(([url]) => url)).not.toContain('notifications/kakao/connect');
	});

	test('아이폰 사파리 탭에서 방법 보기를 누르면 홈 화면에 추가하는 법을 보여준다', async () => {
		setup({ platform: 'ios', environment: 'install-required' });
		renderCard();

		await userEvent.click(await screen.findByRole('button', { name: '방법 보기' }));

		expect(await screen.findByText('홈 화면에 추가하고 알림 받기')).toBeInTheDocument();
	});

	test('켜기를 눌러 알림을 켜면 남은 할 일이 없어 카드가 사라진다', async () => {
		setup({ botLinked: true });
		renderCard();

		await userEvent.click(await screen.findByRole('button', { name: '켜기' }));

		expect(turnOnWebPush).toHaveBeenCalled();
		await vi.waitFor(() => expect(screen.queryByText(TITLE)).not.toBeInTheDocument());
	});

	test('나중에를 누르면 카드가 사라지고 7일 동안 다시 뜨지 않는다', async () => {
		setup();
		renderCard();

		await userEvent.click(await screen.findByRole('button', { name: '나중에' }));
		expect(screen.queryByText(TITLE)).not.toBeInTheDocument();

		cleanup();
		vi.useFakeTimers({ shouldAdvanceTime: true });
		vi.setSystemTime(Date.now() + 6 * DAY_MS);
		renderCard();
		await vi.waitFor(() => expect(apiClient.get).toHaveBeenCalledWith('notifications/kakao-bot/link-status'));
		expect(screen.queryByText(TITLE)).not.toBeInTheDocument();

		cleanup();
		vi.setSystemTime(Date.now() + 2 * DAY_MS);
		renderCard();
		expect(await screen.findByText(TITLE)).toBeInTheDocument();
	});
});
