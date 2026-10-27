import { useMutation, useQueryClient } from '@tanstack/react-query';

import { notificationKeys } from '@/entities/notification/api/notification-keys';
import { NotificationSettings } from '@/entities/notification/model/types';

import { apiClient } from '@/shared/api/client';

function updateNotificationMethod(notificationMethod: NotificationSettings['notificationMethod']) {
	return apiClient.patch('notifications/settings', { json: { notificationMethod } }).json<NotificationSettings>();
}

export function useUpdateNotificationMethod() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: updateNotificationMethod,
		onSuccess: (settings) => {
			queryClient.setQueryData(notificationKeys.settings, settings);
		},
	});
}
