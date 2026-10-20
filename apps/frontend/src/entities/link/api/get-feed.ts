import { queryOptions } from '@tanstack/react-query';

import { Link } from '@/entities/link/model/types';

import { apiClient } from '@/shared/api/client';

export const feedKeys = {
	all: ['feed'] as const,
};

function getFeed() {
	return apiClient.get('links/feed').json<Link[]>();
}

export function feedQueryOptions() {
	return queryOptions({
		queryKey: feedKeys.all,
		queryFn: getFeed,
		refetchOnWindowFocus: false,
	});
}
