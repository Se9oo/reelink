import { Folder } from '@/entities/folder/model/types';

import { apiClient } from '@/shared/api/client';

interface CreateFolderParams {
	name: string;
	parentFolderId?: string | null;
}

export function createFolder(params: CreateFolderParams) {
	return apiClient.post('folders', { json: params }).json<Folder>();
}
