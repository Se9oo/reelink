'use client';

import { IconMoonFill, IconSunFill } from '@karrotmarket/react-monochrome-icon';

import { useTheme } from '@/features/toggle-theme/model/use-theme';

export function ThemeToggle() {
	const { theme, setTheme } = useTheme();

	if (theme === null) {
		return <div className="h-8 w-8" />;
	}

	return (
		<button
			type="button"
			onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
			aria-label={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
			className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--seed-color-fg-neutral-muted)]
				hover:bg-[var(--seed-color-bg-neutral-weak)]"
		>
			{theme === 'dark' ? <IconSunFill size={18} /> : <IconMoonFill size={18} />}
		</button>
	);
}
