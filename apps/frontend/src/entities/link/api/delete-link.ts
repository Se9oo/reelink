import { useMutation, useQueryClient } from '@tanstack/react-query';

import { linkKeys } from '@/entities/link/api/link-keys';
import { trashKeys } from '@/entities/trash/api/trash-keys';

import { apiClient } from '@/shared/api/client';

function deleteLink(linkId: string) {
	return apiClient.delete(`links/${linkId}`);
}

export function useDeleteLink() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: deleteLink,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: linkKeys.all });
			queryClient.invalidateQueries({ queryKey: trashKeys.all });
		},
	});
}
