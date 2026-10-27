'use client';

import { useEffect, useSyncExternalStore } from 'react';

const THEME_KEY = 'theme';

export type Theme = 'light' | 'dark';

function readTheme(): Theme {
	const stored = localStorage.getItem(THEME_KEY);

	if (stored === 'dark' || stored === 'light') {
		return stored;
	}

	return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function readServerTheme(): Theme | null {
	return null;
}

function subscribe(callback: () => void) {
	window.addEventListener('storage', callback);
	return () => window.removeEventListener('storage', callback);
}

function applyTheme(theme: Theme) {
	document.documentElement.dataset.seedColorMode = `${theme}-only`;
	document.documentElement.dataset.seedUserColorScheme = theme;
}

export function useTheme() {
	const theme = useSyncExternalStore(subscribe, readTheme, readServerTheme);

	useEffect(() => {
		if (theme !== null && localStorage.getItem(THEME_KEY) !== null) {
			applyTheme(theme);
		}
	}, [theme]);

	const setTheme = (next: Theme) => {
		localStorage.setItem(THEME_KEY, next);
		applyTheme(next);
		window.dispatchEvent(new StorageEvent('storage', { key: THEME_KEY, newValue: next, storageArea: localStorage }));
	};

	return { theme, setTheme };
}
