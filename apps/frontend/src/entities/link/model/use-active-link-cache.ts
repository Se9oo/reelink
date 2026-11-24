import { useCallback, useMemo, useSyncExternalStore } from 'react';

import { notifyManager, type QueryCache, useQueryClient } from '@tanstack/react-query';

import { LINK_CACHE_KEYS } from '@/entities/link/api/patch-link-in-caches';

const LINK_DATA_KEYS: unknown[] = LINK_CACHE_KEYS.map(([root]) => root);

function readSnapshot<T>(cache: QueryCache, collect: (data: unknown) => T[]) {
	const entries = cache
		.findAll({ type: 'active' })
		.filter((query) => LINK_DATA_KEYS.includes(query.queryKey[0]))
		.flatMap((query) => collect(query.state.data))
		.map((entry) => JSON.stringify(entry));

	return `[${[...new Set(entries)].sort().join(',')}]`;
}

export function useActiveLinkCache<T>(collect: (data: unknown) => T[]): T[] {
	const cache = useQueryClient().getQueryCache();

	const subscribe = useCallback(
		(onChange: () => void) => {
			const notify = notifyManager.batchCalls(onChange);

			return cache.subscribe((event) => {
				if (LINK_DATA_KEYS.includes(event.query.queryKey[0])) {
					notify();
				}
			});
		},
		[cache],
	);
	const snapshot = useSyncExternalStore(
		subscribe,
		() => readSnapshot(cache, collect),
		() => '[]',
	);

	return useMemo(() => JSON.parse(snapshot) as T[], [snapshot]);
}
