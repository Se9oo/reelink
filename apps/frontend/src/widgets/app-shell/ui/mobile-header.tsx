import Link from 'next/link';

import { AccountMenu } from '@/widgets/app-shell/ui/account-menu';

import { ThemeToggle } from '@/features/toggle-theme/ui/theme-toggle';

import { ROUTES } from '@/shared/config/routes';
import { ReelinkSymbol, ReelinkWordmark } from '@/shared/ui/logo/reelink-logo';

export function MobileHeader() {
	return (
		<header
			className="mobile-header fixed inset-x-0 top-0 z-[1] flex h-14 items-center justify-between
				bg-[var(--seed-color-bg-layer-default)]/70 px-4 backdrop-blur-md lg:hidden"
		>
			<Link href={ROUTES.HOME} aria-label="Reelink 홈" className="flex items-center gap-2">
				<ReelinkSymbol size={30} />
				<ReelinkWordmark className="text-[17px] text-[var(--seed-color-fg-neutral)]" />
			</Link>
			<div className="flex items-center gap-1">
				<ThemeToggle />
				<AccountMenu showLabel={false} showHoverBackground={false} />
			</div>
		</header>
	);
}
