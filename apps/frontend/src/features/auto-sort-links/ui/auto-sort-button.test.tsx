import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HTTPError } from 'ky';
import { SnackbarProvider } from 'seed-design/ui/snackbar';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { AutoSortButton } from '@/features/auto-sort-links/ui/auto-sort-button';

import { Folder } from '@/entities/folder/model/types';
import { AutoSortSuggestion } from '@/entities/link/api/auto-sort';
import { Link } from '@/entities/link/model/types';

import { apiClient } from '@/shared/api/client';

vi.mock('@/shared/api/client', () => ({
	apiClient: { get: vi.fn(), post: vi.fn() },
}));

function folder(overrides: Partial<Folder> & Pick<Folder, 'id' | 'name'>): Folder {
	return { userId: 'u', parentFolderId: null, sortOrder: 0, isSystem: false, deletedAt: null, ...overrides };
}

function link(overrides: Partial<Link> & Pick<Link, 'id'>): Link {
	return {
		userId: 'u',
		folderId: 'kakao',
		url: 'https://example.com',
		title: null,
		thumbnailUrl: null,
		folderSource: 'kakao_bot',
		shelfLifeDays: null,
		savedReason: null,
		status: 'unviewed',
		createdAt: '2026-11-01T00:00:00Z',
		lastRemindedAt: null,
		remindAt: null,
		pinnedAt: null,
		viewedAt: null,
		deletedAt: null,
		...overrides,
	};
}

const folders = [
	folder({ id: 'kakao', name: '카카오톡으로 등록', isSystem: true }),
	folder({ id: 'dev', name: '개발' }),
	folder({ id: 'fe', name: '프론트', parentFolderId: 'dev' }),
	folder({ id: 'trip', name: '여행' }),
];

const links = [
	link({ id: 'l1', title: '리액트 훅 정리' }),
	link({ id: 'l2', title: '제주 맛집' }),
	link({ id: 'l3', title: '아이폰 리뷰' }),
	link({ id: 'l4', url: 'https://www.youtube.com/watch?v=x' }),
];

const suggestion: AutoSortSuggestion = {
	suggestions: [
		{ linkId: 'l1', folderId: 'fe' },
		{ linkId: 'l2', folderId: 'trip' },
		{ linkId: 'l3', folderId: 'trip' },
		{ linkId: 'l4', folderId: null },
	],
	remaining: 34,
	skipped: 2,
};

function httpError(status: number) {
	return new HTTPError(new Response(null, { status }), new Request('http://localhost'), {} as never);
}

function mockApi({ suggest = async () => suggestion as unknown }: { suggest?: () => Promise<unknown> } = {}) {
	vi.mocked(apiClient.get).mockImplementation(((url: string) => ({
		json: async () => {
			if (url === 'folders') {
				return folders;
			}

			if (url === 'links/auto-sort/quota') {
				return { remaining: 38 };
			}

			return links;
		},
	})) as never);
	vi.mocked(apiClient.post).mockImplementation(((url: string) => ({
		json: url === 'links/move' ? async () => [] : suggest,
	})) as never);
}

function renderButton() {
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
	queryClient.setQueryData(['links', 'folder', 'kakao'], links);

	render(
		<QueryClientProvider client={queryClient}>
			<SnackbarProvider>
				<AutoSortButton folderId="kakao" />
			</SnackbarProvider>
		</QueryClientProvider>,
	);
}

async function openPreview() {
	const user = userEvent.setup();
	renderButton();

	await user.click(await screen.findByRole('button', { name: '폴더 자동 배치' }));

	return { user, dialog: await screen.findByRole('dialog', { name: /폴더 자동 배치/ }) };
}

