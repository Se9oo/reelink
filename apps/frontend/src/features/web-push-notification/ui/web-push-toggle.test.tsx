import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SnackbarProvider } from 'seed-design/ui/snackbar';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { PushEnvironment } from '@/features/web-push-notification/lib/push-environment';
import { WebPushDescription, WebPushToggle } from '@/features/web-push-notification/ui/web-push-toggle';

import { apiClient } from '@/shared/api/client';

vi.mock('@/shared/api/client', () => ({
	apiClient: { get: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

const { environment } = vi.hoisted(() => ({ environment: { current: 'desktop' as PushEnvironment } }));

vi.mock('@/features/web-push-notification/lib/push-environment', async (importOriginal) => ({
	...(await importOriginal<object>()),
	usePushEnvironment: () => environment.current,
}));

const ENDPOINT = 'https://fcm.googleapis.com/fcm/send/abc';

function fakeSubscription() {
	return {
		endpoint: ENDPOINT,
		toJSON: () => ({ endpoint: ENDPOINT, keys: { p256dh: 'p', auth: 'a' } }),
		unsubscribe: vi.fn(async () => true),
	};
}

function stubBrowser({
	existing = null,
	permission = 'granted',
}: { existing?: ReturnType<typeof fakeSubscription> | null; permission?: NotificationPermission } = {}) {
	const created = fakeSubscription();
	const registration = {
		pushManager: { getSubscription: vi.fn(async () => existing), subscribe: vi.fn(async () => created) },
	};

	vi.stubGlobal('Notification', { permission, requestPermission: vi.fn(async () => permission) });
	Object.defineProperty(navigator, 'serviceWorker', {
		configurable: true,
		value: {
			register: vi.fn(async () => registration),
			getRegistration: vi.fn(async () => registration),
			ready: Promise.resolve(registration),
		},
	});

	return { registration, created };
}

function renderToggle({ isGuest = false } = {}) {
	vi.mocked(apiClient.get).mockReturnValue({
		json: async () => ({ id: 'u', email: '', nickname: '테스터', avatarUrl: null, isGuest }),
	} as never);
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

	render(
		<QueryClientProvider client={queryClient}>
			<SnackbarProvider>
				<WebPushDescription />
				<WebPushToggle />
			</SnackbarProvider>
		</QueryClientProvider>,
	);
}

describe('WebPushToggle', () => {
	beforeEach(() => {
		environment.current = 'desktop';
		vi.mocked(apiClient.put).mockResolvedValue(new Response(null, { status: 204 }) as never);
		vi.mocked(apiClient.delete).mockResolvedValue(new Response(null, { status: 204 }) as never);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.clearAllMocks();
	});

	test('데스크톱은 브라우저가 켜져 있을 때만 알림이 온다고 안내한다.', async () => {
		stubBrowser();
		renderToggle();

		expect(await screen.findByText('브라우저가 켜져 있을 때만 알림이 와요')).toBeInTheDocument();
	});

	test('휴대폰, 태블릿 브라우저 탭에서는 토글 대신 홈 화면 추가를 안내한다.', async () => {
		environment.current = 'install-required';
		renderToggle();

		expect(await screen.findByText('홈 화면에 추가하면 알림을 받을 수 있어요')).toBeInTheDocument();
		expect(screen.queryByRole('switch')).not.toBeInTheDocument();
	});

	test('게스트면 토글 대신 로그인 화면 링크를 보여준다.', async () => {
		stubBrowser();
		renderToggle({ isGuest: true });

		expect(await screen.findByRole('link', { name: '로그인' })).toHaveAttribute('href', '/login');
		expect(screen.queryByRole('switch')).not.toBeInTheDocument();
	});

	test('이 브라우저에 구독이 있으면 켜진 토글을 보여준다.', async () => {
		stubBrowser({ existing: fakeSubscription() });
		renderToggle();

		await vi.waitFor(() => expect(screen.getByRole('switch', { name: '이 기기에서 알림 받기' })).toBeChecked());
	});

	test('토글을 켜면 브라우저 구독을 만들어 서버에 저장한다.', async () => {
		const { registration } = stubBrowser();
		renderToggle();

		const toggle = await screen.findByRole('switch', { name: '이 기기에서 알림 받기' });
		await vi.waitFor(() => expect(toggle).toBeEnabled());
		await userEvent.click(toggle);

		await vi.waitFor(() => expect(toggle).toBeChecked());
		expect(registration.pushManager.subscribe).toHaveBeenCalledWith(expect.objectContaining({ userVisibleOnly: true }));
		expect(apiClient.put).toHaveBeenCalledWith('notifications/push/subscription', {
			json: { endpoint: ENDPOINT, keys: { p256dh: 'p', auth: 'a' } },
		});
	});

	test('알림 권한을 거절하면 구독하지 않고 브라우저 설정을 안내한다.', async () => {
		const { registration } = stubBrowser({ permission: 'denied' });
		renderToggle();

		const toggle = await screen.findByRole('switch', { name: '이 기기에서 알림 받기' });
		await vi.waitFor(() => expect(toggle).toBeEnabled());
		await userEvent.click(toggle);

		expect(await screen.findByText('브라우저 설정에서 알림을 허용해주세요')).toBeInTheDocument();
		expect(registration.pushManager.subscribe).not.toHaveBeenCalled();
		expect(toggle).not.toBeChecked();
	});

	test('서버 저장이 실패하면 만든 브라우저 구독을 되돌린다.', async () => {
		const { created } = stubBrowser();
		vi.mocked(apiClient.put).mockRejectedValue(new Error('500'));
		renderToggle();

		const toggle = await screen.findByRole('switch', { name: '이 기기에서 알림 받기' });
		await vi.waitFor(() => expect(toggle).toBeEnabled());
		await userEvent.click(toggle);

		expect(await screen.findByText('알림 설정을 바꾸지 못했어요. 다시 시도해주세요')).toBeInTheDocument();
		expect(created.unsubscribe).toHaveBeenCalled();
		expect(toggle).not.toBeChecked();
	});

	test('토글을 끄면 서버에서 지우고 브라우저 구독을 해지한다.', async () => {
		const existing = fakeSubscription();
		stubBrowser({ existing });
		renderToggle();

		const toggle = await screen.findByRole('switch', { name: '이 기기에서 알림 받기' });
		await vi.waitFor(() => expect(toggle).toBeChecked());
		await userEvent.click(toggle);

		await vi.waitFor(() => expect(toggle).not.toBeChecked());
		expect(apiClient.delete).toHaveBeenCalledWith('notifications/push/subscription', {
			json: { endpoint: ENDPOINT },
		});
		expect(existing.unsubscribe).toHaveBeenCalled();
	});

	test('끌 때 브라우저 구독 해지가 실패하면 서버 구독은 지우지 않고 토글을 켜진 채로 둔다.', async () => {
		const existing = fakeSubscription();
		existing.unsubscribe.mockRejectedValue(new Error('unsubscribe failed'));
		stubBrowser({ existing });
		renderToggle();

		const toggle = await screen.findByRole('switch', { name: '이 기기에서 알림 받기' });
		await vi.waitFor(() => expect(toggle).toBeChecked());
		await userEvent.click(toggle);

		expect(await screen.findByText('알림 설정을 바꾸지 못했어요. 다시 시도해주세요')).toBeInTheDocument();
		expect(apiClient.delete).not.toHaveBeenCalled();
		expect(toggle).toBeChecked();
	});

	test('끌 때 서버 삭제가 실패해도 브라우저 구독은 해지됐으니 토글을 끈다.', async () => {
		const existing = fakeSubscription();
		stubBrowser({ existing });
		vi.mocked(apiClient.delete).mockRejectedValue(new Error('500'));
		renderToggle();

		const toggle = await screen.findByRole('switch', { name: '이 기기에서 알림 받기' });
		await vi.waitFor(() => expect(toggle).toBeChecked());
		await userEvent.click(toggle);

		await vi.waitFor(() => expect(toggle).not.toBeChecked());
		expect(existing.unsubscribe).toHaveBeenCalled();
	});

	test('브라우저 구독을 확인하지 못하면 구독이 없는 것으로 보고 토글을 켤 수 있게 둔다.', async () => {
		const { registration } = stubBrowser();
		registration.pushManager.getSubscription.mockRejectedValue(new Error('broken registration'));
		renderToggle();

		const toggle = await screen.findByRole('switch', { name: '이 기기에서 알림 받기' });

		await vi.waitFor(() => expect(toggle).toBeEnabled());
		expect(toggle).not.toBeChecked();
	});
});
