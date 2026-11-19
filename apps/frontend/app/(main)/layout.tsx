import type { ReactNode } from 'react';

import { BottomNavigation } from '@/app/layouts/app-shell/ui/bottom-navigation';
import { FloatingLinkButton } from '@/app/layouts/app-shell/ui/floating-link-button';
import { MobileHeader } from '@/app/layouts/app-shell/ui/mobile-header';
import { Sidebar } from '@/app/layouts/app-shell/ui/sidebar';

import { PushSubscriptionSync } from '@/features/web-push-notification/ui/push-subscription-sync';

import { PendingOgTagsSync } from '@/entities/link/ui/pending-og-tags-sync';

export default function MainLayout({ children }: { children: ReactNode }) {
	return (
		<div className="relative flex h-dvh overflow-hidden [@media(display-mode:standalone)]:h-lvh">
			<Sidebar />
			<div className="flex h-full min-w-0 flex-1 flex-col">
				<MobileHeader />
				<main className="flex-1 overflow-y-auto pt-[calc(3.5rem+var(--app-safe-top))] lg:pt-0">{children}</main>
				<BottomNavigation />
			</div>
			<FloatingLinkButton />
			<PushSubscriptionSync />
			<PendingOgTagsSync />
		</div>
	);
}
