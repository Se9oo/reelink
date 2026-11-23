import { useEffect, useReducer } from 'react';

import { ogWaitRemainingMs } from '@/entities/link/model/pending-og-tags';
import { Link } from '@/entities/link/model/types';

export function useOgWaiting(link: Link) {
	const [, rerender] = useReducer((count: number) => count + 1, 0);

	useEffect(() => {
		const remaining = ogWaitRemainingMs(link, new Date());

		if (remaining === 0) {
			return;
		}

		const timer = setTimeout(rerender, remaining);

		return () => clearTimeout(timer);
	}, [link]);

	return ogWaitRemainingMs(link, new Date()) > 0;
}
