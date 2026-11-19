import { queryOptions } from '@tanstack/react-query';

import { Link } from '@/entities/link/model/types';

import { apiClient } from '@/shared/api/client';
import { linkKeys } from '@/shared/api/query-keys';
import { shouldRetry } from '@/shared/api/should-retry';

function getFolderLinks(folderId: string) {
	return apiClient.get(`folders/${folderId}/links`).json<Link[]>();
}

export function folderLinksQueryOptions(folderId: string) {
	return queryOptions({
		queryKey: linkKeys.folder(folderId),
		queryFn: () => getFolderLinks(folderId),
		retry: shouldRetry,
	});
}
