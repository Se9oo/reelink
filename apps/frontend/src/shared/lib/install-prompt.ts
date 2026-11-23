import { useSyncExternalStore } from 'react';

interface BeforeInstallPromptEvent extends Event {
	prompt: () => Promise<void>;
	userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function notify() {
	listeners.forEach((listener) => listener());
}

if (typeof window !== 'undefined') {
	window.addEventListener('beforeinstallprompt', (event) => {
		deferred = event as BeforeInstallPromptEvent;
		notify();
	});
}

function subscribe(listener: () => void) {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

export function useCanPromptInstall() {
	return useSyncExternalStore(
		subscribe,
		() => deferred !== null,
		() => false,
	);
}

export async function promptInstall() {
	const event = deferred;

	if (!event) {
		return;
	}

	deferred = null;
	notify();
	await event.prompt();
	await event.userChoice;
}
