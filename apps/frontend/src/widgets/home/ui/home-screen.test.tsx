import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OverlayProvider } from 'overlay-kit';
import { SnackbarProvider } from 'seed-design/ui/snackbar';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { HomeScreen } from '@/widgets/home/ui/home-screen';

import { Link } from '@/entities/link/model/types';

import { apiClient } from '@/shared/api/client';

vi.mock('@/shared/api/client', () => ({
	apiClient: { get: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const { mockPush } = vi.hoisted(() => ({ mockPush: vi.fn() }));

vi.mock('next/navigation', () => ({
	useRouter: () => ({ push: mockPush }),
	useSearchParams: () => new URLSearchParams(),
}));

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
		remindAt: null,
		pinnedAt: null,
		deletedAt: null,
		viewedAt: null,
		...overrides,
	};
}

interface HomeData {
	remind: { unviewedCount: number; revisitCount: number; oldestUnviewed: Link | null; previews: Link[] };
	upcoming: Link[];
	stale: Link[];
	recent: Link[];
}

const oldLink = link({
	id: 'old',
	title: '예전에 본 글',
	savedReason: '다시 읽고 싶었던 글',
	status: 'viewed',
	url: 'https://old.com',
});

const busyHome: HomeData = {
	remind: { unviewedCount: 12, revisitCount: 5, oldestUnviewed: oldLink, previews: [oldLink] },
	upcoming: [link({ id: 'u1', title: '콘서트 티켓 오픈', remindAt: new Date(2030, 4, 3, 20, 0).toISOString() })],
	stale: [link({ id: 's1', title: '오래 묵힌 글', url: 'https://stale.com' })],
	recent: [
		link({ id: 'r1', title: '방금 저장한 글', createdAt: new Date().toISOString() }),
		link({ id: 'r2', title: '어제 저장한 글', url: 'https://yesterday.com' }),
	],
};

const emptyHome: HomeData = {
	remind: { unviewedCount: 0, revisitCount: 0, oldestUnviewed: null, previews: [] },
	upcoming: [],
	stale: [],
	recent: [],
};

function mockApi(home: HomeData = busyHome) {
	vi.mocked(apiClient.get).mockImplementation(((url: string) => ({
		json: async () => (url === 'auth/me' ? { nickname: '유저' } : home),
	})) as never);
	vi.mocked(apiClient.patch).mockImplementation((() => ({ json: async () => ({}) })) as never);
	vi.mocked(apiClient.delete).mockImplementation((async () => ({})) as never);
}

function renderHome() {
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

	render(
		<QueryClientProvider client={queryClient}>
			<OverlayProvider>
				<SnackbarProvider>
					<HomeScreen />
				</SnackbarProvider>
			</OverlayProvider>
		</QueryClientProvider>,
	);
}

describe('HomeScreen', () => {
	beforeEach(() => {
		mockPush.mockReset();
		mockApi();
	});

	test('닉네임이 들어간 인사, 안 본 링크 12개, 오늘 다시 볼 링크 5개, 리마인드 시작 버튼', async () => {
		renderHome();

		expect(await screen.findByText(/유저님/)).toBeInTheDocument();

		const entrance = screen.getByRole('region', { name: '오늘의 리마인드' });

		expect(entrance).toHaveTextContent('안 본 링크 12개, 오늘 다시 볼 링크 5개가 기다려요');
		expect(within(entrance).getByRole('button', { name: /리마인드 시작/ })).toBeInTheDocument();
	});

	test('알림 예약한 링크의 제목, 호스트, 알림 시각을 보여준다', async () => {
		renderHome();

		const section = await screen.findByRole('region', { name: '알림 예약한 링크' });

		expect(within(section).getByText('콘서트 티켓 오픈')).toBeInTheDocument();
		expect(within(section).getByText('react.dev')).toBeInTheDocument();
		expect(within(section).getByText('2030년 5월 3일 오후 8:00')).toBeInTheDocument();
	});

	test('오래 쌓인 링크의 볼래요는 새 탭으로 원래 링크를 열고 열람 처리한다', async () => {
		const user = userEvent.setup();
		renderHome();

		const section = await screen.findByRole('region', { name: '오래 쌓인 링크' });
		const view = within(section).getByRole('link', { name: '볼래요' });

		expect(within(section).getByText('오래 묵힌 글')).toBeInTheDocument();
		expect(view).toHaveAttribute('href', 'https://stale.com');
		expect(view).toHaveAttribute('target', '_blank');

		await user.click(view);

		expect(apiClient.patch).toHaveBeenCalledWith('links/s1/view');
	});

	test('오래 쌓인 링크의 지울래요를 누르면 삭제하고 실행 취소 안내를 보여준다', async () => {
		const user = userEvent.setup();
		renderHome();

		const section = await screen.findByRole('region', { name: '오래 쌓인 링크' });

		await user.click(within(section).getByRole('button', { name: '지울래요' }));

		expect(apiClient.delete).toHaveBeenCalledWith('links/s1');
		expect(await screen.findByText('링크를 삭제했어요')).toBeInTheDocument();
	});

	test('알림 예약한 링크와 오래 쌓인 링크가 없으면 섹션은 두고 빈 안내를 보여준다', async () => {
		mockApi({ ...busyHome, upcoming: [], stale: [] });
		renderHome();

		const upcoming = await screen.findByRole('region', { name: '알림 예약한 링크' });
		const stale = screen.getByRole('region', { name: '오래 쌓인 링크' });

		expect(within(upcoming).getByText('예약한 알림이 없어요')).toBeInTheDocument();
		expect(within(stale).getByText('오래 쌓인 링크가 없어요')).toBeInTheDocument();
		expect(within(stale).queryByRole('button', { name: '지울래요' })).not.toBeInTheDocument();
	});

	test('이번 주 기록은 보여주지 않는다', async () => {
		renderHome();

		await screen.findByRole('region', { name: '최근 저장한 링크' });

		expect(screen.queryByRole('region', { name: '이번 주 기록' })).not.toBeInTheDocument();
	});

	test('최근 저장한 링크의 제목을 보여준다', async () => {
		renderHome();

		const section = await screen.findByRole('region', { name: '최근 저장한 링크' });

		expect(within(section).getByText('방금 저장한 글')).toBeInTheDocument();
		expect(within(section).getByText('어제 저장한 글')).toBeInTheDocument();
	});

	test('리마인드 시작을 누르면 리마인드 화면으로 이동한다', async () => {
		const user = userEvent.setup();
		renderHome();

		await user.click(await screen.findByRole('button', { name: /리마인드 시작/ }));

		expect(mockPush).toHaveBeenCalledWith('/feed');
	});

	test('링크가 하나도 없으면 리마인드 입구 대신 첫 링크 저장 안내와 등록 버튼을 보여준다', async () => {
		mockApi(emptyHome);
		renderHome();

		expect(await screen.findByText('첫 링크를 저장해보세요')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: '링크 등록하기' })).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: /리마인드 시작/ })).not.toBeInTheDocument();
	});
});
