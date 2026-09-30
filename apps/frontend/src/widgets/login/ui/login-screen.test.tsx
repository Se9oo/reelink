import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';

import { API_URL } from '@/shared/config/env';

import { LoginScreen } from './login-screen';

describe('LoginScreen', () => {
	test('구글 로그인 링크를 올바른 주소로 렌더링한다', () => {
		render(<LoginScreen />);
		const link = screen.getByRole('link', { name: 'Google로 시작하기' });
		expect(link).toHaveAttribute('href', `${API_URL}/auth/google`);
	});

	test('깃허브 로그인 링크를 올바른 주소로 렌더링한다', () => {
		render(<LoginScreen />);
		const link = screen.getByRole('link', { name: 'GitHub로 시작하기' });
		expect(link).toHaveAttribute('href', `${API_URL}/auth/github`);
	});
});
