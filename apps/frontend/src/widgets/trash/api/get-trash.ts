import { queryOptions } from '@tanstack/react-query';

import { TrashResponse } from '@/widgets/trash/model/types';

import { apiClient } from '@/shared/api/client';
import { trashKeys } from '@/shared/api/query-keys';

function getTrash() {
	return apiClient.get('trash').json<TrashResponse>();
}

export function trashQueryOptions() {
	return queryOptions({ queryKey: trashKeys.all, queryFn: getTrash });
}
