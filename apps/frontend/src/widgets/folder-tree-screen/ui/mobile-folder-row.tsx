'use client';

import NextLink from 'next/link';

import { useDraggable, useDroppable } from '@dnd-kit/core';
import { IconChevronRightSmallLine } from '@karrotmarket/react-monochrome-icon';

import { type FlattenedFolder } from '@/widgets/folder-list/model/flatten-tree';

import { FolderActionsMenu } from '@/entities/folder/ui/folder-actions-menu';

import { folderDetailPath } from '@/shared/config/routes';
import { IconFolderLine } from '@/shared/ui/icons/icon-folder-line';

export const MOBILE_INDENT_WIDTH = 16;

interface MobileFolderRowProps {
	item: FlattenedFolder;
	hasChildren: boolean;
	childCount: number;
	expanded: boolean;
	isNestTarget: boolean;
	insertLinePosition: 'top' | 'bottom' | null;
	onToggle: (id: string) => void;
	onRequestCreate: (parentId: string, parentName: string) => void;
	onRequestRename: (id: string, name: string) => void;
	onRequestDelete: (id: string, name: string) => void;
}

export function MobileFolderRow({
	item,
	hasChildren,
	childCount,
	expanded,
	isNestTarget,
	insertLinePosition,
	onToggle,
	onRequestCreate,
	onRequestRename,
	onRequestDelete,
}: MobileFolderRowProps) {
	const { setNodeRef: setDraggableRef, listeners, attributes, isDragging } = useDraggable({ id: item.id });
	const { setNodeRef: setDroppableRef } = useDroppable({ id: item.id });

	function setRefs(node: HTMLDivElement | null) {
		setDraggableRef(node);
		setDroppableRef(node);
	}

	return (
		<li className="relative" style={{ opacity: isDragging ? 0.4 : 1 }}>
			<div
				aria-hidden="true"
				className="absolute inset-x-0 top-0 z-10 h-[3px] -translate-y-1/2 rounded-full
					bg-[var(--seed-color-bg-brand-solid)]"
				style={{ marginLeft: `${item.depth * MOBILE_INDENT_WIDTH}px`, opacity: insertLinePosition === 'top' ? 1 : 0 }}
			/>
			<div
				ref={setRefs}
				{...listeners}
				{...attributes}
				onContextMenu={(event) => event.preventDefault()}
				className={`relative isolate flex h-11 items-center rounded-lg pr-1 select-none [-webkit-touch-callout:none] ${
					isNestTarget ? 'bg-[var(--seed-color-bg-brand-weak)]' : ''
				}`}
				style={{ paddingLeft: `${item.depth * MOBILE_INDENT_WIDTH}px` }}
			>
				{hasChildren ? (
					<button
						type="button"
						onClick={() => onToggle(item.id)}
						aria-label={expanded ? `${item.name} 폴더 접기` : `${item.name} 폴더 펼치기`}
						className="relative z-10 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg
							text-[var(--seed-color-fg-neutral-muted)]"
					>
						<IconChevronRightSmallLine
							size={16}
							style={{ transform: expanded ? 'rotate(90deg)' : undefined, transition: 'transform 0.15s' }}
						/>
					</button>
				) : (
					<span className="h-8 w-8 shrink-0" />
				)}
				<NextLink
					href={folderDetailPath(item.id)}
					draggable={false}
					className="flex h-11 min-w-0 flex-1 items-center gap-2 after:absolute after:inset-0 after:rounded-lg"
				>
					<IconFolderLine size={18} className="shrink-0 text-[var(--seed-color-fg-neutral-muted)]" />
					<span className="truncate text-[15px] text-[var(--seed-color-fg-neutral)]">{item.name}</span>
					{hasChildren && (
						<span className="ml-auto shrink-0 pl-2 text-xs text-[var(--seed-color-fg-neutral-muted)]">
							하위 폴더 {childCount}
						</span>
					)}
				</NextLink>
				<FolderActionsMenu
					folderName={item.name}
					isSystem={item.isSystem}
					onCreateChild={() => onRequestCreate(item.id, item.name)}
					onRename={() => onRequestRename(item.id, item.name)}
					onDelete={() => onRequestDelete(item.id, item.name)}
					triggerClassName="ml-2 h-8 w-8"
				/>
			</div>
			<div
				aria-hidden="true"
				className="absolute inset-x-0 bottom-0 z-10 h-[3px] translate-y-1/2 rounded-full
					bg-[var(--seed-color-bg-brand-solid)]"
				style={{
					marginLeft: `${item.depth * MOBILE_INDENT_WIDTH}px`,
					opacity: insertLinePosition === 'bottom' ? 1 : 0,
				}}
			/>
		</li>
	);
}
