import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';
import { folderKeys, trashKeys } from '@/shared/api/query-keys';

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
