import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: './e2e',
	testMatch: '*.e2e.ts',
	fullyParallel: false,
	retries: 0,
	reporter: 'list',
	use: {
		baseURL: 'http://localhost:3000',
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure',
	},
	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
	webServer: [
		{
			command: 'pnpm start:dev',
			cwd: '../backend',
			url: 'http://localhost:8080',
			reuseExistingServer: true,
			timeout: 120_000,
		},
		{
			command: 'pnpm dev',
			url: 'http://localhost:3000/login',
			reuseExistingServer: true,
			timeout: 120_000,
		},
	],
});
