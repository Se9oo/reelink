import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SnackbarProvider } from 'seed-design/ui/snackbar';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { RemindFeed } from '@/widgets/remind-feed/ui/remind-feed';

import { Folder } from '@/entities/folder/model/types';
import { Link } from '@/entities/link/model/types';

import { apiClient } from '@/shared/api/client';

vi.mock('@/shared/api/client', () => ({
	apiClient: { get: vi.fn(), patch: vi.fn(), delete: vi.fn(), post: vi.fn() },
}));

const folders: Folder[] = [
	{ id: 'f1', userId: 'u', parentFolderId: null, name: '개발', sortOrder: 0, isSystem: false, deletedAt: null },
];

function link(overrides: Partial<Link> & Pick<Link, 'id'>): Link {
	return {
		userId: 'u',
		folderId: 'f1',
		url: 'https://react.dev',
		title: null,
		thumbnailUrl: null,
		folderSource: 'user',
		shelfLifeDays: null,
		savedReason: null,
		status: 'unviewed',
		createdAt: '2026-05-01T00:00:00Z',
		lastRemindedAt: null,
		pinnedAt: null,
		deletedAt: null,
		...overrides,
	};
}

const feed = [
	link({ id: 'l1', title: '도커 컴포즈 정리', savedReason: '배포 전에 따라 해보기' }),
	link({ id: 'l2', title: '좋은 글쓰기', url: 'https://brunch.co.kr/a' }),
];

function mockApi(feedLinks: Link[]) {
	vi.mocked(apiClient.get).mockImplementation(((url: string) => ({
		json: async () => (url === 'folders' ? folders : feedLinks),
	})) as never);
}

function renderFeed() {
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

	render(
		<QueryClientProvider client={queryClient}>
			<SnackbarProvider>
				<RemindFeed />
			</SnackbarProvider>
		</QueryClientProvider>,
	);
}

describe('RemindFeed', () => {
	beforeEach(() => {
		vi.mocked(apiClient.patch)
			.mockReset()
			.mockReturnValue({ json: async () => ({}) } as never);
		vi.mocked(apiClient.delete)
			.mockReset()
			.mockResolvedValue(new Response(null, { status: 204 }) as never);
		vi.mocked(apiClient.post)
			.mockReset()
			.mockResolvedValue(new Response(null, { status: 201 }) as never);
	});

	test('안 본 링크를 받은 순서대로 저장 이유·제목·위치와 함께 보여준다', async () => {
		mockApi(feed);
		renderFeed();

		expect(await screen.findByText('배포 전에 따라 해보기')).toBeInTheDocument();
		expect(screen.getByText('도커 컴포즈 정리')).toBeInTheDocument();
		expect(screen.getByText('1 / 2')).toBeInTheDocument();
		expect(screen.getByText('2 / 2')).toBeInTheDocument();
		expect(screen.getAllByText('개발')).not.toHaveLength(0);
	});

	test('저장 이유가 없으면 저장 이유 없음 대신 제목을 크게 한 번만 보여준다', async () => {
		mockApi(feed);
		renderFeed();

		expect(await screen.findAllByText('좋은 글쓰기')).toHaveLength(1);
		expect(screen.queryByText('저장 이유 없음')).not.toBeInTheDocument();
	});

	test('안 본 링크가 없으면 정리 끝 안내를 보여준다', async () => {
		mockApi([]);
		renderFeed();

		expect(await screen.findByText('정리 끝!')).toBeInTheDocument();
		expect(screen.getByText('새 링크가 오면 다시 보여드릴게요')).toBeInTheDocument();
	});

	test('카드를 눌러 열면 새 탭으로 열고 열람 처리하며, 카드는 봤어요 표시와 함께 남는다', async () => {
		const user = userEvent.setup();
		mockApi(feed);
		renderFeed();

		const card = await screen.findByRole('link', { name: /도커 컴포즈 정리/ });

		expect(card).toHaveAttribute('href', 'https://react.dev');
		expect(card).toHaveAttribute('target', '_blank');

		await user.click(card);

		await waitFor(() => expect(apiClient.patch).toHaveBeenCalledWith('links/l1/view'));
		expect(screen.getByText('봤어요')).toBeInTheDocument();
		expect(screen.getByText('도커 컴포즈 정리')).toBeInTheDocument();
	});

	test('삭제하면 카드가 빠지고, 실행 취소하면 같은 자리로 돌아온다', async () => {
		const user = userEvent.setup();
		mockApi(feed);
		renderFeed();

		await user.click((await screen.findAllByRole('button', { name: '삭제' }))[0]);

		await waitFor(() => expect(screen.queryByText('도커 컴포즈 정리')).not.toBeInTheDocument());
		expect(apiClient.delete).toHaveBeenCalledWith('links/l1');

		await user.click(await screen.findByRole('button', { name: '실행 취소' }));

		await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith('trash/link/l1/restore'));
		expect(await screen.findByText('1 / 2')).toBeInTheDocument();
		expect(screen.getByText('도커 컴포즈 정리')).toBeInTheDocument();
	});
});
