import { queryOptions } from '@tanstack/react-query';

import { kakaoBotKeys } from '@/entities/kakao-bot/api/kakao-bot-keys';
import { LinkStatus } from '@/entities/kakao-bot/model/types';

import { apiClient } from '@/shared/api/client';

function getLinkStatus() {
	return apiClient.get('notifications/kakao-bot/link-status').json<LinkStatus>();
}

export function linkStatusQueryOptions() {
	return queryOptions({ queryKey: kakaoBotKeys.linkStatus, queryFn: getLinkStatus });
}
