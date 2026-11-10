import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OverlayProvider } from 'overlay-kit';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { KakaoOnboardingCard } from '@/features/kakao-onboarding/ui/kakao-onboarding-card';

import { apiClient } from '@/shared/api/client';

vi.mock('@/shared/api/client', () => ({
	apiClient: { get: vi.fn(), post: vi.fn() },
}));

vi.mock('next/navigation', () => ({
	useSearchParams: () => new URLSearchParams(window.location.search),
}));

const TITLE = '공유 버튼으로 바로 저장하기';
const DAY_MS = 24 * 60 * 60 * 1000;

function mockApi({ kakaoActive = false, botLinked = false, isGuest = false } = {}) {
	const responses: Record<string, unknown> = {
		'auth/me': { id: 'u', email: '', nickname: '테스터', avatarUrl: null, isGuest },
		'notifications/settings': { notificationMethod: 'manual', kakaoStatus: kakaoActive ? 'active' : null },
		'notifications/kakao-bot/link-status': {
			linked: botLinked,
			linkedAt: botLinked ? '2026-11-01T00:00:00Z' : null,
		},
		'notifications/kakao/connect': { url: 'https://kauth.kakao.com/oauth/authorize' },
	};
	vi.mocked(apiClient.get).mockImplementation(((url: string) => ({ json: async () => responses[url] })) as never);
	vi.mocked(apiClient.post).mockReturnValue({
		json: async () => ({ code: '482913', expiresAt: new Date(Date.now() + 300_000).toISOString() }),
	} as never);
}

function renderCard(search: string) {
	window.history.replaceState(null, '', `/home${search}`);
	render(
		<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
			<OverlayProvider>
				<KakaoOnboardingCard />
			</OverlayProvider>
		</QueryClientProvider>,
	);
}

describe('KakaoOnboardingCard', () => {
	afterEach(() => {
		vi.restoreAllMocks();
		vi.useRealTimers();
		window.localStorage.clear();
		window.history.replaceState(null, '', '/home');
	});

	test('봇이 연동돼 있지 않으면 카드를 보여준다', async () => {
		mockApi();
		renderCard('');

		expect(await screen.findByText(TITLE)).toBeInTheDocument();
	});

	test('봇이 연동돼 있으면 카드를 보여주지 않는다', async () => {
		mockApi({ botLinked: true });
		renderCard('');

		await vi.waitFor(() => expect(apiClient.get).toHaveBeenCalledWith('notifications/kakao-bot/link-status'));
		expect(screen.queryByText(TITLE)).not.toBeInTheDocument();
	});

	test('게스트면 카드를 보여주지 않는다', async () => {
		mockApi({ isGuest: true });
		renderCard('');

		await vi.waitFor(() => expect(apiClient.get).toHaveBeenCalledWith('auth/me'));
		expect(screen.queryByText(TITLE)).not.toBeInTheDocument();
	});

	test('카카오 알림이 연동돼 있지 않으면 연동하기가 온보딩용 알림 연동을 시작한다', async () => {
		mockApi();
		renderCard('');
		const startButton = await screen.findByRole('button', { name: '연동하기' });
		await vi.waitFor(() => expect(startButton).not.toHaveAttribute('aria-busy', 'true'));
		const location = { href: 'http://localhost/home' };
		vi.spyOn(window, 'location', 'get').mockReturnValue(location as Location);

		await userEvent.click(startButton);

		await vi.waitFor(() =>
			expect(apiClient.get).toHaveBeenCalledWith('notifications/kakao/connect', {
				searchParams: { from: 'onboarding' },
			}),
		);
	});

	test('알림은 연동돼 있고 봇이 아니면 연동하기가 봇 코드 모달을 연다', async () => {
		mockApi({ kakaoActive: true });
		renderCard('');

		await userEvent.click(await screen.findByRole('button', { name: '연동하기' }));

		expect(await screen.findAllByText('482913')).not.toHaveLength(0);
	});

	test('알림 동의에서 돌아오면(onboarding=bot) 봇이 미연동일 때 모달을 바로 연다', async () => {
		mockApi({ kakaoActive: true });
		renderCard('?onboarding=bot');

		expect(await screen.findAllByText('482913')).not.toHaveLength(0);
		expect(window.location.search).toBe('');
	});

	test('onboarding=bot이어도 봇이 이미 연동돼 있으면 모달을 열지 않는다', async () => {
		mockApi({ kakaoActive: true, botLinked: true });
		renderCard('?onboarding=bot');

		await vi.waitFor(() => expect(apiClient.get).toHaveBeenCalledWith('notifications/kakao-bot/link-status'));
		expect(apiClient.post).not.toHaveBeenCalled();
	});

	test('나중에를 누르면 카드가 사라지고 7일 동안 다시 뜨지 않는다', async () => {
		mockApi();
		renderCard('');

		await userEvent.click(await screen.findByRole('button', { name: '나중에' }));
		expect(screen.queryByText(TITLE)).not.toBeInTheDocument();

		cleanup();
		vi.useFakeTimers({ shouldAdvanceTime: true });
		vi.setSystemTime(Date.now() + 6 * DAY_MS);
		renderCard('');
		await vi.waitFor(() => expect(apiClient.get).toHaveBeenCalledWith('notifications/kakao-bot/link-status'));
		expect(screen.queryByText(TITLE)).not.toBeInTheDocument();

		cleanup();
		vi.setSystemTime(Date.now() + 2 * DAY_MS);
		renderCard('');
		expect(await screen.findByText(TITLE)).toBeInTheDocument();
	});
});
