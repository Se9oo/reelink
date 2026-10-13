import { queryOptions } from '@tanstack/react-query';

import { userKeys } from '@/entities/user/api/user-keys';
import { User } from '@/entities/user/model/types';

import { apiClient } from '@/shared/api/client';

function getMe() {
	return apiClient.get('auth/me').json<User>();
}

export function meQueryOptions() {
	return queryOptions({ queryKey: userKeys.me, queryFn: getMe });
}
