import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';
import { folderKeys, linkKeys, trashKeys } from '@/shared/api/query-keys';

function restoreLink(linkId: string) {
	return apiClient.post(`trash/link/${linkId}/restore`);
}

export function useRestoreLink() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: restoreLink,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: trashKeys.all });
			queryClient.invalidateQueries({ queryKey: folderKeys.all });
			queryClient.invalidateQueries({ queryKey: linkKeys.all });
		},
	});
}
