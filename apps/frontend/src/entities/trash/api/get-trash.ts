import { queryOptions } from '@tanstack/react-query';

import { trashKeys } from '@/entities/trash/api/trash-keys';
import { TrashResponse } from '@/entities/trash/model/types';

import { apiClient } from '@/shared/api/client';

function getTrash() {
	return apiClient.get('trash').json<TrashResponse>();
}

export function trashQueryOptions() {
	return queryOptions({ queryKey: trashKeys.all, queryFn: getTrash });
}
