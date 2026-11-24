'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';

import { getLinksByIds } from '@/entities/link/api/get-links-by-ids';
import { patchLinkInCaches } from '@/entities/link/api/patch-link-in-caches';
import { collectLinksWithoutOgTags, selectPendingIds } from '@/entities/link/model/pending-og-tags';
import { useActiveLinkCache } from '@/entities/link/model/use-active-link-cache';

const POLL_INTERVAL_MS = 1500;

export function PendingOgTagsSync() {
	const queryClient = useQueryClient();
	const entries = useActiveLinkCache(collectLinksWithoutOgTags);
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
