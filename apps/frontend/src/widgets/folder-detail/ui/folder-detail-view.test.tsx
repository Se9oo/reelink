import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SnackbarProvider } from 'seed-design/ui/snackbar';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { FolderDetailView } from '@/widgets/folder-detail/ui/folder-detail-view';

import { Folder } from '@/entities/folder/model/types';
import { Link } from '@/entities/link/model/types';

import { apiClient } from '@/shared/api/client';

vi.mock('@/shared/api/client', () => ({
	apiClient: { get: vi.fn(), delete: vi.fn(), post: vi.fn() },
}));

function folder(overrides: Partial<Folder> & Pick<Folder, 'id' | 'name'>): Folder {
	return { userId: 'u', parentFolderId: null, sortOrder: 0, isSystem: false, deletedAt: null, ...overrides };
}

function link(overrides: Partial<Link> & Pick<Link, 'id'>): Link {
	return {
		userId: 'u',
		folderId: 'dev',
		url: 'https://react.dev/blog',
		title: null,
		thumbnailUrl: null,
		folderSource: 'user',
		shelfLifeDays: null,
		savedReason: null,
		status: 'unviewed',
		createdAt: '2026-10-16T00:00:00Z',
		lastRemindedAt: null,
		pinnedAt: null,
		deletedAt: null,
		...overrides,
	};
}

const folders = [
	folder({ id: 'dev', name: '개발' }),
	folder({ id: 'react', name: 'React', parentFolderId: 'dev', sortOrder: 0 }),
	folder({ id: 'next', name: 'Next.js', parentFolderId: 'dev', sortOrder: 1 }),
	folder({ id: 'hooks', name: '훅', parentFolderId: 'react', sortOrder: 0 }),
	folder({ id: 'empty', name: '빈 폴더' }),
];

function mockApi(linksByFolder: Record<string, Link[]>) {
	vi.mocked(apiClient.get).mockImplementation(((url: string) => ({
		json: async () => {
			if (url === 'folders') {
				return folders;
			}

			const match = url.match(/^folders\/(.+)\/links$/);

			return match ? (linksByFolder[match[1]] ?? []) : [];
		},
	})) as never);
}

function renderDetail(folderId: string) {
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

	render(
		<QueryClientProvider client={queryClient}>
			<SnackbarProvider>
				<FolderDetailView folderId={folderId} />
			</SnackbarProvider>
		</QueryClientProvider>,
	);
}

