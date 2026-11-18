import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';
import { folderKeys, linkKeys, trashKeys } from '@/shared/api/query-keys';

function restoreFolder(folderId: string) {
	return apiClient.post(`trash/folder/${folderId}/restore`);
}

export function useRestoreFolder() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: restoreFolder,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: trashKeys.all });
			queryClient.invalidateQueries({ queryKey: folderKeys.all });
			queryClient.invalidateQueries({ queryKey: linkKeys.all });
		},
	});
}
