'use client';

import { Switch } from 'seed-design/ui/switch';

import { useTheme } from '@/features/toggle-theme/model/use-theme';

export function ThemeSwitch() {
	const { theme, setTheme } = useTheme();

	return (
		<Switch
			size="24"
			checked={theme === 'dark'}
			disabled={theme === null}
			onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
			inputProps={{ 'aria-label': '다크 모드' }}
		/>
	);
}
