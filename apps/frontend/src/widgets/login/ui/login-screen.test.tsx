import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';

import { LoginScreen } from '@/widgets/login/ui/login-screen';

import { apiClient } from '@/shared/api/client';
import { API_URL } from '@/shared/config/env';

vi.mock('@/shared/api/client', () => ({
	apiClient: { post: vi.fn() },
}));

const { mockPush } = vi.hoisted(() => ({ mockPush: vi.fn() }));

vi.mock('next/navigation', () => ({
	useRouter: () => ({ push: mockPush }),
}));

function renderLogin() {
	render(
		<QueryClientProvider client={new QueryClient()}>
			<LoginScreen />
		</QueryClientProvider>,
	);
}

describe('LoginScreen', () => {
	test('구글 로그인 링크를 올바른 주소로 렌더링한다', () => {
		renderLogin();
		const link = screen.getByRole('link', { name: 'Google로 시작하기' });
		expect(link).toHaveAttribute('href', `${API_URL}/auth/google`);
	});

	test('깃허브 로그인 링크를 올바른 주소로 렌더링한다', () => {
		renderLogin();
		const link = screen.getByRole('link', { name: 'GitHub로 시작하기' });
		expect(link).toHaveAttribute('href', `${API_URL}/auth/github`);
	});

	test('Guest로 시작하기를 누르면 게스트 세션을 만들고 홈으로 이동한다', async () => {
		vi.mocked(apiClient.post).mockResolvedValue(new Response(null, { status: 204 }) as never);
		renderLogin();

		await userEvent.click(screen.getByRole('button', { name: 'Guest로 시작하기' }));

		expect(apiClient.post).toHaveBeenCalledWith('auth/guest');
		await vi.waitFor(() => expect(mockPush).toHaveBeenCalledWith('/home'));
	});
});
