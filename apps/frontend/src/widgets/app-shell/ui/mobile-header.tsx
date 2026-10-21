import { AccountMenu } from '@/widgets/app-shell/ui/account-menu';

import { ThemeToggle } from '@/features/toggle-theme/ui/theme-toggle';

export function MobileHeader() {
	return (
		<header
			className="mobile-header fixed inset-x-0 top-0 z-[1] flex h-14 items-center justify-end gap-1
				bg-[var(--seed-color-bg-layer-default)]/70 px-4 backdrop-blur-md lg:hidden"
		>
			<ThemeToggle />
			<AccountMenu showLabel={false} showHoverBackground={false} />
		</header>
	);
}
