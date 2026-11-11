self.addEventListener('push', (event) => {
	const { title, body, url, tag } = event.data.json();

	event.waitUntil(
		self.registration.showNotification(title, {
			body,
			tag,
			renotify: true,
			icon: '/web-app-manifest-192x192.png',
			data: { url },
		}),
	);
});

self.addEventListener('notificationclick', (event) => {
	event.notification.close();
	event.waitUntil(self.clients.openWindow(event.notification.data.url));
});
