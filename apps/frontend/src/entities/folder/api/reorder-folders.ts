import { useMutation, useQueryClient } from '@tanstack/react-query';

import { folderKeys } from '@/entities/folder/api/folder-keys';
import { Folder } from '@/entities/folder/model/types';

import { apiClient } from '@/shared/api/client';

function reorderFolders(folderIds: string[]) {
	return apiClient.patch('folders/reorder', { json: folderIds }).json<Folder[]>();
}

export function useReorderFolders() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: reorderFolders,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: folderKeys.all });
		},
	});
}
