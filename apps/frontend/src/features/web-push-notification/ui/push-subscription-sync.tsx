'use client';

import { useEffect } from 'react';

import { useQuery } from '@tanstack/react-query';

import { syncWebPush } from '@/features/web-push-notification/lib/browser-push';
import { readPushEnvironment } from '@/features/web-push-notification/lib/push-environment';

import { meQueryOptions } from '@/entities/user/api/get-me';

export function PushSubscriptionSync() {
	const { data: me } = useQuery(meQueryOptions());
	const memberId = me && !me.isGuest ? me.id : null;

	useEffect(() => {
		const environment = readPushEnvironment();

		if (memberId && (environment === 'desktop' || environment === 'mobile')) {
			syncWebPush().catch(() => {});
		}
	}, [memberId]);

	return null;
}
