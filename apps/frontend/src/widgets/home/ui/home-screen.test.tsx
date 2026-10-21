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
	apiClient: { get: vi.fn() },
}));

const { mockPush } = vi.hoisted(() => ({ mockPush: vi.fn() }));

vi.mock('next/navigation', () => ({
	useRouter: () => ({ push: mockPush }),
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
		pinnedAt: null,
		deletedAt: null,
		viewedAt: null,
		...overrides,
	};
}

interface HomeData {
	remind: { unviewedCount: number; revisitCount: number; oldestUnviewed: Link | null; previews: Link[] };
	week: { saved: number; viewed: number; cleaned: number; viewedLastWeek: number };
	recent: Link[];
	throwbacks: { label: 'oneMonth' | 'threeMonths'; link: Link }[];
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
	week: { saved: 6, viewed: 4, cleaned: 2, viewedLastWeek: 2 },
	recent: [
		link({ id: 'r1', title: '방금 저장한 글', createdAt: new Date().toISOString() }),
		link({ id: 'r2', title: '어제 저장한 글', url: 'https://yesterday.com' }),
	],
	throwbacks: [
		{ label: 'oneMonth', link: link({ id: 't1', title: '한 달 전에 저장한 글', url: 'https://month.com' }) },
	],
};

const emptyHome: HomeData = {
	remind: { unviewedCount: 0, revisitCount: 0, oldestUnviewed: null, previews: [] },
	week: { saved: 0, viewed: 0, cleaned: 0, viewedLastWeek: 0 },
	recent: [],
	throwbacks: [],
};

function mockApi(home: HomeData = busyHome) {
	vi.mocked(apiClient.get).mockImplementation(((url: string) => ({
		json: async () => (url === 'auth/me' ? { nickname: '유저' } : home),
	})) as never);
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

	test('이번 주 기록의 저장·봤어요·정리했어요 숫자를 보여준다', async () => {
		renderHome();

		const section = await screen.findByRole('region', { name: '이번 주 기록' });

		expect(within(section).getByText('저장').nextElementSibling).toHaveTextContent('6');
		expect(within(section).getByText('봤어요').nextElementSibling).toHaveTextContent('4');
		expect(within(section).getByText('정리했어요').nextElementSibling).toHaveTextContent('2');
	});

	test('저번 주보다 많이 봤을 때만 칭찬 문구를 보여준다', async () => {
		renderHome();

		expect(await screen.findByText('저번 주보다 2개 더 봤어요.')).toBeInTheDocument();
	});

	test('저번 주보다 적게 봤으면 칭찬 문구를 보여주지 않는다', async () => {
		mockApi({ ...busyHome, week: { saved: 6, viewed: 1, cleaned: 2, viewedLastWeek: 3 } });
		renderHome();

		await screen.findByRole('region', { name: '이번 주 기록' });

		expect(screen.queryByText(/저번 주보다/)).not.toBeInTheDocument();
	});

	test('최근 저장한 링크의 제목을 보여준다', async () => {
		renderHome();

		const section = await screen.findByRole('region', { name: '최근 저장한 링크' });

		expect(within(section).getByText('방금 저장한 글')).toBeInTheDocument();
		expect(within(section).getByText('어제 저장한 글')).toBeInTheDocument();
	});

	test('그때 저장한 링크는 시점 라벨과 제목을 보여준다', async () => {
		renderHome();

		expect(await screen.findByText('한 달 전 오늘')).toBeInTheDocument();
		expect(screen.getByText('한 달 전에 저장한 글')).toBeInTheDocument();
	});

	test('그때 저장한 링크가 없으면 그 섹션을 보여주지 않는다', async () => {
		mockApi({ ...busyHome, throwbacks: [] });
		renderHome();

		await screen.findByRole('region', { name: '이번 주 기록' });

		expect(screen.queryByRole('region', { name: '그때 저장한 링크' })).not.toBeInTheDocument();
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
