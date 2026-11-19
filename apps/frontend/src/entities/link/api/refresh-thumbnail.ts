import { useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import { feedKeys } from '@/entities/link/api/get-feed';
import { patchLinkThumbnail } from '@/entities/link/model/patch-link-thumbnail';
import { Link } from '@/entities/link/model/types';

import { apiClient } from '@/shared/api/client';
import { linkKeys, trashKeys } from '@/shared/api/query-keys';

const refreshingUrls = new Set<string>();

function refreshThumbnail(linkId: string) {
	return apiClient.patch(`links/${linkId}/thumbnail`).json<Link>();
}

export function useLinkThumbnail(link: Link) {
	const queryClient = useQueryClient();
	const [brokenUrl, setBrokenUrl] = useState<string | null>(null);

	function onError() {
		const failedUrl = link.thumbnailUrl;
		setBrokenUrl(failedUrl);

		if (!failedUrl || refreshingUrls.has(failedUrl)) {
			return;
		}

		refreshingUrls.add(failedUrl);
		refreshThumbnail(link.id)
			.then((updated) => {
				for (const queryKey of [linkKeys.all, feedKeys.all, trashKeys.all]) {
					queryClient.setQueriesData({ queryKey }, (data) =>
						data === undefined ? data : patchLinkThumbnail(data, updated.id, updated.thumbnailUrl),
					);
				}
			})
			.catch(() => refreshingUrls.delete(failedUrl));
	}

	return { thumbnailUrl: link.thumbnailUrl === brokenUrl ? null : link.thumbnailUrl, onError };
}
