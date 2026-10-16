import { useMutation, useQueryClient } from '@tanstack/react-query';

import { folderKeys } from '@/entities/folder/api/folder-keys';
import { trashKeys } from '@/entities/trash/api/trash-keys';

import { apiClient } from '@/shared/api/client';

interface RestoreItemParams {
	type: 'folder' | 'link';
	id: string;
}

function restoreItem({ type, id }: RestoreItemParams) {
	return apiClient.post(`trash/${type}/${id}/restore`);
}

export function useRestoreItem() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: restoreItem,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: trashKeys.all });
			queryClient.invalidateQueries({ queryKey: folderKeys.all });
		},
	});
}
