'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { IconHouseFill, IconLightbulbDot5Fill } from '@karrotmarket/react-monochrome-icon';

import { AccountMenu } from '@/widgets/app-shell/ui/account-menu';
import { FolderList } from '@/widgets/folder-list/ui/folder-list';

import { ThemeToggle } from '@/features/toggle-theme/ui/theme-toggle';

import { ROUTES } from '@/shared/config/routes';
import { ReelinkSymbol, ReelinkWordmark } from '@/shared/ui/logo/reelink-logo';

const QUICK_LINKS = [
	{ href: ROUTES.HOME, label: '홈', Icon: IconHouseFill },
	{ href: ROUTES.FEED, label: '리마인드', Icon: IconLightbulbDot5Fill },
] as const;

export function Sidebar() {
	const pathname = usePathname();

	return (
		<aside
			className="app-sidebar hidden h-full w-60 shrink-0 flex-col border-r
				border-[var(--seed-color-stroke-neutral-subtle)] lg:flex"
		>
			<Link href={ROUTES.HOME} aria-label="Reelink 홈" className="flex items-center gap-2.5 px-4 pt-4">
				<ReelinkSymbol size={30} />
				<ReelinkWordmark className="text-lg text-[var(--seed-color-fg-neutral)]" />
			</Link>
			<nav className="flex flex-col gap-1 px-2 py-3">
				{QUICK_LINKS.map(({ href, label, Icon }) => {
					const isActive = pathname === href;

					return (
						<Link
							key={href}
							href={href}
							className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
								isActive
									? 'bg-[var(--seed-color-bg-brand-weak)] text-[var(--seed-color-fg-brand)]'
									: 'text-[var(--seed-color-fg-neutral)] hover:bg-[var(--seed-color-bg-neutral-weak)]'
							}`}
						>
							<Icon size={18} />
							{label}
						</Link>
					);
				})}
			</nav>
			<div className="flex-1 overflow-y-auto border-t border-[var(--seed-color-stroke-neutral-subtle)] px-2">
				<FolderList />
			</div>
			<div
				className="flex items-center justify-between border-t border-[var(--seed-color-stroke-neutral-subtle)] px-2
					py-2"
			>
				<AccountMenu fullWidth />
				<ThemeToggle />
			</div>
		</aside>
	);
}
