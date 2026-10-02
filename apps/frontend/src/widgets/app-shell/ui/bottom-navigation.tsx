'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import {
	IconDocumentTrayFill,
	IconHouseFill,
	IconPersonFill,
	IconVertrectangle2HorizontalFill,
} from '@karrotmarket/react-monochrome-icon';

import { ROUTES } from '@/shared/config/routes';

const TABS = [
	{ href: ROUTES.HOME, label: '홈', Icon: IconHouseFill },
	{ href: ROUTES.FEED, label: '피드', Icon: IconVertrectangle2HorizontalFill },
	{ href: ROUTES.FOLDERS, label: '링크', Icon: IconDocumentTrayFill },
	{ href: ROUTES.MYPAGE, label: '마이페이지', Icon: IconPersonFill },
] as const;

export function BottomNavigation() {
	const pathname = usePathname();

	return (
		<nav
			className="fixed inset-x-0 bottom-0 z-40 flex h-16 border-t border-[var(--seed-color-stroke-neutral-subtle)]
				bg-[var(--seed-color-bg-layer-default)] lg:hidden"
		>
			{TABS.map(({ href, label, Icon }) => {
				const isActive = pathname === href;

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
	);
}
