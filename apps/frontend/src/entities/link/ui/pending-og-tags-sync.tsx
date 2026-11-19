'use client';

import { useCallback, useSyncExternalStore } from 'react';

import { notifyManager, type QueryCache, useQuery, useQueryClient } from '@tanstack/react-query';

import { getLinksByIds } from '@/entities/link/api/get-links-by-ids';
import { patchLinkInCaches } from '@/entities/link/api/patch-link-in-caches';
import {
	collectLinksWithoutOgTags,
	type LinkWithoutOgTags,
	selectPendingIds,
} from '@/entities/link/model/pending-og-tags';

const LINK_DATA_KEYS = ['links', 'feed', 'trash'];
const TRACKED_KEYS = [...LINK_DATA_KEYS, 'og-pending'];
const POLL_INTERVAL_MS = 1500;

function readSnapshot(cache: QueryCache) {
	return cache
		.findAll({ type: 'active' })
		.filter((query) => LINK_DATA_KEYS.includes(String(query.queryKey[0])))
		.flatMap((query) => collectLinksWithoutOgTags(query.state.data))
		.map(({ id, createdAt }) => `${id}|${createdAt}`)
		.sort()
		.join(',');
}

function parseSnapshot(snapshot: string): LinkWithoutOgTags[] {
	return snapshot === ''
		? []
		: snapshot.split(',').map((entry) => {
				const [id, createdAt] = entry.split('|');

				return { id, createdAt };
			});
}

export function PendingOgTagsSync() {
	const queryClient = useQueryClient();
	const cache = queryClient.getQueryCache();

	const subscribe = useCallback(
		(onChange: () => void) => {
			const notify = notifyManager.batchCalls(onChange);

			return cache.subscribe((event) => {
				if (TRACKED_KEYS.includes(String(event.query.queryKey[0]))) {
					notify();
				}
			});
		},
		[cache],
	);
	const snapshot = useSyncExternalStore(
		subscribe,
		() => readSnapshot(cache),
		() => '',
	);

	const entries = parseSnapshot(snapshot);
	const ids = selectPendingIds(entries, new Date());

	useQuery({
		queryKey: ['og-pending', ...ids],
		queryFn: async () => {
			const links = await getLinksByIds(ids);

			links
				.filter((link) => link.title !== null || link.thumbnailUrl !== null)
				.forEach((link) =>
					patchLinkInCaches(queryClient, link.id, (cached) => ({
						title: cached.title ?? link.title,
						thumbnailUrl: link.thumbnailUrl,
					})),
				);

			return links;
		},
		enabled: ids.length > 0,
		retry: false,
		refetchInterval: () => (selectPendingIds(entries, new Date()).length > 0 ? POLL_INTERVAL_MS : false),
	});

	return null;
}
