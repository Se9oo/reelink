import { queryOptions } from '@tanstack/react-query';

import { Link } from '@/entities/link/model/types';

import { apiClient } from '@/shared/api/client';
import { linkKeys } from '@/shared/api/query-keys';

export const homeKeys = {
	all: [...linkKeys.all, 'home'] as const,
};

export interface HomeSummary {
	remind: {
		unviewedCount: number;
		revisitCount: number;
		oldestUnviewed: Link | null;
		previews: Link[];
	};
	upcoming: Link[];
	stale: Link[];
	recent: Link[];
}

function getHome() {
	return apiClient.get('links/home').json<HomeSummary>();
}

export function homeQueryOptions() {
	return queryOptions({ queryKey: homeKeys.all, queryFn: getHome });
}