describe('AutoSortButton', () => {
	beforeEach(() => {
		vi.mocked(apiClient.get).mockReset();
		vi.mocked(apiClient.post).mockReset();
		mockApi();
	});

	test('오늘 남은 개수를 보여준다', async () => {
		renderButton();

		expect(await screen.findByText('오늘 38개 남았어요')).toBeInTheDocument();
	});

	test('미리보기에 추천 폴더 경로, 맞는 폴더 없음, 내일로 넘어간 개수를 보여준다', async () => {
		const { dialog } = await openPreview();

		expect(within(dialog).getByText('리액트 훅 정리')).toBeInTheDocument();
		expect(within(dialog).getByRole('button', { name: '개발 > 프론트' })).toBeInTheDocument();
		expect(within(dialog).getByText('www.youtube.com')).toBeInTheDocument();
		expect(within(dialog).getByRole('button', { name: '폴더 고르기' })).toBeInTheDocument();
		expect(within(dialog).getByText('나머지 2개는 내일 다시 눌러주세요')).toBeInTheDocument();
		expect(within(dialog).getByRole('checkbox', { name: 'www.youtube.com' })).not.toBeChecked();
		expect(within(dialog).getByRole('button', { name: '3개 옮기기' })).toBeInTheDocument();
	});

	test('체크 해제한 링크는 빼고, 폴더를 바꾼 링크는 user로 옮긴다', async () => {
		const { user, dialog } = await openPreview();

		await user.click(within(dialog).getByRole('checkbox', { name: '아이폰 리뷰' }));
		await user.click(within(dialog).getAllByRole('button', { name: '여행' })[0]);
		const picker = await screen.findByRole('dialog', { name: '폴더 고르기' });

		expect(within(picker).queryByText('카카오톡으로 등록')).not.toBeInTheDocument();

		await user.click(within(picker).getByText('개발'));
		await user.click(within(picker).getByRole('button', { name: '선택' }));
		await user.click(within(dialog).getByRole('button', { name: '2개 옮기기' }));

		expect(apiClient.post).toHaveBeenCalledWith('links/move', {
			json: {
				moves: [
					{ linkId: 'l1', folderId: 'fe', source: 'ai' },
					{ linkId: 'l2', folderId: 'dev', source: 'user' },
				],
			},
		});
		expect(await screen.findByText('2개를 옮겼어요')).toBeInTheDocument();
	});

	test('맞는 폴더 없음인 링크도 폴더를 고르면 체크된다', async () => {
		const { user, dialog } = await openPreview();

		await user.click(within(dialog).getByRole('button', { name: '폴더 고르기' }));
		const picker = await screen.findByRole('dialog', { name: '폴더 고르기' });
		await user.click(within(picker).getByText('여행'));
		await user.click(within(picker).getByRole('button', { name: '선택' }));

		expect(within(dialog).getByRole('checkbox', { name: 'www.youtube.com' })).toBeChecked();
		expect(within(dialog).getByRole('button', { name: '4개 옮기기' })).toBeInTheDocument();
	});

	test.each([
		[429, '오늘은 다 썼어요, 내일 다시 눌러주세요'],
		[503, '잠시 후 다시 눌러주세요'],
	])('추천이 %i이면 "%s"를 보여준다', async (status, message) => {
		mockApi({ suggest: () => Promise.reject(httpError(status)) });
		const user = userEvent.setup();
		renderButton();

		await user.click(await screen.findByRole('button', { name: '폴더 자동 배치' }));

		expect(await screen.findByText(message)).toBeInTheDocument();
	});

	test('옮기는 사이 목록이 바뀌어 404면 다시 눌러달라고 한다', async () => {
		const { user, dialog } = await openPreview();
		vi.mocked(apiClient.post).mockImplementation((() => ({
			json: () => Promise.reject(httpError(404)),
		})) as never);

		await user.click(within(dialog).getByRole('button', { name: '3개 옮기기' }));

		expect(await screen.findByText('목록이 바뀌었어요, 다시 눌러주세요')).toBeInTheDocument();
	});

	test('남은 개수가 0이면 버튼을 누를 수 없다', async () => {
		vi.mocked(apiClient.get).mockImplementation(((url: string) => ({
			json: async () => (url === 'links/auto-sort/quota' ? { remaining: 0 } : folders),
		})) as never);
		renderButton();

		expect(await screen.findByText('오늘 0개 남았어요')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: '폴더 자동 배치' })).toBeDisabled();
	});
});
