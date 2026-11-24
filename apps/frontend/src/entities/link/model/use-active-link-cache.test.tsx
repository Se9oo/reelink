import type { ReactNode } from 'react';

import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { act, render, renderHook } from '@testing-library/react';
import { describe, expect, test } from 'vitest';

import { useActiveLinkCache } from '@/entities/link/model/use-active-link-cache';

import { linkKeys } from '@/shared/api/query-keys';

function collectIds(data: unknown): { id: string }[] {
	return Array.isArray(data) ? data.map(({ id }: { id: string }) => ({ id })) : [];
}

function Watch({ queryKey, data }: { queryKey: readonly unknown[]; data: unknown }) {
	useQuery({ queryKey, queryFn: () => data, initialData: data, staleTime: Infinity });

	return null;
}

describe('useActiveLinkCache', () => {
	test('지금 화면에서 쓰는 링크 캐시에서만 모으고, 같은 항목은 한 번만 돌려준다', async () => {
		const queryClient = new QueryClient();
		queryClient.setQueryData(linkKeys.folder('inactive'), [{ id: 'old' }]);
		const wrapper = ({ children }: { children: ReactNode }) => (
			<QueryClientProvider client={queryClient}>
				<Watch queryKey={linkKeys.folder('a')} data={[{ id: 'x' }, { id: 'y' }]} />
				<Watch queryKey={linkKeys.search('q')} data={[{ id: 'x' }]} />
				<Watch queryKey={['folders']} data={[{ id: 'folder' }]} />
				{children}
			</QueryClientProvider>
		);

		const { result } = renderHook(() => useActiveLinkCache(collectIds), { wrapper });

		await act(async () => {});

		expect(result.current).toEqual([{ id: 'x' }, { id: 'y' }]);
	});

	test('캐시 내용이 같으면 같은 배열을 돌려줘 effect가 다시 돌지 않게 한다', async () => {
		const queryClient = new QueryClient();
		const seen: unknown[] = [];

		function Probe() {
			seen.push(useActiveLinkCache(collectIds));

			return null;
		}

		render(
			<QueryClientProvider client={queryClient}>
				<Watch queryKey={linkKeys.folder('a')} data={[{ id: 'x' }]} />
				<Probe />
			</QueryClientProvider>,
		);
		await act(async () => {
			queryClient.setQueryData(linkKeys.folder('a'), [{ id: 'x' }]);
		});

		expect(new Set(seen.slice(1)).size).toBe(1);
	});
});
