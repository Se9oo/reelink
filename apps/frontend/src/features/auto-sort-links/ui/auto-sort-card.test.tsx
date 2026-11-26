import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HTTPError } from 'ky';
import { SnackbarProvider } from 'seed-design/ui/snackbar';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { AutoSortCard } from '@/features/auto-sort-links/ui/auto-sort-card';

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

function mockApi({
	suggest = async () => suggestion as unknown,
	remaining = 38,
}: { suggest?: () => Promise<unknown>; remaining?: number } = {}) {
	vi.mocked(apiClient.get).mockImplementation(((url: string) => ({
		json: async () => {
			if (url === 'folders') {
				return folders;
			}

			if (url === 'links/auto-sort/quota') {
				return { remaining };
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
				<AutoSortCard folderId="kakao" linkCount={4} />
			</SnackbarProvider>
		</QueryClientProvider>,
	);
}

async function openSelect(user: ReturnType<typeof userEvent.setup>) {
	await screen.findByText(/까지 가능/);
	await user.click(screen.getByRole('button', { name: '정리하기' }));

	return await screen.findByRole('dialog', { name: '분석할 링크 고르기' });
}

async function openPreview() {
	const user = userEvent.setup();
	renderButton();

	const select = await openSelect(user);
	await user.click(within(select).getByRole('button', { name: '4개 분석하기' }));

	return { user, dialog: await screen.findByRole('dialog', { name: /폴더 자동 배치/ }) };
}

function suggestCalls() {
	return vi.mocked(apiClient.post).mock.calls.filter(([url]) => url === 'folders/kakao/auto-sort');
}

describe('AutoSortCard', () => {
	beforeEach(() => {
		vi.mocked(apiClient.get).mockReset();
		vi.mocked(apiClient.post).mockReset();
		mockApi();
	});

	test('정리할 링크 개수와 오늘 남은 개수, 매일 자정 초기화를 알려준다', async () => {
		renderButton();

		expect(screen.getByText('링크 4개를 폴더별로 정리해드릴게요')).toBeInTheDocument();
		expect(await screen.findByText(/오늘 38개까지 가능, 매일 자정에 초기화돼요/)).toBeInTheDocument();
	});

	test('정리하기를 누르면 모든 링크가 체크된 고르기 창을 띄우고, 뺀 링크는 보내지 않는다', async () => {
		const user = userEvent.setup();
		renderButton();
		const select = await openSelect(user);

		expect(
			within(select)
				.getAllByRole('checkbox')
				.every((box) => (box as HTMLInputElement).checked),
		).toBe(true);
		expect(within(select).queryByText(/매일 자정에 초기화돼요/)).not.toBeInTheDocument();
		expect(within(select).getAllByText('example.com')).toHaveLength(3);
		expect(within(select).getByText(/Anthropic\(Claude\)으로 보내져요/)).toBeInTheDocument();

		await user.click(within(select).getByRole('checkbox', { name: '아이폰 리뷰' }));
		await user.click(within(select).getByRole('button', { name: '3개 분석하기' }));

		expect(suggestCalls()[0][1]).toMatchObject({ json: { linkIds: ['l1', 'l2', 'l4'] } });
	});

	test('고르기 창에서 취소하면 AI를 부르지 않는다', async () => {
		const user = userEvent.setup();
		renderButton();
		const select = await openSelect(user);

		await user.click(within(select).getByRole('button', { name: '취소' }));

		expect(suggestCalls()).toHaveLength(0);
	});

	test('남은 한도보다 링크가 많으면 오래된 링크부터 한도만큼만 체크되고 더 고를 수 없다', async () => {
		mockApi({ remaining: 2 });
		const user = userEvent.setup();
		renderButton();
		const select = await openSelect(user);

		expect(within(select).getByRole('checkbox', { name: '리액트 훅 정리' })).toBeChecked();
		expect(within(select).getByRole('checkbox', { name: '제주 맛집' })).toBeChecked();
		expect(within(select).getByRole('checkbox', { name: '아이폰 리뷰' })).toBeDisabled();
		expect(within(select).getByRole('button', { name: '2개 분석하기' })).toBeInTheDocument();
	});

	test('미리보기에 추천 폴더 경로, 맞는 폴더 없음, 못 보낸 개수를 보여준다', async () => {
		const { dialog } = await openPreview();

		expect(within(dialog).getByText('리액트 훅 정리')).toBeInTheDocument();
		expect(within(dialog).getByRole('button', { name: '개발 > 프론트' })).toBeInTheDocument();
		expect(within(dialog).getByText('www.youtube.com')).toBeInTheDocument();
		expect(within(dialog).getByRole('button', { name: '폴더 고르기' })).toBeInTheDocument();
		expect(within(dialog).getByText('나머지 2개는 자정이 지나면 다시 정리할 수 있어요')).toBeInTheDocument();
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

	test('목록에서 사라진 링크는 삭제된 링크로 보여준다', async () => {
		mockApi({
			suggest: async () => ({ ...suggestion, suggestions: [{ linkId: 'gone', folderId: 'trip' }], skipped: 0 }),
		});
		const { dialog } = await openPreview();

		expect(within(dialog).getByRole('checkbox', { name: '삭제된 링크' })).toBeInTheDocument();
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
		[429, '오늘은 다 썼어요, 자정이 지나면 다시 눌러주세요'],
		[503, '잠시 후 다시 눌러주세요'],
	])('추천이 %i이면 "%s"를 보여준다', async (status, message) => {
		mockApi({ suggest: () => Promise.reject(httpError(status)) });
		const user = userEvent.setup();
		renderButton();
		const select = await openSelect(user);

		await user.click(within(select).getByRole('button', { name: '4개 분석하기' }));

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

	test('남은 개수가 0이면 다 썼다고 알려주고 버튼을 누를 수 없다', async () => {
		vi.mocked(apiClient.get).mockImplementation(((url: string) => ({
			json: async () => (url === 'links/auto-sort/quota' ? { remaining: 0 } : folders),
		})) as never);
		renderButton();

		expect(await screen.findByText('오늘은 다 썼어요, 자정이 지나면 다시 정리할 수 있어요')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: '정리하기' })).toBeDisabled();
	});
});
