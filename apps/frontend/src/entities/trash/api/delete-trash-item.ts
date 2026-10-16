import { useMutation, useQueryClient } from '@tanstack/react-query';

import { trashKeys } from '@/entities/trash/api/trash-keys';

import { apiClient } from '@/shared/api/client';

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
