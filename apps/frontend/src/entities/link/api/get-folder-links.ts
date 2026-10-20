import { queryOptions } from '@tanstack/react-query';

import { linkKeys } from '@/entities/link/api/link-keys';
import { hasPendingOgTags } from '@/entities/link/model/has-pending-og-tags';
import { Link } from '@/entities/link/model/types';

import { apiClient } from '@/shared/api/client';
import { shouldRetry } from '@/shared/api/should-retry';

function getFolderLinks(folderId: string) {
	return apiClient.get(`folders/${folderId}/links`).json<Link[]>();
}

export function folderLinksQueryOptions(folderId: string) {
	return queryOptions({
		queryKey: linkKeys.folder(folderId),
		queryFn: () => getFolderLinks(folderId),
		retry: shouldRetry,
		refetchInterval: (query) => (hasPendingOgTags(query.state.data) ? 1500 : false),
	});
}
