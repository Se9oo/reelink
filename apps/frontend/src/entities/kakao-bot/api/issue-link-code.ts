import { useMutation } from '@tanstack/react-query';

import { LinkCode } from '@/entities/kakao-bot/model/types';

import { apiClient } from '@/shared/api/client';

function issueLinkCode() {
	return apiClient.post('notifications/kakao-bot/link-code').json<LinkCode>();
}

export function useIssueLinkCode() {
	return useMutation({ mutationFn: issueLinkCode });
}
