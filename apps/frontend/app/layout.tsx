import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import Script from 'next/script';

import './globals.css';

const geistSans = Geist({
	variable: '--font-geist-sans',
	subsets: ['latin'],
});

const geistMono = Geist_Mono({
	variable: '--font-geist-mono',
	subsets: ['latin'],
});

export const metadata: Metadata = {
	title: 'Reelink',
	description: '나중에 볼 링크, 잊기 전에 다시 떠오르게',
};

export const viewport: Viewport = {
	colorScheme: 'light dark',
};

// SEED Design의 라이트/다크 테마는 <html>의 data-seed-user-color-scheme로 제어됨.
// 서버에서는 사용자의 실제 시스템 설정을 알 수 없어 일단 light로 렌더링하고,
// hydration 전에(beforeInteractive) 이 스크립트가 즉시 보정해 깜빡임을 막음.
const themeScript = `
try {
  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
  function apply() {
    document.documentElement.dataset.seedUserColorScheme = prefersDark.matches ? 'dark' : 'light';
  }
  apply();
  prefersDark.addEventListener('change', apply);
} catch (e) {}
`;

export default function RootLayout({ children }: LayoutProps<'/'>) {
	return (
		<html
			lang="ko"
			data-seed
			data-seed-color-mode="system"
			data-seed-user-color-scheme="light"
			className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
			suppressHydrationWarning
		>
			<body className="flex min-h-full flex-col">
				<Script id="seed-theme" strategy="beforeInteractive">
					{themeScript}
				</Script>
				{children}
			</body>
		</html>
	);
}
