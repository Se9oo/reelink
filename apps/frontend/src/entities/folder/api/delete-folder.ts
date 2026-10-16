import { useMutation, useQueryClient } from '@tanstack/react-query';

import { folderKeys } from '@/entities/folder/api/folder-keys';
import { trashKeys } from '@/entities/trash/api/trash-keys';

import { apiClient } from '@/shared/api/client';

function deleteFolder(folderId: string) {
	return apiClient.delete(`folders/${folderId}`);
}

export function useDeleteFolder() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: deleteFolder,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: folderKeys.all });
			queryClient.invalidateQueries({ queryKey: trashKeys.all });
		},
	});
}
