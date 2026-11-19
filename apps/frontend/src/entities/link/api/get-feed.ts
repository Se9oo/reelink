import { queryOptions } from '@tanstack/react-query';

import { Link } from '@/entities/link/model/types';

import { apiClient } from '@/shared/api/client';

export const feedKeys = {
	all: ['feed'] as const,
};

export interface Feed {
	unviewed: Link[];
	revisit: Link[];
}

function getFeed() {
	return apiClient.get('links/feed').json<Feed>();
}

export function feedQueryOptions() {
	return queryOptions({
		queryKey: feedKeys.all,
		queryFn: getFeed,
		refetchOnWindowFocus: false,
	});
}
