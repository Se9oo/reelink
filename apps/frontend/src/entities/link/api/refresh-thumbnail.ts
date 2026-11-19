import { useState } from 'react';

import { useIsMutating, useMutation, useQueryClient } from '@tanstack/react-query';

import { patchLinkInCaches } from '@/entities/link/api/patch-link-in-caches';
import { Link } from '@/entities/link/model/types';

import { apiClient } from '@/shared/api/client';

const attemptedUrls = new Set<string>();

interface RefreshThumbnailParams {
	linkId: string;
	failedUrl: string;
}

function refreshThumbnail({ linkId }: RefreshThumbnailParams) {
	return apiClient.patch(`links/${linkId}/thumbnail`).json<Link>();
}

export function useLinkThumbnail(link: Link) {
	const queryClient = useQueryClient();
	const [brokenUrl, setBrokenUrl] = useState<string | null>(null);
	const [pending, setPending] = useState(false);
	const mutationKey = ['refresh-thumbnail', link.id];
	const isMutating = useIsMutating({ mutationKey }) > 0;
	const { mutate } = useMutation({
		mutationKey,
		mutationFn: refreshThumbnail,
		onSuccess: (updated) => patchLinkInCaches(queryClient, updated),
		onError: (_error, { failedUrl }) => {
			attemptedUrls.delete(failedUrl);
		},
	});

	function onError() {
		const failedUrl = link.thumbnailUrl;
		setBrokenUrl(failedUrl);

		if (!failedUrl || attemptedUrls.has(failedUrl)) {
			return;
		}

		attemptedUrls.add(failedUrl);
		setPending(true);
		mutate({ linkId: link.id, failedUrl }, { onSettled: () => setPending(false) });
	}

	const broken = brokenUrl !== null && link.thumbnailUrl === brokenUrl;

	return {
		thumbnailUrl: broken ? null : link.thumbnailUrl,
		refreshing: broken && (pending || isMutating),
		onError,
	};
}
