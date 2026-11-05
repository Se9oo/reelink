import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { KakaoBotLinkDialog } from '@/features/connect-kakao-bot/ui/kakao-bot-link-dialog';

import { LinkStatus } from '@/entities/kakao-bot/model/types';

import { apiClient } from '@/shared/api/client';

vi.mock('@/shared/api/client', () => ({
	apiClient: { get: vi.fn(), post: vi.fn() },
}));

vi.mock('@/shared/config/env', () => ({
	API_URL: '',
	KAKAO_CHANNEL_CHAT_URL: 'https://pf.kakao.com/_test/chat',
}));

const CODE_TTL_MS = 5 * 60 * 1000;

function mockApi({ status, code = '482913' }: { status: (issuedAt: number) => LinkStatus; code?: string }) {
	let issuedAt = 0;
	vi.mocked(apiClient.post).mockImplementation((() => ({
		json: async () => {
			issuedAt = Date.now();
			return { code, expiresAt: new Date(issuedAt + CODE_TTL_MS).toISOString() };
		},
	})) as never);
	vi.mocked(apiClient.get).mockImplementation((() => ({ json: async () => status(issuedAt) })) as never);
}

const notLinked = () => ({ linked: false, linkedAt: null });

function renderDialog() {
	render(
		<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
			<KakaoBotLinkDialog open onOpenChange={() => {}} />
		</QueryClientProvider>,
	);
}

describe('KakaoBotLinkDialog', () => {
	afterEach(() => {
		vi.useRealTimers();
		vi.clearAllMocks();
	});

	test('열리면 연동 코드를 발급해 보여주고, 채팅방 링크를 연다', async () => {
		mockApi({ status: notLinked });
		renderDialog();

		expect(await screen.findByText('482913')).toBeInTheDocument();
		expect(apiClient.post).toHaveBeenCalledWith('notifications/kakao-bot/link-code');
		expect(screen.getByRole('link', { name: '카카오톡에서 열기' })).toHaveAttribute(
			'href',
			'https://pf.kakao.com/_test/chat',
		);
	});

	test('복사를 누르면 코드를 클립보드에 복사한다', async () => {
		mockApi({ status: notLinked });
		const user = userEvent.setup();
		const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
		renderDialog();

		await user.click(await screen.findByRole('button', { name: '복사' }));

		expect(writeText).toHaveBeenCalledWith('482913');
	});

	test('5분이 지나면 만료 안내로 바뀌고, 새 코드 받기를 누르면 다시 발급한다', async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		mockApi({ status: notLinked });
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
		renderDialog();
		await screen.findByText('482913');

		await act(async () => {
			vi.advanceTimersByTime(CODE_TTL_MS + 1000);
		});

		expect(screen.getByText('코드가 만료됐어요')).toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: '새 코드 받기' }));
		expect(apiClient.post).toHaveBeenCalledTimes(2);
	});

	test('코드를 발급한 뒤에 연동되면 연동 완료로 바뀐다', async () => {
		mockApi({ status: (issuedAt) => ({ linked: true, linkedAt: new Date(issuedAt + 1000).toISOString() }) });
		renderDialog();

		expect(await screen.findByText('연동 완료!')).toBeInTheDocument();
	});

	test('이미 연동돼 있어도 이번 코드로 연동되기 전이면 코드를 계속 보여준다', async () => {
		mockApi({ status: (issuedAt) => ({ linked: true, linkedAt: new Date(issuedAt - 60_000).toISOString() }) });
		renderDialog();

		expect(await screen.findByText('482913')).toBeInTheDocument();
		await vi.waitFor(() => expect(apiClient.get).toHaveBeenCalled());
		expect(screen.queryByText('연동 완료!')).not.toBeInTheDocument();
	});
});
