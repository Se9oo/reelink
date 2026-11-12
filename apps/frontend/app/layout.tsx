import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import Script from 'next/script';

import { QueryProvider } from '@/app/providers/query-provider';
import { OverlayProvider } from 'overlay-kit';
import { SnackbarProvider } from 'seed-design/ui/snackbar';

import { SITE_URL } from '@/shared/config/env';
import { THEME_COLORS } from '@/shared/config/theme-color';

import './globals.css';

const pretendard = localFont({
	src: '../node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2',
	variable: '--font-pretendard',
	display: 'swap',
	weight: '45 920',
});

export const metadata: Metadata = {
	metadataBase: new URL(SITE_URL),
	title: 'Reelink',
	description: '나중에 볼 링크, 잊기 전에 다시 떠오르게',
	appleWebApp: { title: 'Reelink', statusBarStyle: 'black-translucent' },
	openGraph: {
		title: 'Reelink',
		description: '나중에 볼 링크, 잊기 전에 다시 떠오르게',
		siteName: 'Reelink',
		locale: 'ko_KR',
		type: 'website',
	},
	twitter: { card: 'summary_large_image' },
};

export const viewport: Viewport = {
	colorScheme: 'light dark',
	viewportFit: 'cover',
	themeColor: [
		{ media: '(prefers-color-scheme: light)', color: THEME_COLORS.light },
		{ media: '(prefers-color-scheme: dark)', color: THEME_COLORS.dark },
	],
};

const themeScript = `
try {
  var root = document.documentElement;
  var stored = localStorage.getItem('theme');
  if (stored === 'light' || stored === 'dark') {
    root.dataset.seedColorMode = stored + '-only';
    root.dataset.seedUserColorScheme = stored;
    var meta = document.createElement('meta');
    meta.id = 'theme-color';
    meta.name = 'theme-color';
    meta.content = ${JSON.stringify(THEME_COLORS)}[stored];
    document.head.prepend(meta);
  } else {
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
    function apply() {
      root.dataset.seedUserColorScheme = prefersDark.matches ? 'dark' : 'light';
    }
    apply();
    prefersDark.addEventListener('change', apply);
  }
} catch (e) {}
`;

export default function RootLayout({ children }: LayoutProps<'/'>) {
	return (
		<html
			lang="ko"
			data-seed
			data-seed-color-mode="system"
			data-seed-user-color-scheme="light"
			className={`${pretendard.variable} h-full antialiased`}
			suppressHydrationWarning
		>
			<body className="flex min-h-full flex-col">
				<Script id="seed-theme" strategy="beforeInteractive">
					{themeScript}
				</Script>
				<QueryProvider>
					<OverlayProvider>
						<SnackbarProvider>{children}</SnackbarProvider>
					</OverlayProvider>
				</QueryProvider>
			</body>
		</html>
	);
}
