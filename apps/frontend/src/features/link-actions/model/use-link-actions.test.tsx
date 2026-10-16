import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SnackbarProvider } from 'seed-design/ui/snackbar';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { useLinkActions } from '@/features/link-actions/model/use-link-actions';

import { Link } from '@/entities/link/model/types';

import { apiClient } from '@/shared/api/client';

vi.mock('@/shared/api/client', () => ({
	apiClient: { delete: vi.fn(), post: vi.fn() },
}));

const link: Link = {
	id: 'l1',
	userId: 'user-1',
	folderId: 'f1',
	url: 'https://example.com',
	title: '예시',
	thumbnailUrl: null,
	folderSource: 'user',
	shelfLifeDays: null,
	savedReason: null,
	status: 'unviewed',
	createdAt: '2026-10-16T00:00:00Z',
	lastRemindedAt: null,
	deletedAt: null,
};

function Harness() {
	const { onDelete } = useLinkActions();

	return (
		<button type="button" onClick={() => onDelete(link)}>
			삭제하기
		</button>
	);
}

function renderHarness() {
	const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });

	render(
		<QueryClientProvider client={queryClient}>
			<SnackbarProvider>
				<Harness />
			</SnackbarProvider>
		</QueryClientProvider>,
	);
}

describe('useLinkActions', () => {
	beforeEach(() => {
		vi.mocked(apiClient.delete)
			.mockReset()
			.mockResolvedValue(new Response(null, { status: 204 }) as never);
		vi.mocked(apiClient.post)
			.mockReset()
			.mockResolvedValue(new Response(null, { status: 201 }) as never);
	});

	test('삭제하면 링크 삭제 API를 호출하고 실행 취소 스낵바를 띄운다', async () => {
		const user = userEvent.setup();
		renderHarness();

		await user.click(screen.getByRole('button', { name: '삭제하기' }));

		expect(apiClient.delete).toHaveBeenCalledWith('links/l1');
		expect(await screen.findByText('링크를 삭제했어요')).toBeInTheDocument();
	});

	test('실행 취소를 누르면 휴지통 복구 API를 호출한다', async () => {
		const user = userEvent.setup();
		renderHarness();

		await user.click(screen.getByRole('button', { name: '삭제하기' }));
		await user.click(await screen.findByRole('button', { name: '실행 취소' }));

		await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith('trash/link/l1/restore'));
	});

	test('삭제에 실패하면 성공 스낵바 대신 실패 스낵바를 띄운다', async () => {
		const user = userEvent.setup();
		vi.mocked(apiClient.delete).mockRejectedValue(new Error('fail'));
		renderHarness();

		await user.click(screen.getByRole('button', { name: '삭제하기' }));

		expect(await screen.findByText('링크를 삭제하지 못했어요')).toBeInTheDocument();
		expect(screen.queryByText('링크를 삭제했어요')).not.toBeInTheDocument();
	});

	test('실행 취소에 실패하면 실패 스낵바를 띄운다', async () => {
		const user = userEvent.setup();
		vi.mocked(apiClient.post).mockRejectedValue(new Error('fail'));
		renderHarness();

		await user.click(screen.getByRole('button', { name: '삭제하기' }));
		await user.click(await screen.findByRole('button', { name: '실행 취소' }));

		expect(await screen.findByText('되돌리지 못했어요')).toBeInTheDocument();
	});
});
