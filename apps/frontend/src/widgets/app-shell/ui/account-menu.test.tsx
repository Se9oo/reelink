import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OverlayProvider } from 'overlay-kit';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { AccountMenu } from '@/widgets/app-shell/ui/account-menu';

import { PushEnvironment } from '@/features/web-push-notification/lib/push-environment';

import { User } from '@/entities/user/model/types';

import { apiClient } from '@/shared/api/client';

vi.mock('@/shared/api/client', () => ({
	apiClient: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));

const { mockPush, push } = vi.hoisted(() => ({
	mockPush: vi.fn(),
	push: {
		environment: 'desktop' as PushEnvironment,
		subscription: null as { endpoint: string; unsubscribe: () => Promise<boolean> } | null,
	},
}));

vi.mock('next/navigation', () => ({
	useRouter: () => ({ push: mockPush }),
}));

vi.mock('@/features/web-push-notification/lib/push-environment', async (importOriginal) => ({
	...(await importOriginal<object>()),
	readPushEnvironment: () => push.environment,
}));

vi.mock('@/features/web-push-notification/lib/browser-push', async (importOriginal) => ({
	...(await importOriginal<object>()),
	getBrowserSubscription: async () => push.subscription,
}));

function renderMenu(me: User) {
	vi.mocked(apiClient.get).mockReturnValue({ json: async () => me } as never);

	render(
		<QueryClientProvider client={new QueryClient()}>
			<OverlayProvider>
				<AccountMenu />
			</OverlayProvider>
		</QueryClientProvider>,
	);
}

async function clickLogout() {
	await userEvent.click(await screen.findByRole('button', { name: /테스터/ }));
	await userEvent.click(await screen.findByRole('menuitem', { name: '로그아웃' }));
}

const user: User = { id: 'u', email: 'a@test.com', nickname: '테스터', avatarUrl: null, isGuest: false };

describe('AccountMenu', () => {
	beforeEach(() => {
		mockPush.mockClear();
		vi.mocked(apiClient.post)
			.mockClear()
			.mockResolvedValue(new Response() as never);
		vi.mocked(apiClient.delete)
			.mockClear()
			.mockResolvedValue(new Response() as never);
		push.environment = 'desktop';
		push.subscription = null;
	});

	describe('로그아웃', () => {
		const subscribed = () => ({
			endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
			unsubscribe: vi.fn(async () => true),
		});

		test('이 브라우저에 알림 구독이 없으면 확인 없이 바로 로그아웃한다', async () => {
			renderMenu(user);
			await clickLogout();

			await vi.waitFor(() => expect(apiClient.post).toHaveBeenCalledWith('auth/logout'));
			expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
		});

		test('휴대폰, 태블릿은 구독이 있어도 바로 로그아웃한다', async () => {
			push.environment = 'mobile';
			push.subscription = subscribed();
			renderMenu(user);
			await clickLogout();

			await vi.waitFor(() => expect(apiClient.post).toHaveBeenCalledWith('auth/logout'));
			expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
		});

		test('데스크톱에서 구독이 있으면 확인 창을 띄우고, 로그아웃만 누르면 구독은 그대로 둔다', async () => {
			const subscription = subscribed();
			push.subscription = subscription;
			renderMenu(user);
			await clickLogout();

			expect(await screen.findByText('이 기기로 알림이 계속 와요')).toBeInTheDocument();
			expect(apiClient.post).not.toHaveBeenCalled();
			await userEvent.click(screen.getByRole('button', { name: '로그아웃만' }));

			await vi.waitFor(() => expect(apiClient.post).toHaveBeenCalledWith('auth/logout'));
			expect(apiClient.delete).not.toHaveBeenCalled();
			expect(subscription.unsubscribe).not.toHaveBeenCalled();
		});

		test('알림 끄고 로그아웃을 누르면 구독을 지운 뒤 로그아웃한다', async () => {
			const subscription = subscribed();
			push.subscription = subscription;
			renderMenu(user);
			await clickLogout();

			await userEvent.click(await screen.findByRole('button', { name: '알림 끄고 로그아웃' }));

			await vi.waitFor(() => expect(apiClient.post).toHaveBeenCalledWith('auth/logout'));
			expect(apiClient.delete).toHaveBeenCalledWith('notifications/push/subscription', {
				json: { endpoint: subscription.endpoint },
			});
			expect(subscription.unsubscribe).toHaveBeenCalled();
		});
	});

	test('로그인 사용자는 메뉴에 로그아웃이 있다', async () => {
		renderMenu(user);

		await userEvent.click(await screen.findByRole('button', { name: /테스터/ }));

		expect(await screen.findByRole('menuitem', { name: '로그아웃' })).toBeInTheDocument();
		expect(screen.queryByRole('menuitem', { name: '로그인' })).not.toBeInTheDocument();
	});

	test('게스트는 로그아웃 대신 로그인이 있고, 누르면 로그인 화면으로 간다', async () => {
		renderMenu({ ...user, nickname: '게스트', isGuest: true });

		await userEvent.click(await screen.findByRole('button', { name: /게스트/ }));
		expect(screen.queryByRole('menuitem', { name: '로그아웃' })).not.toBeInTheDocument();
		await userEvent.click(await screen.findByRole('menuitem', { name: '로그인' }));

		expect(mockPush).toHaveBeenCalledWith('/login');
	});
});
