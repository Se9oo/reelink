import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';
import { linkKeys } from '@/shared/api/query-keys';

function unviewLink(linkId: string) {
	return apiClient.patch(`links/${linkId}/unview`).json();
}

export function useUnviewLink() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: unviewLink,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: linkKeys.all });
		},
	});
}
