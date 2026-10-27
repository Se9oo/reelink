import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';

import { KakaoRevokedBanner } from '@/features/connect-kakao-notification/ui/kakao-revoked-banner';

import { NotificationSettings } from '@/entities/notification/model/types';

import { apiClient } from '@/shared/api/client';

vi.mock('@/shared/api/client', () => ({
	apiClient: { get: vi.fn(), patch: vi.fn() },
}));

function mockSettings(settings: NotificationSettings) {
	vi.mocked(apiClient.get).mockImplementation(((url: string) => ({
		json: async () => (url === 'notifications/kakao/connect' ? { url: 'https://kauth.kakao.com/x' } : settings),
	})) as never);
}

function renderBanner() {
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

	render(
		<QueryClientProvider client={queryClient}>
			<KakaoRevokedBanner />
		</QueryClientProvider>,
	);
}

describe('KakaoRevokedBanner', () => {
	test('카카오 알림을 쓰는데 연동이 끊겼으면 배너를 보여준다.', async () => {
		mockSettings({ notificationMethod: 'kakao', kakaoStatus: 'revoked' });
		renderBanner();

		expect(await screen.findByText('카카오 알림 연동이 끊어졌어요')).toBeInTheDocument();
	});

	test('연동이 정상이면 배너를 보여주지 않는다.', async () => {
		mockSettings({ notificationMethod: 'kakao', kakaoStatus: 'active' });
		renderBanner();

		await vi.waitFor(() => expect(apiClient.get).toHaveBeenCalled());
		expect(screen.queryByText('카카오 알림 연동이 끊어졌어요')).not.toBeInTheDocument();
	});

	test('알림을 끈 사용자에게는 연동이 끊겼어도 배너를 보여주지 않는다.', async () => {
		mockSettings({ notificationMethod: 'manual', kakaoStatus: 'revoked' });
		renderBanner();

		await vi.waitFor(() => expect(apiClient.get).toHaveBeenCalled());
		expect(screen.queryByText('카카오 알림 연동이 끊어졌어요')).not.toBeInTheDocument();
	});

	test('알림 끄기를 누르면 알림 방법을 manual로 바꾸고 배너가 사라진다.', async () => {
		mockSettings({ notificationMethod: 'kakao', kakaoStatus: 'revoked' });
		vi.mocked(apiClient.patch).mockReturnValue({
			json: async () => ({ notificationMethod: 'manual', kakaoStatus: 'revoked' }),
		} as never);
		renderBanner();

		await userEvent.click(await screen.findByRole('button', { name: '알림 끄기' }));

		expect(apiClient.patch).toHaveBeenCalledWith('notifications/settings', { json: { notificationMethod: 'manual' } });
		await vi.waitFor(() => expect(screen.queryByText('카카오 알림 연동이 끊어졌어요')).not.toBeInTheDocument());
	});

	test('다시 연동하기를 누르면 카카오 동의 화면으로 이동한다.', async () => {
		mockSettings({ notificationMethod: 'kakao', kakaoStatus: 'revoked' });
		const location = { href: 'http://localhost/home' };
		vi.spyOn(window, 'location', 'get').mockReturnValue(location as Location);
		renderBanner();

		await userEvent.click(await screen.findByRole('button', { name: '다시 연동하기' }));

		await vi.waitFor(() => expect(location.href).toBe('https://kauth.kakao.com/x'));
		vi.restoreAllMocks();
	});
});
