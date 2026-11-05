import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OverlayProvider } from 'overlay-kit';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { KakaoBotConnect } from '@/features/connect-kakao-bot/ui/kakao-bot-connect';

import { LinkStatus } from '@/entities/kakao-bot/model/types';

import { apiClient } from '@/shared/api/client';

vi.mock('@/shared/api/client', () => ({
	apiClient: { get: vi.fn(), post: vi.fn() },
}));

function mockApi({ isGuest = false, status }: { isGuest?: boolean; status: LinkStatus }) {
	const responses: Record<string, unknown> = {
		'auth/me': { id: 'u', email: '', nickname: '세현', avatarUrl: null, isGuest },
		'notifications/kakao-bot/link-status': status,
	};
	vi.mocked(apiClient.get).mockImplementation(((url: string) => ({ json: async () => responses[url] })) as never);
	vi.mocked(apiClient.post).mockReturnValue({
		json: async () => ({ code: '482913', expiresAt: new Date(Date.now() + 300_000).toISOString() }),
	} as never);
}

function renderConnect() {
	render(
		<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
			<OverlayProvider>
				<KakaoBotConnect />
			</OverlayProvider>
		</QueryClientProvider>,
	);
}

describe('KakaoBotConnect', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	test('게스트면 로그인 링크만 보여준다', async () => {
		mockApi({ isGuest: true, status: { linked: false, linkedAt: null } });
		renderConnect();

		expect(await screen.findByRole('link', { name: '로그인' })).toHaveAttribute('href', '/login');
		expect(screen.queryByRole('button', { name: '연동하기' })).not.toBeInTheDocument();
	});

	test('미연동이면 연동하기를 누르면 코드 모달이 열린다', async () => {
		mockApi({ status: { linked: false, linkedAt: null } });
		renderConnect();

		await userEvent.click(await screen.findByRole('button', { name: '연동하기' }));

		expect(await screen.findByText('482913')).toBeInTheDocument();
	});

	test('연동돼 있으면 연동됨과 다시 연동하기를 보여준다', async () => {
		mockApi({ status: { linked: true, linkedAt: '2026-11-01T00:00:00Z' } });
		renderConnect();

		expect(await screen.findByText('연동됨')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: '다시 연동하기' })).toBeInTheDocument();
	});
});
