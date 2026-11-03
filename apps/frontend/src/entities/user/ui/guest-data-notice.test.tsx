import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

import { User } from '@/entities/user/model/types';
import { GuestDataNotice } from '@/entities/user/ui/guest-data-notice';

import { apiClient } from '@/shared/api/client';

vi.mock('@/shared/api/client', () => ({
	apiClient: { get: vi.fn() },
}));

const NOTICE = /Guest로 저장한 링크는 이 브라우저에만 연결돼 있어요/;

function renderNotice(isGuest: boolean) {
	const me: User = { id: 'u', email: '', nickname: '게스트', avatarUrl: null, isGuest };
	vi.mocked(apiClient.get).mockReturnValue({ json: async () => me } as never);

	render(
		<QueryClientProvider client={new QueryClient()}>
			<GuestDataNotice />
		</QueryClientProvider>,
	);
}

describe('GuestDataNotice', () => {
	test('게스트에게는 데이터가 사라질 수 있다는 안내를 보여준다', async () => {
		renderNotice(true);

		expect(await screen.findByRole('note')).toHaveTextContent(NOTICE);
		expect(screen.getByRole('link', { name: /로그인하고 계정에 보관하기/ })).toHaveAttribute('href', '/login');
	});

	test('로그인 사용자에게는 보여주지 않는다', async () => {
		renderNotice(false);

		await vi.waitFor(() => expect(apiClient.get).toHaveBeenCalled());
		expect(screen.queryByText(NOTICE)).not.toBeInTheDocument();
	});
});
