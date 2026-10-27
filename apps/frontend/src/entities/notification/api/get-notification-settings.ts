import { queryOptions } from '@tanstack/react-query';

import { NotificationSettings } from '@/entities/notification/model/types';

import { apiClient } from '@/shared/api/client';

function getNotificationSettings() {
	return apiClient.get('notifications/settings').json<NotificationSettings>();
}

export function notificationSettingsQueryOptions() {
	return queryOptions({ queryKey: ['notification-settings'], queryFn: getNotificationSettings });
}
