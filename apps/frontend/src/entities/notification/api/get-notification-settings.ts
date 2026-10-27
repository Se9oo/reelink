import { queryOptions } from '@tanstack/react-query';

import { notificationKeys } from '@/entities/notification/api/notification-keys';
import { NotificationSettings } from '@/entities/notification/model/types';

import { apiClient } from '@/shared/api/client';

function getNotificationSettings() {
	return apiClient.get('notifications/settings').json<NotificationSettings>();
}

export function notificationSettingsQueryOptions() {
	return queryOptions({ queryKey: notificationKeys.settings, queryFn: getNotificationSettings });
}
