import { queryOptions } from '@tanstack/react-query';

import { folderKeys } from '@/entities/folder/api/folder-keys';
import { Folder } from '@/entities/folder/model/types';

import { apiClient } from '@/shared/api/client';

function getFolders() {
	return apiClient.get('folders').json<Folder[]>();
}

export function foldersQueryOptions() {
	return queryOptions({ queryKey: folderKeys.all, queryFn: getFolders });
}
