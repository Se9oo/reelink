import { keepPreviousData, queryOptions } from '@tanstack/react-query';

import { linkKeys } from '@/entities/link/api/link-keys';
import { Link } from '@/entities/link/model/types';

import { apiClient } from '@/shared/api/client';

function searchLinks(query: string, signal: AbortSignal) {
	return apiClient.get('links/search', { searchParams: { q: query }, signal }).json<Link[]>();
}

export function searchLinksQueryOptions(query: string) {
	return queryOptions({
		queryKey: linkKeys.search(query),
		queryFn: ({ signal }) => searchLinks(query, signal),
		enabled: query.length > 0,
		placeholderData: keepPreviousData,
	});
}
