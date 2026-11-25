import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';

import { Link } from '@/entities/link/model/types';

import { apiClient } from '@/shared/api/client';
import { autoSortKeys, linkKeys } from '@/shared/api/query-keys';
import { shouldRetry } from '@/shared/api/should-retry';

export interface AutoSortSuggestion {
	suggestions: { linkId: string; folderId: string | null }[];
	remaining: number;
	skipped: number;
}

export interface LinkMove {
	linkId: string;
	folderId: string;
	source: 'ai' | 'user';
}

function getAutoSortQuota() {
	return apiClient.get('links/auto-sort/quota').json<{ remaining: number }>();
}

export function autoSortQuotaQueryOptions() {
	return queryOptions({ queryKey: autoSortKeys.quota, queryFn: getAutoSortQuota, retry: shouldRetry });
}

function suggestAutoSort({ folderId, linkIds }: { folderId: string; linkIds: string[] }) {
	return apiClient
		.post(`folders/${folderId}/auto-sort`, { json: { linkIds }, timeout: 30_000 })
		.json<AutoSortSuggestion>();
}

export function useSuggestAutoSort() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: suggestAutoSort,
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: autoSortKeys.quota });
		},
	});
}

function moveLinks(moves: LinkMove[]) {
	return apiClient.post('links/move', { json: { moves } }).json<Link[]>();
}

export function useMoveLinks() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: moveLinks,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: linkKeys.all });
		},
	});
}
