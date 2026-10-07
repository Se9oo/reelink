import { Link } from '@/entities/link/model/types';

import { apiClient } from '@/shared/api/client';

interface CreateLinkParams {
	url: string;
	folderId: string;
	savedReason?: string;
}

export function createLink(params: CreateLinkParams) {
	return apiClient.post('links', { json: params }).json<Link>();
}
