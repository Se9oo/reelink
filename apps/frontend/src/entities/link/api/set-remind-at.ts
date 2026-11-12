import { useMutation, useQueryClient } from '@tanstack/react-query';

import { linkKeys } from '@/entities/link/api/link-keys';
import { Link } from '@/entities/link/model/types';

import { apiClient } from '@/shared/api/client';

interface SetRemindAtParams {
	linkId: string;
	remindAt: Date | null;
}

function setRemindAt({ linkId, remindAt }: SetRemindAtParams) {
	return apiClient
		.patch(`links/${linkId}/remind`, { json: { remindAt: remindAt?.toISOString() ?? null } })
		.json<Link>();
}

export function useSetRemindAt() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: setRemindAt,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: linkKeys.all });
		},
	});
}
