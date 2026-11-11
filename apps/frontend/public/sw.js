self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

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

async function openUrl(url) {
	const target = new URL(url, self.location.origin);
	const isAppPage = target.origin === self.location.origin && !target.pathname.startsWith('/api/');
	const [client] = isAppPage ? await self.clients.matchAll({ type: 'window' }) : [];

	if (client) {
		await client.focus();
		return client.navigate(target.href);
	}

	return self.clients.openWindow(target.href);
}

self.addEventListener('notificationclick', (event) => {
	event.notification.close();
	event.waitUntil(openUrl(event.notification.data.url));
});
