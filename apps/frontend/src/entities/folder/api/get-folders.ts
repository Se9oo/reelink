import { queryOptions } from '@tanstack/react-query';

import { Folder } from '@/entities/folder/model/types';

import { apiClient } from '@/shared/api/client';
import { folderKeys } from '@/shared/api/query-keys';

function getFolders() {
	return apiClient.get('folders').json<Folder[]>();
}

export function foldersQueryOptions() {
	return queryOptions({ queryKey: folderKeys.all, queryFn: getFolders });
}
