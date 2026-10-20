'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { IconGearLine, IconHouseFill, IconLightbulbDot5Fill } from '@karrotmarket/react-monochrome-icon';
import { SnackbarAvoidOverlap } from 'seed-design/ui/snackbar';

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

	return (
		<SnackbarAvoidOverlap>
			<nav
				className="bottom-navigation fixed inset-x-0 bottom-0 z-[1] flex h-16 border-t
					border-[var(--seed-color-stroke-neutral-subtle)] bg-[var(--seed-color-bg-layer-default)] lg:hidden"
			>
				{TABS.map(({ href, label, Icon }) => {
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
				})}
			</nav>
		</SnackbarAvoidOverlap>
	);
}
