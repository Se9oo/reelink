import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier';
import boundaries from 'eslint-plugin-boundaries';
import unusedImports from 'eslint-plugin-unused-imports';
import { defineConfig, globalIgnores } from 'eslint/config';

const sameSlice = (type) => ({
	from: { element: { type } },
	allow: { to: { element: { type, captured: { slice: '{{ from.element.captured.slice }}' } } } },
});

const eslintConfig = defineConfig([
	...nextVitals,
	...nextTs,
	prettier, // must come after next configs to disable conflicting formatting rules
	{
		plugins: {
			'unused-imports': unusedImports,
		},
		rules: {
			'no-unused-vars': 'off',
			'@typescript-eslint/no-unused-vars': 'off',
			'unused-imports/no-unused-imports': 'error',
			'unused-imports/no-unused-vars': [
				'warn',
				{
					args: 'after-used',
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					caughtErrors: 'none',
				},
			],
		},
	},
	// FSD 레이어 규칙: 위 레이어만 아래 레이어를 import하고, 같은 레이어에서는 같은 슬라이스 안에서만 import한다
	{
		plugins: { boundaries },
		settings: {
			'boundaries/elements': [
				{ type: 'routes', pattern: 'app', partialMatch: false },
				{ type: 'app', pattern: 'src/app', partialMatch: false },
				{ type: 'views', pattern: 'src/views/*', capture: ['slice'], partialMatch: false },
				{ type: 'widgets', pattern: 'src/widgets/*', capture: ['slice'], partialMatch: false },
				{ type: 'features', pattern: 'src/features/*', capture: ['slice'], partialMatch: false },
				{ type: 'entities', pattern: 'src/entities/*', capture: ['slice'], partialMatch: false },
				{ type: 'shared', pattern: 'src/shared', partialMatch: false },
			],
		},
		rules: {
			'boundaries/dependencies': [
				'error',
				{
					default: 'disallow',
					policies: [
						{ allow: { to: { module: { origin: ['external', 'core'] } } } },
						{
							from: { element: { type: 'routes' } },
							allow: { to: { element: { types: ['app', 'views', 'widgets', 'features', 'entities', 'shared'] } } },
						},
						{
							from: { element: { type: 'app' } },
							allow: { to: { element: { types: ['app', 'views', 'widgets', 'features', 'entities', 'shared'] } } },
						},
						sameSlice('views'),
						{
							from: { element: { type: 'views' } },
							allow: { to: { element: { types: ['widgets', 'features', 'entities', 'shared'] } } },
						},
						sameSlice('widgets'),
						{
							from: { element: { type: 'widgets' } },
							allow: { to: { element: { types: ['features', 'entities', 'shared'] } } },
						},
						sameSlice('features'),
						{
							from: { element: { type: 'features' } },
							allow: { to: { element: { types: ['entities', 'shared'] } } },
						},
						sameSlice('entities'),
						{ from: { element: { type: 'entities' } }, allow: { to: { element: { type: 'shared' } } } },
						{ from: { element: { type: 'shared' } }, allow: { to: { element: { type: 'shared' } } } },
					],
				},
			],
		},
	},
	// Override default ignores of eslint-config-next.
	globalIgnores([
		// Default ignores of eslint-config-next:
		'.next/**',
		'out/**',
		'build/**',
		'next-env.d.ts',
		// seed-design CLI가 생성하는 벤더 스니펫 — 직접 수정 대상 아님
		'src/shared/ui/seed-design/**',
	]),
]);

export default eslintConfig;
