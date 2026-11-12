'use client';

import Link from 'next/link';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ActionButton } from 'seed-design/ui/action-button';
import { Snackbar, useSnackbarAdapter } from 'seed-design/ui/snackbar';
import { Switch } from 'seed-design/ui/switch';

import {
	browserPushSubscriptionKey,
	getBrowserSubscription,
	PushPermissionDeniedError,
	turnOffWebPush,
	turnOnWebPush,
} from '@/features/web-push-notification/lib/browser-push';
import { usePushEnvironment } from '@/features/web-push-notification/lib/push-environment';

import { notificationKeys } from '@/entities/notification/api/notification-keys';
import { meQueryOptions } from '@/entities/user/api/get-me';

import { ROUTES } from '@/shared/config/routes';

const DESCRIPTIONS = {
	desktop: '브라우저가 켜져 있을 때만 알림이 와요',
	mobile: '설정한 시각에 이 기기로 알림이 울려요',
	'install-required': '홈 화면에 추가하면 알림을 받을 수 있어요',
	unsupported: '이 브라우저는 알림을 지원하지 않아요',
};

export function WebPushDescription() {
	const environment = usePushEnvironment();

	return environment ? DESCRIPTIONS[environment] : null;
}

export function WebPushToggle() {
	const environment = usePushEnvironment();
	const canSubscribe = environment === 'desktop' || environment === 'mobile';
	const { data: me } = useQuery(meQueryOptions());
	const { data: subscription } = useQuery({
		queryKey: browserPushSubscriptionKey,
		queryFn: getBrowserSubscription,
		enabled: canSubscribe,
	});
	const queryClient = useQueryClient();
	const snackbar = useSnackbarAdapter();

	const toggle = useMutation({
		mutationFn: (on: boolean) => (on || !subscription ? turnOnWebPush() : turnOffWebPush(subscription)),
		onSuccess: (next) => {
			queryClient.setQueryData(browserPushSubscriptionKey, next);
			queryClient.invalidateQueries({ queryKey: notificationKeys.settings });
		},
		onError: (error) => {
			const message =
				error instanceof PushPermissionDeniedError
					? '브라우저 설정에서 알림을 허용해주세요'
					: '알림 설정을 바꾸지 못했어요. 다시 시도해주세요';
			snackbar.create({ render: () => <Snackbar variant="critical" message={message} /> });
		},
	});

	if (!canSubscribe || !me) {
		return null;
	}

	if (me.isGuest) {
		return (
			<ActionButton asChild size="small" variant="neutralWeak">
				<Link href={ROUTES.LOGIN}>로그인</Link>
			</ActionButton>
		);
	}

	return (
		<Switch
			size="24"
			checked={!!subscription}
			disabled={subscription === undefined || toggle.isPending}
			onCheckedChange={(checked) => toggle.mutate(checked)}
			inputProps={{ 'aria-label': '이 기기에서 알림 받기' }}
		/>
	);
}
