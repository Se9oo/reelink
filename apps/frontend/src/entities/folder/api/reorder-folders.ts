import { useMutation } from '@tanstack/react-query';

import { Folder } from '@/entities/folder/model/types';

import { apiClient } from '@/shared/api/client';

function reorderFolders(folderIds: string[]) {
	return apiClient.patch('folders/reorder', { json: folderIds }).json<Folder[]>();
}

export function useReorderFolders() {
	return useMutation({ mutationFn: reorderFolders });
}
