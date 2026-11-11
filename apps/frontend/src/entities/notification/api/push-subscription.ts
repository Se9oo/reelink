import { apiClient } from '@/shared/api/client';

export function savePushSubscription(subscription: PushSubscription) {
	return apiClient.put('notifications/push/subscription', { json: subscription.toJSON() });
}

export function deletePushSubscription(endpoint: string) {
	return apiClient.delete('notifications/push/subscription', { json: { endpoint } });
}
