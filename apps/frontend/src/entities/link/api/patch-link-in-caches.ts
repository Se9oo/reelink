import type { QueryClient } from '@tanstack/react-query';

import { feedKeys } from '@/entities/link/api/get-feed';
import { patchLink } from '@/entities/link/model/patch-link';
import { Link } from '@/entities/link/model/types';

import { linkKeys, trashKeys } from '@/shared/api/query-keys';

export function patchLinkInCaches(
	queryClient: QueryClient,
	linkId: string,
	fieldsFrom: (cached: Link) => Partial<Link>,
) {
	for (const queryKey of [linkKeys.all, feedKeys.all, trashKeys.all]) {
		queryClient.setQueriesData({ queryKey }, (data) =>
			data === undefined ? data : patchLink(data, linkId, fieldsFrom),
		);
	}
}
