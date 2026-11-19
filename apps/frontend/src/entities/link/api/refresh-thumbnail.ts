import { useState } from 'react';

import { useIsMutating, useMutation, useQueryClient } from '@tanstack/react-query';

import { feedKeys } from '@/entities/link/api/get-feed';
import { patchLinkThumbnail } from '@/entities/link/model/patch-link-thumbnail';
import { Link } from '@/entities/link/model/types';

import { apiClient } from '@/shared/api/client';
import { linkKeys, trashKeys } from '@/shared/api/query-keys';

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
		onSuccess: (updated) => {
			for (const queryKey of [linkKeys.all, feedKeys.all, trashKeys.all]) {
				queryClient.setQueriesData({ queryKey }, (data) =>
					data === undefined ? data : patchLinkThumbnail(data, updated.id, updated.thumbnailUrl),
				);
			}
		},
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