describe('FolderDetailView', () => {
	beforeEach(() => {
		window.localStorage.clear();
		vi.mocked(apiClient.get).mockReset();
		vi.mocked(apiClient.delete)
			.mockReset()
			.mockResolvedValue(new Response(null, { status: 204 }) as never);
	});

	test('폴더 이름과 개수, 하위 폴더 링크, 링크 목록을 보여준다', async () => {
		mockApi({ dev: [link({ id: 'l1', title: 'React 19 새 기능' })] });
		renderDetail('dev');

		expect(await screen.findByRole('heading', { name: '개발' })).toBeInTheDocument();
		expect(await screen.findByText('폴더 2 · 링크 1')).toBeInTheDocument();
		expect(screen.getByRole('link', { name: /^React(?! 19)/ })).toHaveAttribute('href', '/folders/react');
		expect(screen.getByRole('link', { name: 'Next.js' })).toHaveAttribute('href', '/folders/next');
		expect(await screen.findByText('React 19 새 기능')).toBeInTheDocument();
	});

	test('하위 폴더 카드에 그 폴더의 하위 폴더 수를 보여준다', async () => {
		mockApi({});
		renderDetail('dev');

		expect(await screen.findByRole('link', { name: /^React(?! 19)/ })).toHaveTextContent('하위 폴더 1');
		expect(screen.getByRole('link', { name: 'Next.js' })).not.toHaveTextContent('하위 폴더');
	});

	test('하위 폴더와 링크가 둘 다 있으면 섹션 제목으로 구분한다', async () => {
		mockApi({ dev: [link({ id: 'l1', title: 'React 19 새 기능' })] });
		renderDetail('dev');

		expect(await screen.findByText('하위 폴더 2')).toBeInTheDocument();
		expect(screen.getByText('링크 1')).toBeInTheDocument();
	});

	test('링크만 있어도 링크 섹션 제목을 보여준다', async () => {
		mockApi({ empty: [link({ id: 'l1', folderId: 'empty', title: '혼자 있는 링크' })] });
		renderDetail('empty');

		expect(await screen.findByText('혼자 있는 링크')).toBeInTheDocument();
		expect(screen.getByText('링크 1')).toBeInTheDocument();
		expect(screen.queryByText(/^하위 폴더/)).not.toBeInTheDocument();
	});

	test('하위 폴더만 있어도 하위 폴더 섹션 제목을 보여준다', async () => {
		mockApi({});
		renderDetail('react');

		expect(await screen.findByText('하위 폴더 1')).toBeInTheDocument();
		expect(screen.queryByText(/^링크 \d/)).not.toBeInTheDocument();
	});

	test('하위 폴더도 링크도 없으면 빈 상태 문구를 보여준다', async () => {
		mockApi({});
		renderDetail('empty');

		expect(await screen.findByText('이 폴더엔 아직 링크가 없어요')).toBeInTheDocument();
	});

	test('존재하지 않는 폴더면 안내 문구와 폴더 목록으로 가는 링크를 보여준다', async () => {
		mockApi({});
		renderDetail('missing');

		expect(await screen.findByText('폴더를 찾을 수 없어요')).toBeInTheDocument();
		expect(screen.getByRole('link', { name: '폴더 목록으로' })).toHaveAttribute('href', '/folders');
	});

	test('링크의 더보기 메뉴에서 삭제하면 삭제 API를 호출한다', async () => {
		const user = userEvent.setup();
		mockApi({ dev: [link({ id: 'l1', title: 'React 19 새 기능' })] });
		renderDetail('dev');

		await user.click(await screen.findByRole('button', { name: '더보기' }));
		await user.click(await screen.findByRole('menuitem', { name: '삭제' }));

		expect(apiClient.delete).toHaveBeenCalledWith('links/l1');
	});

	describe('링크 정렬', () => {
		const sortLinksFixture = [
			link({ id: 'l1', folderId: 'empty', title: '나중 링크', createdAt: '2026-10-03T00:00:00Z' }),
			link({ id: 'l2', folderId: 'empty', title: '가장 먼저 저장한 링크', createdAt: '2026-10-01T00:00:00Z' }),
		];

		function linkTitles() {
			return screen
				.getAllByRole('link')
				.map((anchor) => anchor.textContent)
				.filter((text) => text === '나중 링크' || text === '가장 먼저 저장한 링크');
		}

		test('기본은 최신순이고, 오래된순을 고르면 순서가 바뀐다', async () => {
			const user = userEvent.setup();
			mockApi({ empty: sortLinksFixture });
			renderDetail('empty');

			await screen.findByText('나중 링크');

			expect(linkTitles()).toEqual(['나중 링크', '가장 먼저 저장한 링크']);

			await user.click(screen.getByRole('button', { name: '최신순' }));
			await user.click(await screen.findByRole('menuitem', { name: '오래된순' }));

			expect(linkTitles()).toEqual(['가장 먼저 저장한 링크', '나중 링크']);
			expect(screen.getByRole('button', { name: '오래된순' })).toBeInTheDocument();
		});

		test('고른 정렬은 다시 들어와도 유지된다', async () => {
			const user = userEvent.setup();
			mockApi({ empty: sortLinksFixture });
			renderDetail('empty');

			await user.click(await screen.findByRole('button', { name: '최신순' }));
			await user.click(await screen.findByRole('menuitem', { name: '오래된순' }));

			cleanup();
			renderDetail('empty');

			expect(await screen.findByRole('button', { name: '오래된순' })).toBeInTheDocument();
		});
	});
});
