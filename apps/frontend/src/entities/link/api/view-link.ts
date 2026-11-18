import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';
import { linkKeys } from '@/shared/api/query-keys';

function viewLink(linkId: string) {
	return apiClient.patch(`links/${linkId}/view`).json();
}

export function useViewLink() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: viewLink,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: linkKeys.all });
		},
	});
}
