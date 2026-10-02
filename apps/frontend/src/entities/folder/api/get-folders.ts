import { Folder } from '@/entities/folder/model/types';

import { apiClient } from '@/shared/api/client';

export function getFolders() {
	return apiClient.get('folders').json<Folder[]>();
}
