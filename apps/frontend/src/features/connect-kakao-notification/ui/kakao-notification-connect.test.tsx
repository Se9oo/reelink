import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SnackbarProvider } from 'seed-design/ui/snackbar';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { KakaoNotificationConnect } from '@/features/connect-kakao-notification/ui/kakao-notification-connect';

import { NotificationSettings } from '@/entities/notification/model/types';

import { apiClient } from '@/shared/api/client';

vi.mock('@/shared/api/client', () => ({
	apiClient: { get: vi.fn(), patch: vi.fn() },
}));

const AUTHORIZE_URL = 'https://kauth.kakao.com/oauth/authorize?scope=talk_message';

function mockApi(settings: NotificationSettings) {
	vi.mocked(apiClient.get).mockImplementation(((url: string) => ({
		json: async () => (url === 'notifications/kakao/connect' ? { url: AUTHORIZE_URL } : settings),
	})) as never);
}

function renderConnect() {
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

	render(
		<QueryClientProvider client={queryClient}>
			<SnackbarProvider>
				<KakaoNotificationConnect />
			</SnackbarProvider>
		</QueryClientProvider>,
	);
}

describe('KakaoNotificationConnect', () => {
	afterEach(() => {
		window.history.replaceState(null, '', '/settings');
	});

	test('연동한 적이 없으면 토글 없이 연동하기 버튼을 보여준다.', async () => {
		mockApi({ notificationMethod: 'manual', kakaoStatus: null });
		renderConnect();

		expect(await screen.findByRole('button', { name: '연동하기' })).toBeInTheDocument();
		expect(screen.queryByRole('switch')).not.toBeInTheDocument();
	});

	test('연동이 끊겼으면 토글 없이 다시 연동하기 버튼을 보여준다.', async () => {
		mockApi({ notificationMethod: 'kakao', kakaoStatus: 'revoked' });
		renderConnect();

		expect(await screen.findByRole('button', { name: '다시 연동하기' })).toBeInTheDocument();
		expect(screen.queryByRole('switch')).not.toBeInTheDocument();
	});

	test('연동돼 있고 알림이 켜져 있으면 켜진 토글을 보여준다.', async () => {
		mockApi({ notificationMethod: 'kakao', kakaoStatus: 'active' });
		renderConnect();

		expect(await screen.findByRole('switch', { name: '카카오톡 알림 받기' })).toBeChecked();
		expect(screen.queryByRole('button')).not.toBeInTheDocument();
	});

	test('연동돼 있고 알림이 꺼져 있으면 꺼진 토글을 보여준다.', async () => {
		mockApi({ notificationMethod: 'manual', kakaoStatus: 'active' });
		renderConnect();

		expect(await screen.findByRole('switch', { name: '카카오톡 알림 받기' })).not.toBeChecked();
	});

	test('토글을 끄면 알림 방법을 manual로 바꾼다.', async () => {
		mockApi({ notificationMethod: 'kakao', kakaoStatus: 'active' });
		vi.mocked(apiClient.patch).mockReturnValue({
			json: async () => ({ notificationMethod: 'manual', kakaoStatus: 'active' }),
		} as never);
		renderConnect();

		const toggle = await screen.findByRole('switch', { name: '카카오톡 알림 받기' });
		await userEvent.click(toggle);

		expect(apiClient.patch).toHaveBeenCalledWith('notifications/settings', { json: { notificationMethod: 'manual' } });
		await vi.waitFor(() => expect(toggle).not.toBeChecked());
	});

	test('토글을 켜면 알림 방법을 kakao로 바꾼다.', async () => {
		mockApi({ notificationMethod: 'manual', kakaoStatus: 'active' });
		vi.mocked(apiClient.patch).mockReturnValue({
			json: async () => ({ notificationMethod: 'kakao', kakaoStatus: 'active' }),
		} as never);
		renderConnect();

		const toggle = await screen.findByRole('switch', { name: '카카오톡 알림 받기' });
		await userEvent.click(toggle);

		expect(apiClient.patch).toHaveBeenCalledWith('notifications/settings', { json: { notificationMethod: 'kakao' } });
		await vi.waitFor(() => expect(toggle).toBeChecked());
	});

	test('토글 변경이 실패하면 실패 스낵바를 띄우고 서버의 실제 상태를 다시 보여준다.', async () => {
		mockApi({ notificationMethod: 'manual', kakaoStatus: 'active' });
		vi.mocked(apiClient.patch).mockReturnValue({
			json: async () => {
				throw new Error('400');
			},
		} as never);
		renderConnect();

		const toggle = await screen.findByRole('switch', { name: '카카오톡 알림 받기' });
		mockApi({ notificationMethod: 'kakao', kakaoStatus: 'revoked' });
		await userEvent.click(toggle);

		expect(await screen.findByText('알림 설정을 바꾸지 못했어요. 다시 시도해주세요')).toBeInTheDocument();
		expect(await screen.findByRole('button', { name: '다시 연동하기' })).toBeInTheDocument();
	});

	test('연동하기를 누르면 카카오 동의 화면으로 이동한다.', async () => {
		mockApi({ notificationMethod: 'manual', kakaoStatus: null });
		const location = { href: 'http://localhost/settings' };
		vi.spyOn(window, 'location', 'get').mockReturnValue(location as Location);
		renderConnect();

		await userEvent.click(await screen.findByRole('button', { name: '연동하기' }));

		await vi.waitFor(() => expect(location.href).toBe(AUTHORIZE_URL));
		vi.restoreAllMocks();
	});

	test('연동 결과로 돌아오면 결과 스낵바를 띄우고 주소에서 결과 값을 지운다.', async () => {
		mockApi({ notificationMethod: 'kakao', kakaoStatus: 'active' });
		window.history.replaceState(null, '', '/settings?kakao=connected');
		renderConnect();

		expect(await screen.findByText('카카오 알림을 연동했어요')).toBeInTheDocument();
		expect(window.location.search).toBe('');
	});
});
