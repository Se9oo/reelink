'use client';

import { useEffect, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import { homeKeys, type HomeSummary } from '@/entities/link/api/get-home';
import { patchLinkInCaches } from '@/entities/link/api/patch-link-in-caches';
import { collectReminders, splitReminders } from '@/entities/link/model/remind-expiry';
import { useActiveLinkCache } from '@/entities/link/model/use-active-link-cache';

export function RemindAtExpirySync() {
	const queryClient = useQueryClient();
	const reminders = useActiveLinkCache(collectReminders);
	const [wakeCount, setWakeCount] = useState(0);

	useEffect(() => {
		const { expiredIds, nextDelayMs } = splitReminders(reminders, new Date());

		if (expiredIds.length > 0) {
			expiredIds.forEach((id) => patchLinkInCaches(queryClient, id, () => ({ remindAt: null })));
			queryClient.setQueryData<HomeSummary>(homeKeys.all, (home) =>
				home?.upcoming.some(({ id }) => expiredIds.includes(id))
					? { ...home, upcoming: home.upcoming.filter(({ id }) => !expiredIds.includes(id)) }
					: home,
			);
		}

		if (nextDelayMs === null) {
			return;
		}

		const timer = setTimeout(() => setWakeCount((count) => count + 1), nextDelayMs);

		return () => clearTimeout(timer);
	}, [reminders, wakeCount, queryClient]);

	return null;
}
