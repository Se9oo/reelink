'use client';

import { useEffect, useSyncExternalStore } from 'react';

import { IconMoonFill, IconSunFill } from '@karrotmarket/react-monochrome-icon';

const THEME_KEY = 'theme';

type Theme = 'light' | 'dark';

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

export function ThemeToggle() {
	const theme = useSyncExternalStore(subscribe, readTheme, readServerTheme);

	useEffect(() => {
		if (theme !== null && localStorage.getItem(THEME_KEY) !== null) {
			applyTheme(theme);
		}
	}, [theme]);

	if (theme === null) {
		return <div className="h-8 w-8" />;
	}

	const toggle = () => {
		const next: Theme = theme === 'dark' ? 'light' : 'dark';

		localStorage.setItem(THEME_KEY, next);
		applyTheme(next);
		window.dispatchEvent(new StorageEvent('storage', { key: THEME_KEY, newValue: next, storageArea: localStorage }));
	};

	return (
		<button
			type="button"
			onClick={toggle}
			aria-label={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
			className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--seed-color-fg-neutral-muted)]
				hover:bg-[var(--seed-color-bg-neutral-weak)]"
		>
			{theme === 'dark' ? <IconSunFill size={18} /> : <IconMoonFill size={18} />}
		</button>
	);
}
