import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';
import { trashKeys } from '@/shared/api/query-keys';

interface DeleteTrashItemParams {
	type: 'folder' | 'link';
	id: string;
}

function deleteTrashItem({ type, id }: DeleteTrashItemParams) {
	return apiClient.delete(`trash/${type}/${id}`);
}

export function useDeleteTrashItem() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: deleteTrashItem,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: trashKeys.all });
		},
	});
}
