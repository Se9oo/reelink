import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OverlayProvider } from 'overlay-kit';
import { SnackbarProvider } from 'seed-design/ui/snackbar';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { useLinkActions } from '@/features/link-actions/model/use-link-actions';

import { Link } from '@/entities/link/model/types';

import { apiClient } from '@/shared/api/client';

vi.mock('@/shared/api/client', () => ({
	apiClient: { delete: vi.fn(), post: vi.fn(), get: vi.fn(), patch: vi.fn() },
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

const folders = [
	{ id: 'f1', userId: 'user-1', parentFolderId: null, name: '현재', sortOrder: 0, isSystem: false, deletedAt: null },
	{ id: 'f2', userId: 'user-1', parentFolderId: null, name: '목적지', sortOrder: 1, isSystem: false, deletedAt: null },
];

function Harness() {
	const { onDelete, onMove } = useLinkActions();

	return (
		<>
			<button type="button" onClick={() => onDelete(link)}>
				삭제하기
			</button>
			<button type="button" onClick={() => onMove(link)}>
				이동하기
			</button>
		</>
	);
}

function renderHarness() {
	const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });

	render(
		<QueryClientProvider client={queryClient}>
			<OverlayProvider>
				<SnackbarProvider>
					<Harness />
				</SnackbarProvider>
			</OverlayProvider>
		</QueryClientProvider>,
	);
}

describe('useLinkActions', () => {
	beforeEach(() => {
		vi.stubGlobal(
			'matchMedia',
			vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
		);
		vi.mocked(apiClient.get)
			.mockReset()
			.mockReturnValue({ json: async () => folders } as never);
		vi.mocked(apiClient.patch)
			.mockReset()
			.mockReturnValue({ json: async () => link } as never);
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

	describe('링크 이동', () => {
		async function openMoveDialog(user: ReturnType<typeof userEvent.setup>) {
			await user.click(screen.getByRole('button', { name: '이동하기' }));
			await screen.findByText('폴더 이동');
		}

		test('현재 폴더는 선택할 수 없고 폴더를 고르기 전에는 이동 버튼이 비활성이다', async () => {
			const user = userEvent.setup();
			renderHarness();

			await openMoveDialog(user);
			await user.click(await screen.findByText('현재'));

			expect(screen.getByText('현재 폴더')).toBeInTheDocument();
			expect(screen.getByRole('button', { name: '이동' })).toBeDisabled();
		});

		test('폴더를 골라 이동하면 이동 API를 호출하고 실행 취소 스낵바를 띄운다', async () => {
			const user = userEvent.setup();
			renderHarness();

			await openMoveDialog(user);
			await user.click(await screen.findByText('목적지'));
			await user.click(screen.getByRole('button', { name: '이동' }));

			await waitFor(() =>
				expect(apiClient.patch).toHaveBeenCalledWith('links/l1/folder', { json: { folderId: 'f2' } }),
			);
			expect(await screen.findByText('링크를 옮겼어요')).toBeInTheDocument();
		});

		test('실행 취소를 누르면 원래 폴더로 다시 이동한다', async () => {
			const user = userEvent.setup();
			renderHarness();

			await openMoveDialog(user);
			await user.click(await screen.findByText('목적지'));
			await user.click(screen.getByRole('button', { name: '이동' }));
			await user.click(await screen.findByRole('button', { name: '실행 취소' }));

			await waitFor(() =>
				expect(apiClient.patch).toHaveBeenLastCalledWith('links/l1/folder', { json: { folderId: 'f1' } }),
			);
		});

		test('태블릿 이상 화면에서도 다이얼로그로 같은 방식으로 이동한다', async () => {
			const user = userEvent.setup();
			vi.stubGlobal(
				'matchMedia',
				vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
			);
			renderHarness();

			await openMoveDialog(user);
			await user.click(await screen.findByText('목적지'));
			await user.click(screen.getByRole('button', { name: '이동' }));

			await waitFor(() =>
				expect(apiClient.patch).toHaveBeenCalledWith('links/l1/folder', { json: { folderId: 'f2' } }),
			);
		});

		test('이동에 실패하면 실패 스낵바를 띄운다', async () => {
			const user = userEvent.setup();
			vi.mocked(apiClient.patch).mockImplementation((() => ({
				json: async () => Promise.reject(new Error('fail')),
			})) as never);
			renderHarness();

			await openMoveDialog(user);
			await user.click(await screen.findByText('목적지'));
			await user.click(screen.getByRole('button', { name: '이동' }));

			expect(await screen.findByText('링크를 옮기지 못했어요')).toBeInTheDocument();
			expect(screen.queryByText('링크를 옮겼어요')).not.toBeInTheDocument();
		});
	});
});
