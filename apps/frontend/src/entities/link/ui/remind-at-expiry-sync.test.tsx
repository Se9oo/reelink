import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { homeKeys } from '@/entities/link/api/get-home';
import { RemindAtExpirySync } from '@/entities/link/ui/remind-at-expiry-sync';

import { linkKeys } from '@/shared/api/query-keys';

const FOLDER_KEY = linkKeys.folder('f1');

type TestLink = { id: string; thumbnailUrl: null; remindAt: string | null };

function link(id: string, remindAt: string | null): TestLink {
	return { id, thumbnailUrl: null, remindAt };
}

function Watch({ queryKey, queryFn }: { queryKey: readonly unknown[]; queryFn: () => unknown }) {
	useQuery({ queryKey, queryFn, staleTime: Infinity });

	return null;
}

async function setup(folderLinks: TestLink[], home?: { upcoming: TestLink[]; recent: TestLink[] }) {
	const queryClient = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });
	const fetchHome = vi.fn(() => home);

	render(
		<QueryClientProvider client={queryClient}>
			<Watch queryKey={FOLDER_KEY} queryFn={() => folderLinks} />
			{home && <Watch queryKey={homeKeys.all} queryFn={fetchHome} />}
			<RemindAtExpirySync />
		</QueryClientProvider>,
	);
	await act(() => vi.advanceTimersByTimeAsync(0));

	return { queryClient, fetchHome };
}

function remindAtOf(queryClient: QueryClient, id: string) {
	return queryClient.getQueryData<TestLink[]>(FOLDER_KEY)?.find((item) => item.id === id)?.remindAt;
}

describe('RemindAtExpirySync', () => {
	beforeEach(() => {
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
		vi.setSystemTime(new Date('2026-11-23T12:00:00Z'));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	test('알림 시각이 되면 그 링크의 알림 표시만 지운다', async () => {
		const { queryClient } = await setup([link('soon', '2026-11-23T12:10:00Z'), link('later', '2026-11-23T15:00:00Z')]);

		expect(remindAtOf(queryClient, 'soon')).toBe('2026-11-23T12:10:00Z');

		await act(async () => {
			vi.advanceTimersByTime(10 * 60 * 1000);
		});

		expect(remindAtOf(queryClient, 'soon')).toBeNull();
		expect(remindAtOf(queryClient, 'later')).toBe('2026-11-23T15:00:00Z');
	});

	test('홈 알림 예약 목록에서는 카드를 빼고, 서버에 다시 요청하지 않는다', async () => {
		const soon = link('soon', '2026-11-23T12:10:00Z');
		const { queryClient, fetchHome } = await setup([], { upcoming: [soon], recent: [soon] });

		await act(async () => {
			vi.advanceTimersByTime(10 * 60 * 1000);
		});

		const home = queryClient.getQueryData<{ upcoming: TestLink[]; recent: TestLink[] }>(homeKeys.all);
		expect(home?.upcoming).toEqual([]);
		expect(home?.recent[0].remindAt).toBeNull();
		expect(fetchHome).toHaveBeenCalledTimes(1);
	});

	test('이미 지난 알림은 열자마자 지운다', async () => {
		const { queryClient } = await setup([link('past', '2026-11-23T11:00:00Z')]);

		expect(remindAtOf(queryClient, 'past')).toBeNull();
	});
});
