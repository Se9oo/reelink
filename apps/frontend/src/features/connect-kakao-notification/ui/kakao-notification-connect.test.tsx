import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SnackbarProvider } from 'seed-design/ui/snackbar';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { KakaoNotificationConnect } from '@/features/connect-kakao-notification/ui/kakao-notification-connect';

import { NotificationSettings } from '@/entities/notification/model/types';

import { apiClient } from '@/shared/api/client';

vi.mock('@/shared/api/client', () => ({
	apiClient: { get: vi.fn() },
}));

const AUTHORIZE_URL = 'https://kauth.kakao.com/oauth/authorize?scope=talk_message';

function mockApi(kakaoStatus: NotificationSettings['kakaoStatus']) {
	vi.mocked(apiClient.get).mockImplementation(((url: string) => ({
		json: async () =>
			url === 'notifications/kakao/connect' ? { url: AUTHORIZE_URL } : { notificationMethod: 'manual', kakaoStatus },
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

	test('연동한 적이 없으면 연동하기 버튼을 보여준다.', async () => {
		mockApi(null);
		renderConnect();

		expect(await screen.findByRole('button', { name: '연동하기' })).toBeInTheDocument();
	});

	test('연동이 끊겼으면 다시 연동하기 버튼을 보여준다.', async () => {
		mockApi('revoked');
		renderConnect();

		expect(await screen.findByRole('button', { name: '다시 연동하기' })).toBeInTheDocument();
	});

	test('연동돼 있으면 버튼 대신 연동됨을 보여준다.', async () => {
		mockApi('active');
		renderConnect();

		expect(await screen.findByText('연동됨')).toBeInTheDocument();
		expect(screen.queryByRole('button')).not.toBeInTheDocument();
	});

	test('연동하기를 누르면 카카오 동의 화면으로 이동한다.', async () => {
		mockApi(null);
		const location = { href: 'http://localhost/settings' };
		vi.spyOn(window, 'location', 'get').mockReturnValue(location as Location);
		renderConnect();

		await userEvent.click(await screen.findByRole('button', { name: '연동하기' }));

		await vi.waitFor(() => expect(location.href).toBe(AUTHORIZE_URL));
		vi.restoreAllMocks();
	});

	test('연동 결과로 돌아오면 결과 스낵바를 띄우고 주소에서 결과 값을 지운다.', async () => {
		mockApi('active');
		window.history.replaceState(null, '', '/settings?kakao=connected');
		renderConnect();

		expect(await screen.findByText('카카오 알림을 연동했어요')).toBeInTheDocument();
		expect(window.location.search).toBe('');
	});
});
