import { useMutation, useQueryClient } from '@tanstack/react-query';

import { linkKeys } from '@/entities/link/api/link-keys';
import { Link } from '@/entities/link/model/types';

import { apiClient } from '@/shared/api/client';

interface PinLinkParams {
	linkId: string;
	pinned: boolean;
}

function pinLink({ linkId, pinned }: PinLinkParams) {
	return apiClient.patch(`links/${linkId}/pin`, { json: { pinned } }).json<Link>();
}

export function usePinLink() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: pinLink,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: linkKeys.all });
		},
	});
}
