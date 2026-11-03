import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { AccountMenu } from '@/widgets/app-shell/ui/account-menu';

import { User } from '@/entities/user/model/types';

import { apiClient } from '@/shared/api/client';

vi.mock('@/shared/api/client', () => ({
	apiClient: { get: vi.fn(), post: vi.fn() },
}));

const { mockPush } = vi.hoisted(() => ({ mockPush: vi.fn() }));

vi.mock('next/navigation', () => ({
	useRouter: () => ({ push: mockPush }),
}));

function renderMenu(me: User) {
	vi.mocked(apiClient.get).mockReturnValue({ json: async () => me } as never);

	render(
		<QueryClientProvider client={new QueryClient()}>
			<AccountMenu />
		</QueryClientProvider>,
	);
}

const user: User = { id: 'u', email: 'a@test.com', nickname: '세현', avatarUrl: null, isGuest: false };

describe('AccountMenu', () => {
	beforeEach(() => {
		mockPush.mockClear();
	});

	test('로그인 사용자는 메뉴에 로그아웃이 있다', async () => {
		renderMenu(user);

		await userEvent.click(await screen.findByRole('button', { name: /세현/ }));

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
