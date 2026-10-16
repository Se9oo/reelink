import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SnackbarProvider } from 'seed-design/ui/snackbar';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { LinkSearch } from '@/features/search-links/ui/link-search';

import { Folder } from '@/entities/folder/model/types';
import { Link } from '@/entities/link/model/types';

import { apiClient } from '@/shared/api/client';

vi.mock('@/shared/api/client', () => ({
	apiClient: { get: vi.fn() },
}));

function folder(overrides: Partial<Folder> & Pick<Folder, 'id' | 'name'>): Folder {
	return { userId: 'u', parentFolderId: null, sortOrder: 0, isSystem: false, deletedAt: null, ...overrides };
}

function link(overrides: Partial<Link> & Pick<Link, 'id'>): Link {
	return {
		userId: 'u',
		folderId: 'react',
		url: 'https://react.dev',
		title: null,
		thumbnailUrl: null,
		folderSource: 'user',
		shelfLifeDays: null,
		savedReason: null,
		status: 'unviewed',
		createdAt: '2026-10-16T00:00:00Z',
		lastRemindedAt: null,
		deletedAt: null,
		...overrides,
	};
}

const folders = [folder({ id: 'dev', name: '개발' }), folder({ id: 'react', name: 'React', parentFolderId: 'dev' })];

function mockApi(searchResults: Link[]) {
	vi.mocked(apiClient.get).mockImplementation(((url: string) => ({
		json: async () => (url === 'folders' ? folders : searchResults),
	})) as never);
}

function renderSearch() {
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

	render(
		<QueryClientProvider client={queryClient}>
			<SnackbarProvider>
				<LinkSearch>
					<div>기본 목록</div>
				</LinkSearch>
			</SnackbarProvider>
		</QueryClientProvider>,
	);
}

const searchCalls = () => vi.mocked(apiClient.get).mock.calls.filter(([url]) => url === 'links/search');

describe('LinkSearch', () => {
	beforeEach(() => {
		vi.mocked(apiClient.get).mockReset();
	});

	test('검색어가 없으면 기본 목록을 보여주고 검색 요청을 보내지 않는다', () => {
		mockApi([]);
		renderSearch();

		expect(screen.getByText('기본 목록')).toBeInTheDocument();
		expect(searchCalls()).toHaveLength(0);
	});

	test('검색어를 입력하면 기본 목록 대신 결과를 폴더 경로와 함께 보여준다', async () => {
		const user = userEvent.setup();
		mockApi([link({ id: 'l1', title: 'React 19 새 기능', savedReason: '훅 정리' })]);
		renderSearch();

		await user.type(screen.getByRole('textbox', { name: '링크 검색' }), 'react');

		expect(await screen.findByText('React 19 새 기능', undefined, { timeout: 2000 })).toBeInTheDocument();
		expect(screen.getByText('개발 > React 안에 있음')).toBeInTheDocument();
		expect(screen.getByText('전체 링크에서 검색 · 결과 1개')).toBeInTheDocument();
		expect(screen.queryByText('기본 목록')).not.toBeInTheDocument();
	});

	test('결과가 없으면 안내 문구를 보여준다', async () => {
		const user = userEvent.setup();
		mockApi([]);
		renderSearch();

		await user.type(screen.getByRole('textbox', { name: '링크 검색' }), 'zzz');

		expect(await screen.findByText('검색 결과가 없어요', undefined, { timeout: 2000 })).toBeInTheDocument();
	});

	test('빠르게 이어서 입력하면 마지막 검색어로 한 번만 요청한다', async () => {
		const user = userEvent.setup();
		mockApi([link({ id: 'l1', title: '결과' })]);
		renderSearch();

		await user.type(screen.getByRole('textbox', { name: '링크 검색' }), 'react');
		await screen.findByText('결과', undefined, { timeout: 2000 });

		expect(searchCalls()).toHaveLength(1);
		expect(searchCalls()[0][1]).toMatchObject({ searchParams: { q: 'react' } });
	});

	test('지우기 버튼을 누르면 기본 목록으로 돌아온다', async () => {
		const user = userEvent.setup();
		mockApi([link({ id: 'l1', title: '결과' })]);
		renderSearch();

		await user.type(screen.getByRole('textbox', { name: '링크 검색' }), 'react');
		await screen.findByText('결과', undefined, { timeout: 2000 });
		await user.click(screen.getByRole('button', { name: '검색어 지우기' }));

		expect(screen.getByText('기본 목록')).toBeInTheDocument();
		expect(screen.getByRole('textbox', { name: '링크 검색' })).toHaveValue('');
	});

	test('지우고 디바운스 안에 다시 입력하면 이전 검색어의 결과 행은 보이지 않는다', async () => {
		const user = userEvent.setup();
		mockApi([link({ id: 'l1', title: '이전 결과' })]);
		renderSearch();

		const input = screen.getByRole('textbox', { name: '링크 검색' });

		await user.type(input, 'abc');
		await screen.findByText('이전 결과', undefined, { timeout: 2000 });
		await user.click(screen.getByRole('button', { name: '검색어 지우기' }));
		await user.type(input, 'x');

		expect(screen.queryByText('이전 결과')).not.toBeInTheDocument();
	});
});
