'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { IconGearLine, IconHouseFill, IconLightbulbDot5Fill, IconPlusLine } from '@karrotmarket/react-monochrome-icon';
import { SnackbarAvoidOverlap } from 'seed-design/ui/snackbar';

import { TabBarCurve } from '@/app/layouts/app-shell/ui/tab-bar-curve';

import { openRegisterLinkModal } from '@/features/register-link/ui/open-register-link-modal';

import { ROUTES } from '@/shared/config/routes';
import { IconFolderFill } from '@/shared/ui/icons/icon-folder-fill';

const TABS = [
	{ href: ROUTES.HOME, label: '홈', Icon: IconHouseFill },
	{ href: ROUTES.FEED, label: '리마인드', Icon: IconLightbulbDot5Fill },
	{ href: ROUTES.FOLDERS, label: '링크', Icon: IconFolderFill },
	{ href: ROUTES.SETTINGS, label: '설정', Icon: IconGearLine },
] as const;

export function BottomNavigation() {
	const pathname = usePathname();

	function renderTab({ href, label, Icon }: (typeof TABS)[number]) {
		const isActive = pathname === href || pathname.startsWith(`${href}/`);

		return (
			<Link
				key={href}
				href={href}
				className={`flex flex-1 flex-col items-center justify-center gap-1 text-xs ${
					isActive ? 'text-[var(--seed-color-fg-brand)]' : 'text-[var(--seed-color-fg-neutral-muted)]'
				}`}
			>
				<Icon size={24} />
				{label}
			</Link>
		);
	}

	return (
		<SnackbarAvoidOverlap>
			<nav
				className="bottom-navigation relative z-[1] box-content flex h-16 shrink-0 border-t
					border-[var(--seed-color-stroke-neutral-subtle)] bg-[var(--seed-color-bg-layer-default)]
					pb-[env(safe-area-inset-bottom)] lg:hidden"
			>
				{TABS.slice(0, 2).map(renderTab)}
				<div className="relative flex-1">
					<TabBarCurve className="absolute -top-[23px] left-1/2 -translate-x-1/2" />
					<button
						type="button"
						aria-label="링크 추가"
						onClick={openRegisterLinkModal}
						className="absolute -top-[18px] left-1/2 flex h-[52px] w-[52px] -translate-x-1/2 cursor-pointer items-center
							justify-center rounded-full bg-[var(--seed-color-bg-brand-solid)]
							text-[var(--seed-color-palette-static-white)] shadow-[0_4px_12px_rgb(0_127_255/0.3)] transition-transform
							hover:bg-[var(--seed-color-bg-brand-solid-pressed)] active:scale-95"
					>
						<IconPlusLine size={24} />
					</button>
				</div>
				{TABS.slice(2).map(renderTab)}
			</nav>
		</SnackbarAvoidOverlap>
	);
}
