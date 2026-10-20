'use client';

import {
	IconDot3HorizontalFill,
	IconPencilLine,
	IconPlusSmallLine,
	IconTrashcanLine,
} from '@karrotmarket/react-monochrome-icon';
import { MenuContent, MenuGroup, MenuItem, MenuRoot, MenuTrigger } from 'seed-design/ui/menu';

import { useBreakpointMenuState } from '@/shared/lib/use-breakpoint-menu-state';

interface FolderActionsMenuProps {
	folderName: string;
	isSystem: boolean;
	onCreateChild: () => void;
	onRename: () => void;
	onDelete: () => void;
	active?: boolean;
	triggerClassName?: string;
}

export function FolderActionsMenu({
	folderName,
	isSystem,
	onCreateChild,
	onRename,
	onDelete,
	active = false,
	triggerClassName = '',
}: FolderActionsMenuProps) {
	const { open, onOpenChange, instant } = useBreakpointMenuState();

	return (
		<MenuRoot size="small" open={open} onOpenChange={onOpenChange}>
			<MenuTrigger asChild>
				<button
					type="button"
					aria-label={`${folderName} 폴더 메뉴`}
					className={`relative z-10 flex shrink-0 cursor-pointer items-center justify-center rounded-lg
						text-[var(--seed-color-fg-neutral-muted)] ${
							active
								? 'hover:bg-[color-mix(in_srgb,var(--seed-color-fg-brand)_14%,transparent)]'
								: 'hover:bg-[color-mix(in_srgb,var(--seed-color-fg-neutral)_8%,transparent)]'
						} ${triggerClassName}`}
				>
					<IconDot3HorizontalFill size={18} />
				</button>
			</MenuTrigger>
			<MenuContent {...(instant ? { 'data-instant': true } : {})}>
				<MenuGroup>
					<MenuItem label="하위 폴더 만들기" prefixIcon={<IconPlusSmallLine />} onClick={onCreateChild} />
					{!isSystem && <MenuItem label="이름 변경" prefixIcon={<IconPencilLine />} onClick={onRename} />}
					<MenuItem label="삭제" prefixIcon={<IconTrashcanLine />} onClick={onDelete} />
				</MenuGroup>
			</MenuContent>
		</MenuRoot>
	);
}
