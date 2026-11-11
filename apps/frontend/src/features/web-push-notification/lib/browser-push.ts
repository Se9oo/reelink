import { deletePushSubscription, savePushSubscription } from '@/entities/notification/api/push-subscription';

import { VAPID_PUBLIC_KEY } from '@/shared/config/env';

export class PushPermissionDeniedError extends Error {}

export const browserPushSubscriptionKey = ['browser-push-subscription'] as const;

function registerServiceWorker() {
	return navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' });
}

function urlBase64ToUint8Array(base64: string) {
	const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
	return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

export async function getBrowserSubscription() {
	const registration = await navigator.serviceWorker.getRegistration();
	return (await registration?.pushManager.getSubscription()) ?? null;
}

export async function turnOnWebPush() {
	if ((await Notification.requestPermission()) !== 'granted') {
		throw new PushPermissionDeniedError();
	}

	await registerServiceWorker();
	const registration = await navigator.serviceWorker.ready;
	const subscription = await registration.pushManager.subscribe({
		userVisibleOnly: true,
		applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
	});

	try {
		await savePushSubscription(subscription);
	} catch (error) {
		await subscription.unsubscribe();
		throw error;
	}

	return subscription;
}

export async function turnOffWebPush(subscription: PushSubscription) {
	await deletePushSubscription(subscription.endpoint);
	await subscription.unsubscribe();
	return null;
}

export async function syncWebPush() {
	await registerServiceWorker();
	const subscription = await getBrowserSubscription();

	if (subscription && Notification.permission === 'granted') {
		await savePushSubscription(subscription);
	}
}
