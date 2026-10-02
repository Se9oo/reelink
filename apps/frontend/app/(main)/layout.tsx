import type { ReactNode } from 'react';

import { BottomNavigation } from '@/widgets/app-shell/ui/bottom-navigation';
import { FloatingLinkButton } from '@/widgets/app-shell/ui/floating-link-button';
import { Sidebar } from '@/widgets/app-shell/ui/sidebar';

export default function MainLayout({ children }: { children: ReactNode }) {
	return (
		<div className="flex h-dvh overflow-hidden">
			<Sidebar />
			<div className="flex h-full flex-1 flex-col">
				<main className="flex-1 overflow-y-auto pb-16 lg:pb-0">{children}</main>
				<BottomNavigation />
			</div>
			<FloatingLinkButton />
		</div>
	);
}
