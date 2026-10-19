import { useMutation, useQueryClient } from '@tanstack/react-query';

import { linkKeys } from '@/entities/link/api/link-keys';
import { Link } from '@/entities/link/model/types';

import { apiClient } from '@/shared/api/client';

export interface UpdateLinkFields {
	title?: string | null;
	savedReason?: string | null;
}

interface UpdateLinkParams extends UpdateLinkFields {
	linkId: string;
}

function updateLink({ linkId, ...fields }: UpdateLinkParams) {
	return apiClient.patch(`links/${linkId}`, { json: fields }).json<Link>();
}

export function useUpdateLink() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: updateLink,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: linkKeys.all });
		},
	});
}
