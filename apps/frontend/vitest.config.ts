import react from '@vitejs/plugin-react';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vitest/config';

if (existsSync('.env.local')) {
	process.loadEnvFile('.env.local');
}

export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './src'),
			'seed-design': path.resolve(__dirname, './src/shared/ui/seed-design'),
		},
	},
	test: {
		environment: 'jsdom',
		setupFiles: ['./vitest.setup.ts'],
		// @seed-design/react가 내부적으로 .css를 import하는데, 기본적으로는 Vite 변환을
		// 안 거치고 Node로 바로 로드되면서 .css 확장자를 못 읽어 에러가 남 — inline 처리로 우회
		server: {
			deps: {
				inline: [/@seed-design\//],
			},
		},
	},
});
