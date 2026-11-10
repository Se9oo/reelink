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
	test('카카오 로그인 링크를 올바른 주소로 렌더링한다', () => {
		renderLogin();
		const link = screen.getByRole('link', { name: '카카오 로그인' });
		expect(link).toHaveAttribute('href', `${API_URL}/auth/kakao`);
	});

	test('구글 로그인 링크를 올바른 주소로 렌더링한다', () => {
		renderLogin();
		const link = screen.getByRole('link', { name: 'Google 로그인' });
		expect(link).toHaveAttribute('href', `${API_URL}/auth/google`);
	});

	test('깃허브 로그인 링크를 올바른 주소로 렌더링한다', () => {
		renderLogin();
		const link = screen.getByRole('link', { name: 'GitHub 로그인' });
		expect(link).toHaveAttribute('href', `${API_URL}/auth/github`);
	});

	test('로그인 없이 시작하기 아래에 데이터가 이어진다는 안내를 보여준다', () => {
		renderLogin();

		expect(screen.getByText('나중에 로그인하면 저장한 링크가 그대로 이어져요')).toBeInTheDocument();
	});

	test('로그인 없이 시작하기를 누르면 시작하는 중으로 바뀌고 게스트 세션을 만들어 홈으로 이동한다', async () => {
		let resolve: (value: Response) => void = () => {};
		vi.mocked(apiClient.post).mockReturnValue(new Promise((r) => (resolve = r)) as never);
		renderLogin();

		await userEvent.click(screen.getByRole('button', { name: '로그인 없이 시작하기' }));

		expect(apiClient.post).toHaveBeenCalledWith('auth/guest');
		expect(await screen.findByRole('button', { name: '시작하는 중…' })).toBeDisabled();

		resolve(new Response(null, { status: 204 }));
		await vi.waitFor(() => expect(mockPush).toHaveBeenCalledWith('/home'));
	});
});
