'use client';

import { useSyncExternalStore } from 'react';

function subscribe(query: string) {
	return (onStoreChange: () => void) => {
		const mediaQueryList = window.matchMedia(query);
		mediaQueryList.addEventListener('change', onStoreChange);
		return () => mediaQueryList.removeEventListener('change', onStoreChange);
	};
}

export function useMediaQuery(query: string) {
	return useSyncExternalStore(
		subscribe(query),
		() => window.matchMedia(query).matches,
		() => false,
	);
}
