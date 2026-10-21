import { queryOptions } from '@tanstack/react-query';

import { Link } from '@/entities/link/model/types';

import { apiClient } from '@/shared/api/client';

export const homeKeys = {
	all: ['home'] as const,
};

export interface HomeSummary {
	remind: {
		unviewedCount: number;
		revisitCount: number;
		oldestUnviewed: Link | null;
		previews: Link[];
	};
	week: { saved: number; viewed: number; cleaned: number; viewedLastWeek: number };
	recent: Link[];
	throwbacks: { label: 'oneMonth' | 'threeMonths'; link: Link }[];
}

function getHome() {
	return apiClient.get('links/home').json<HomeSummary>();
}

export function homeQueryOptions() {
	return queryOptions({ queryKey: homeKeys.all, queryFn: getHome });
}
