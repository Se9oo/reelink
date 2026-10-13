import type { ReactNode } from 'react';

import { BottomNavigation } from '@/widgets/app-shell/ui/bottom-navigation';
import { FloatingLinkButton } from '@/widgets/app-shell/ui/floating-link-button';
import { MobileHeader } from '@/widgets/app-shell/ui/mobile-header';
import { Sidebar } from '@/widgets/app-shell/ui/sidebar';

export default function MainLayout({ children }: { children: ReactNode }) {
	return (
		<div className="flex h-dvh overflow-hidden">
			<Sidebar />
			<div className="flex h-full flex-1 flex-col">
				<MobileHeader />
				<main className="flex-1 overflow-y-auto pt-14 pb-16 lg:pt-0 lg:pb-0">{children}</main>
				<BottomNavigation />
			</div>
			<FloatingLinkButton />
		</div>
	);
}
