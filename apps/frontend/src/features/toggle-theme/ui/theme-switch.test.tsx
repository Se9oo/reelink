import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, test } from 'vitest';

import { ThemeSwitch } from '@/features/toggle-theme/ui/theme-switch';

describe('ThemeSwitch', () => {
	afterEach(() => {
		localStorage.clear();
		delete document.documentElement.dataset.seedColorMode;
		delete document.documentElement.dataset.seedUserColorScheme;
		document.head.innerHTML = '';
	});

	test('저장된 테마가 다크면 켜진 스위치를 보여준다.', () => {
		localStorage.setItem('theme', 'dark');
		render(<ThemeSwitch />);

		expect(screen.getByRole('switch', { name: '다크 모드' })).toBeChecked();
	});

	test('저장된 테마가 없으면 시스템 설정(라이트)을 따라 꺼진 스위치를 보여준다.', () => {
		render(<ThemeSwitch />);

		expect(screen.getByRole('switch', { name: '다크 모드' })).not.toBeChecked();
	});

	test('스위치를 켜면 다크 테마를 저장하고 화면에 적용한다.', async () => {
		render(<ThemeSwitch />);

		await userEvent.click(screen.getByRole('switch', { name: '다크 모드' }));

		expect(localStorage.getItem('theme')).toBe('dark');
		expect(document.documentElement.dataset.seedColorMode).toBe('dark-only');
		expect(screen.getByRole('switch', { name: '다크 모드' })).toBeChecked();
	});

	test('스위치를 끄면 라이트 테마를 저장하고 화면에 적용한다.', async () => {
		localStorage.setItem('theme', 'dark');
		render(<ThemeSwitch />);

		await userEvent.click(screen.getByRole('switch', { name: '다크 모드' }));

		expect(localStorage.getItem('theme')).toBe('light');
		expect(document.documentElement.dataset.seedColorMode).toBe('light-only');
	});

	test('테마를 바꾸면 시스템 설정과 상관없이 상태 표시줄 색(theme-color)도 그 테마 색이 되고, 기존 태그는 건드리지 않는다.', async () => {
		document.head.innerHTML =
			'<meta name="theme-color" media="(prefers-color-scheme: light)" content="#f5f7fa">' +
			'<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#121316">';
		render(<ThemeSwitch />);

		await userEvent.click(screen.getByRole('switch', { name: '다크 모드' }));
		await userEvent.click(screen.getByRole('switch', { name: '다크 모드' }));

		const colors = [...document.querySelectorAll('meta[name="theme-color"]')].map((meta) =>
			meta.getAttribute('content'),
		);
		expect(colors).toEqual(['#f5f7fa', '#f5f7fa', '#121316']);
	});
});
