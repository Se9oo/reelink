import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';
import { linkKeys, trashKeys } from '@/shared/api/query-keys';

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
