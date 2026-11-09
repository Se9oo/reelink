import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';

import { WithdrawButton } from '@/features/withdraw-account/ui/withdraw-button';

import { User } from '@/entities/user/model/types';

import { apiClient } from '@/shared/api/client';

vi.mock('@/shared/api/client', () => ({
	apiClient: { get: vi.fn(), delete: vi.fn() },
}));

const { mockPush } = vi.hoisted(() => ({ mockPush: vi.fn() }));

vi.mock('next/navigation', () => ({
	useRouter: () => ({ push: mockPush }),
}));

function renderButton(isGuest: boolean) {
	const me: User = { id: 'u', email: 'a@test.com', nickname: '회원', avatarUrl: null, isGuest };
	vi.mocked(apiClient.get).mockReturnValue({ json: async () => me } as never);

	render(
		<QueryClientProvider client={new QueryClient()}>
			<WithdrawButton />
		</QueryClientProvider>,
	);
}

describe('WithdrawButton', () => {
	test('확인 창에서 탈퇴를 누르면 계정을 지우고 로그인 화면으로 이동한다', async () => {
		const user = userEvent.setup();
		vi.mocked(apiClient.delete).mockResolvedValue(new Response(null, { status: 204 }) as never);
		renderButton(false);

		await user.click(await screen.findByRole('button', { name: '회원 탈퇴' }));
		expect(await screen.findByRole('alertdialog')).toHaveTextContent(/되돌릴 수 없어요/);
		await user.click(screen.getByRole('button', { name: '탈퇴' }));

		expect(apiClient.delete).toHaveBeenCalledWith('auth/me');
		await vi.waitFor(() => expect(mockPush).toHaveBeenCalledWith('/login'));
	});

	test('게스트에게는 보여주지 않는다', async () => {
		renderButton(true);

		await vi.waitFor(() => expect(apiClient.get).toHaveBeenCalled());
		expect(screen.queryByRole('button', { name: '회원 탈퇴' })).not.toBeInTheDocument();
	});
});
