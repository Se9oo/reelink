import { Link } from '@/entities/link/model/types';

import { apiClient } from '@/shared/api/client';

export function getLinksByIds(ids: string[]) {
	return apiClient.get('links', { searchParams: { ids: ids.join(',') } }).json<Link[]>();
}
