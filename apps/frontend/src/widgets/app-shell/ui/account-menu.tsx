'use client';

import { IconChevronDownSmallLine } from '@karrotmarket/react-monochrome-icon';
import { useQuery } from '@tanstack/react-query';
import { Avatar } from 'seed-design/ui/avatar';
import { IdentityPlaceholder } from 'seed-design/ui/identity-placeholder';
import { MenuContent, MenuGroup, MenuItem, MenuRoot, MenuTrigger } from 'seed-design/ui/menu';

import { useAccountMenuItems } from '@/widgets/app-shell/lib/use-account-menu-items';

import { meQueryOptions } from '@/entities/user/api/get-me';

import { useBreakpointMenuState } from '@/shared/lib/use-breakpoint-menu-state';

interface AccountMenuProps {
	showLabel?: boolean;
	showHoverBackground?: boolean;
	fullWidth?: boolean;
}

export function AccountMenu({ showLabel = true, showHoverBackground = true, fullWidth = false }: AccountMenuProps) {
	const { data: me } = useQuery(meQueryOptions());

	const accountMenuItems = useAccountMenuItems();
	const { open, onOpenChange, instant } = useBreakpointMenuState();

	if (!me) {
		return <div className="h-6 w-6" />;
	}

	return (
		<MenuRoot size="small" open={open} onOpenChange={onOpenChange}>
			<MenuTrigger asChild>
				<button
					type="button"
					aria-label={showLabel ? undefined : '계정 메뉴'}
					className={`flex min-w-0 items-center gap-2 rounded-lg px-1 py-1 ${fullWidth ? 'flex-1' : ''} ${
						showHoverBackground ? 'hover:bg-[var(--seed-color-bg-neutral-weak)]' : ''
					}`}
				>
					<Avatar size="24" src={me.avatarUrl ?? undefined} fallback={<IdentityPlaceholder identity="person" />} />
					{showLabel && (
						<>
							<span className="min-w-0 truncate text-sm text-[var(--seed-color-fg-neutral)]">{me.nickname}</span>
							<IconChevronDownSmallLine size={14} className="shrink-0 text-[var(--seed-color-fg-neutral-muted)]" />
						</>
					)}
				</button>
			</MenuTrigger>
			<MenuContent {...(instant ? { 'data-instant': true } : {})}>
				<MenuGroup>
					{accountMenuItems.map(({ label, icon, onClick }) => (
						<MenuItem key={label} label={label} prefixIcon={icon} onClick={onClick} />
					))}
				</MenuGroup>
			</MenuContent>
		</MenuRoot>
	);
}
