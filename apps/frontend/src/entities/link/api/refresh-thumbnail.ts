import { useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import { linkKeys } from '@/entities/link/api/link-keys';
import { Link } from '@/entities/link/model/types';
import { trashKeys } from '@/entities/trash/api/trash-keys';

import { apiClient } from '@/shared/api/client';

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
				if (updated.thumbnailUrl !== failedUrl) {
					queryClient.invalidateQueries({ queryKey: linkKeys.all });
					queryClient.invalidateQueries({ queryKey: trashKeys.all });
				}
			})
			.catch(() => refreshingUrls.delete(failedUrl));
	}

	return { thumbnailUrl: link.thumbnailUrl === brokenUrl ? null : link.thumbnailUrl, onError };
}
