import { useMutation, useQueryClient } from '@tanstack/react-query';

import { linkKeys } from '@/entities/link/api/link-keys';

import { apiClient } from '@/shared/api/client';

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
