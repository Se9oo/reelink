import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Snackbar, useSnackbarAdapter } from 'seed-design/ui/snackbar';

import {
	browserPushSubscriptionKey,
	PushPermissionDeniedError,
	turnOffWebPush,
	turnOnWebPush,
} from '@/features/web-push-notification/lib/browser-push';

import { notificationKeys } from '@/entities/notification/api/notification-keys';

export function useSetWebPush() {
	const queryClient = useQueryClient();
	const snackbar = useSnackbarAdapter();

	return useMutation({
		mutationFn: (unsubscribe: PushSubscription | void) => (unsubscribe ? turnOffWebPush(unsubscribe) : turnOnWebPush()),
		onSuccess: (subscription) => {
			queryClient.setQueryData(browserPushSubscriptionKey, subscription);
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
}
