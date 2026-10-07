'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { IconHouseFill, IconPersonFill, IconVertrectangle2HorizontalFill } from '@karrotmarket/react-monochrome-icon';

import { FolderList } from '@/widgets/folder-list/ui/folder-list';

import { ROUTES } from '@/shared/config/routes';

const QUICK_LINKS = [
	{ href: ROUTES.HOME, label: '홈', Icon: IconHouseFill },
	{ href: ROUTES.FEED, label: '피드', Icon: IconVertrectangle2HorizontalFill },
	{ href: ROUTES.MYPAGE, label: '마이페이지', Icon: IconPersonFill },
] as const;

export function Sidebar() {
	const pathname = usePathname();

	return (
		<aside
			className="hidden h-full w-60 shrink-0 flex-col border-r border-[var(--seed-color-stroke-neutral-subtle)] lg:flex"
		>
			<nav className="flex flex-col gap-1 p-3">
				{QUICK_LINKS.map(({ href, label, Icon }) => {
					const isActive = pathname === href;

					return (
						<Link
							key={href}
							href={href}
							className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
								isActive
									? 'bg-[var(--seed-color-bg-brand-weak)] text-[var(--seed-color-fg-brand)]'
									: 'text-[var(--seed-color-fg-neutral)] hover:bg-[var(--seed-color-bg-neutral-muted)]'
							}`}
						>
							<Icon size={18} />
							{label}
						</Link>
					);
				})}
			</nav>
			<div className="flex-1 overflow-y-auto border-t border-[var(--seed-color-stroke-neutral-subtle)]">
				<FolderList />
			</div>
		</aside>
	);
}
