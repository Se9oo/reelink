'use client';

import type { ReactNode } from 'react';

import {
	IconArrowRightLine,
	IconArrowUpRightLine,
	IconDot3HorizontalFill,
	IconPencilLine,
	IconSquare2StackedLine,
	IconTrashcanLine,
} from '@karrotmarket/react-monochrome-icon';
import { MenuContent, MenuGroup, MenuItem, MenuRoot, MenuTrigger } from 'seed-design/ui/menu';

import { useBreakpointMenuState } from '@/shared/lib/use-breakpoint-menu-state';
import { IconFolderLine } from '@/shared/ui/icons/icon-folder-line';

const ACTION_CLASS =
	'flex cursor-pointer flex-col items-center gap-1.5 text-xs font-semibold text-[var(--seed-color-palette-static-white)] [text-shadow:0_1px_2px_rgb(0_0_0/0.5)] lg:text-[var(--seed-color-fg-neutral)] lg:[text-shadow:none]';
const CIRCLE_CLASS =
	'flex h-11 w-11 items-center justify-center rounded-full bg-[rgb(0_0_0/0.4)] backdrop-blur-sm lg:h-12 lg:w-12 lg:bg-[var(--seed-color-bg-neutral-weak)] lg:backdrop-blur-none lg:hover:bg-[var(--seed-color-bg-neutral-weak-pressed)]';

interface FeedActionsProps {
	url: string;
	onOpen: () => void;
	onCopy: () => void;
	onDelete: () => void;
	onEdit: () => void;
	onMove: () => void;
	onGoToFolder: () => void;
}

export function FeedActions({ url, onOpen, onCopy, onDelete, onEdit, onMove, onGoToFolder }: FeedActionsProps) {
	const { open, onOpenChange, instant } = useBreakpointMenuState();

	return (
		<div
			className="absolute right-4 bottom-6 flex flex-col gap-3 lg:right-auto lg:bottom-3 lg:left-full lg:ml-3.5
				lg:gap-3.5"
		>
			<a href={url} target="_blank" rel="noopener noreferrer" onClick={onOpen} className={ACTION_CLASS}>
				<span className={CIRCLE_CLASS}>
					<IconArrowUpRightLine size={20} />
				</span>
				열기
			</a>
			<ActionButton label="복사" icon={<IconSquare2StackedLine size={20} />} onClick={onCopy} />
			<ActionButton label="삭제" icon={<IconTrashcanLine size={20} />} onClick={onDelete} />
			<MenuRoot size="small" open={open} onOpenChange={onOpenChange}>
				<MenuTrigger asChild>
					<button type="button" className={ACTION_CLASS}>
						<span className={CIRCLE_CLASS}>
							<IconDot3HorizontalFill size={20} />
						</span>
						더보기
					</button>
				</MenuTrigger>
				<MenuContent {...(instant ? { 'data-instant': true } : {})}>
					<MenuGroup>
						<MenuItem label="링크 수정" prefixIcon={<IconPencilLine />} onClick={onEdit} />
						<MenuItem label="폴더 이동" prefixIcon={<IconFolderLine />} onClick={onMove} />
						<MenuItem label="폴더로 가기" prefixIcon={<IconArrowRightLine />} onClick={onGoToFolder} />
					</MenuGroup>
				</MenuContent>
			</MenuRoot>
		</div>
	);
}

interface ActionButtonProps {
	label: string;
	icon: ReactNode;
	onClick: () => void;
}

function ActionButton({ label, icon, onClick }: ActionButtonProps) {
	return (
		<button type="button" onClick={onClick} className={ACTION_CLASS}>
			<span className={CIRCLE_CLASS}>{icon}</span>
			{label}
		</button>
	);
}
