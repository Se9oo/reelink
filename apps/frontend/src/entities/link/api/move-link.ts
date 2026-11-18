import { useMutation, useQueryClient } from '@tanstack/react-query';

import { Link } from '@/entities/link/model/types';

import { apiClient } from '@/shared/api/client';
import { linkKeys } from '@/shared/api/query-keys';

interface MoveLinkParams {
	linkId: string;
	folderId: string;
}

function moveLink({ linkId, folderId }: MoveLinkParams) {
	return apiClient.patch(`links/${linkId}/folder`, { json: { folderId } }).json<Link>();
}

export function useMoveLink() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: moveLink,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: linkKeys.all });
		},
	});
}
