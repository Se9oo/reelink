import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OverlayProvider } from 'overlay-kit';
import { SnackbarProvider } from 'seed-design/ui/snackbar';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { RemindFeed } from '@/widgets/remind-feed/ui/remind-feed';

import { Folder } from '@/entities/folder/model/types';
import { Link } from '@/entities/link/model/types';

import { apiClient } from '@/shared/api/client';

const { mockPush } = vi.hoisted(() => ({ mockPush: vi.fn() }));

vi.mock('next/navigation', () => ({
	useRouter: () => ({ push: mockPush }),
}));

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

function mockApi(unviewed: Link[], revisit: Link[] = []) {
	vi.mocked(apiClient.get).mockImplementation(((url: string) => ({
		json: async () => (url === 'folders' ? folders : { unviewed, revisit }),
	})) as never);
}

const revisitLinks = [
	link({
		id: 'r1',
		title: '예전에 본 글',
		savedReason: '다시 읽고 싶었던 글',
		status: 'viewed',
		url: 'https://old.com',
	}),
];

function renderFeed() {
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

	render(
		<QueryClientProvider client={queryClient}>
			<OverlayProvider>
				<SnackbarProvider>
					<RemindFeed />
				</SnackbarProvider>
			</OverlayProvider>
		</QueryClientProvider>,
	);
}

async function chooseMoreMenuItem(user: ReturnType<typeof userEvent.setup>, itemName: string) {
	const trigger = (await screen.findAllByRole('button', { name: '더보기' }))[0];
	await user.click(trigger);

	const menu = document.getElementById(trigger.getAttribute('aria-controls') ?? '');
	await user.click(within(menu as HTMLElement).getByRole('menuitem', { name: itemName }));
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

	test('보여줄 링크가 없으면 다시 볼 링크가 없다는 안내를 보여준다', async () => {
		mockApi([]);
		renderFeed();

		expect(await screen.findByText('지금은 다시 볼 링크가 없어요')).toBeInTheDocument();
		expect(screen.getByText('나중에 볼 링크를 저장하면, 잊기 전에 여기서 다시 보여드릴게요')).toBeInTheDocument();
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

	test('복사를 누르면 링크 주소를 복사하고 안내 스낵바를 띄운다', async () => {
		const user = userEvent.setup();
		const writeText = vi.spyOn(navigator.clipboard, 'writeText');
		mockApi(feed);
		renderFeed();

		await user.click((await screen.findAllByRole('button', { name: '복사' }))[0]);

		expect(writeText).toHaveBeenCalledWith('https://react.dev');
		expect(await screen.findByText('링크를 복사했어요')).toBeInTheDocument();
	});

	test('더보기에서 링크 수정을 저장하면 카드 내용이 바로 바뀐다', async () => {
		const user = userEvent.setup();
		mockApi(feed);
		vi.mocked(apiClient.patch).mockReturnValue({
			json: async () => ({ ...feed[0], savedReason: '이번 주말에 꼭 해보기' }),
		} as never);
		renderFeed();

		await chooseMoreMenuItem(user, '링크 수정');

		const reason = await screen.findByRole('textbox', { name: /저장 이유/ });
		await user.clear(reason);
		await user.type(reason, '이번 주말에 꼭 해보기');
		await user.click(screen.getByRole('button', { name: '저장' }));

		expect(await screen.findByText('이번 주말에 꼭 해보기')).toBeInTheDocument();
		expect(screen.queryByText('배포 전에 따라 해보기')).not.toBeInTheDocument();
	});

	test('더보기에서 폴더로 가기를 누르면 그 링크가 있는 폴더로 이동한다', async () => {
		const user = userEvent.setup();
		mockApi(feed);
		renderFeed();

		await chooseMoreMenuItem(user, '폴더로 가기');

		expect(mockPush).toHaveBeenCalledWith('/folders/f1');
	});

	test('안 본 링크 다음에 구분 카드와 다시 보기 링크를 이어서 보여준다', async () => {
		mockApi(feed, revisitLinks);
		renderFeed();

		expect(await screen.findByText('안 본 링크를 다 봤어요!')).toBeInTheDocument();
		expect(screen.getByText('다시 읽고 싶었던 글')).toBeInTheDocument();
		expect(screen.getByText('다시 보기')).toBeInTheDocument();
		expect(screen.getByText('2 / 2')).toBeInTheDocument();
	});

	test('안 본 링크가 없어도 다시 볼 링크가 있으면 빈 안내 대신 다시 보기를 보여준다', async () => {
		mockApi([], revisitLinks);
		renderFeed();

		expect(await screen.findByText('다시 읽고 싶었던 글')).toBeInTheDocument();
		expect(screen.queryByText('지금은 다시 볼 링크가 없어요')).not.toBeInTheDocument();
	});

	test('다시 보기 링크를 열면 새 탭으로 열고 열람 처리 API는 다시 부르지 않는다', async () => {
		const user = userEvent.setup();
		mockApi([], revisitLinks);
		renderFeed();

		await user.click(await screen.findByRole('link', { name: /예전에 본 글/ }));

		expect(apiClient.patch).not.toHaveBeenCalled();
	});

	test('보여줄 링크가 하나도 없으면 링크 등록 버튼을 함께 보여준다', async () => {
		mockApi([]);
		renderFeed();

		expect(await screen.findByRole('button', { name: '링크 등록하기' })).toBeInTheDocument();
	});

	test('목록 맨 끝에 오늘은 여기까지 카드를 붙인다', async () => {
		mockApi(feed, revisitLinks);
		renderFeed();

		expect(await screen.findByText('오늘은 여기까지!')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: '링크 등록하기' })).toBeInTheDocument();
	});

	test('이미 봤어요 처리한 카드는 다시 열어도 열람 처리 API를 다시 부르지 않는다', async () => {
		const user = userEvent.setup();
		mockApi(feed);
		renderFeed();

		const card = await screen.findByRole('link', { name: /도커 컴포즈 정리/ });
		await user.click(card);
		await user.click(card);

		await waitFor(() => expect(apiClient.patch).toHaveBeenCalledTimes(1));
	});

	test('버튼에 포커스가 있을 때 Backspace나 Delete를 눌러도 카드를 지우지 않는다', async () => {
		const user = userEvent.setup();
		mockApi(feed);
		renderFeed();

		await user.click((await screen.findAllByRole('button', { name: '복사' }))[0]);
		await user.keyboard('{Backspace}{Delete}');

		expect(apiClient.delete).not.toHaveBeenCalled();
		expect(screen.getByText('도커 컴포즈 정리')).toBeInTheDocument();
	});

	test('목록에 포커스가 있을 때 Delete를 누르면 현재 카드를 지운다', async () => {
		const user = userEvent.setup();
		mockApi(feed);
		renderFeed();

		await screen.findByText('도커 컴포즈 정리');
		screen.getByLabelText('리마인드').focus();
		await user.keyboard('{Delete}');

		await waitFor(() => expect(apiClient.delete).toHaveBeenCalledWith('links/l1'));
	});
});
