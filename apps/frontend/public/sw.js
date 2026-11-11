self.addEventListener('push', (event) => {
	let payload = {};

	try {
		payload = event.data?.json() ?? {};
	} catch {}

	const { title = 'Reelink', body = '새 알림이 있어요', url = '/feed', tag } = payload;

	event.waitUntil(
		self.registration.showNotification(title, {
			body,
			tag,
			renotify: Boolean(tag),
			icon: '/web-app-manifest-192x192.png',
			data: { url },
		}),
	);
});

self.addEventListener('notificationclick', (event) => {
	event.notification.close();
	event.waitUntil(self.clients.openWindow(event.notification.data.url));
});
