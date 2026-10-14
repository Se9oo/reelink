'use client';

import { useDraggable, useDroppable } from '@dnd-kit/core';
import { IconChevronRightSmallLine, IconPlusSmallLine } from '@karrotmarket/react-monochrome-icon';

import { type FlattenedFolder, VISUAL_INDENT_WIDTH } from '@/widgets/folder-list/model/flatten-tree';

interface FolderRowProps {
	item: FlattenedFolder;
	depth: number;
	hasChildren: boolean;
	expanded: boolean;
	isNestTarget: boolean;
	insertLinePosition: 'top' | 'bottom' | null;
	onToggle: (id: string) => void;
	onRequestCreate: (parentId: string, parentName: string) => void;
}

/**
 * 노션 사이드바처럼 드래그 중 다른 행은 자리를 안 바꾸고 가만히 있어야 해서, 실시간 swap
 * 애니메이션을 해주는 @dnd-kit/sortable(useSortable) 대신 더 낮은 레벨인
 * useDraggable(집기)/useDroppable(드롭 타겟 판정)을 각각 직접 붙인다.
 */
export function FolderRow({
	item,
	depth,
	hasChildren,
	expanded,
	isNestTarget,
	insertLinePosition,
	onToggle,
	onRequestCreate,
}: FolderRowProps) {
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
				style={{ marginLeft: `${depth * VISUAL_INDENT_WIDTH}px`, opacity: insertLinePosition === 'top' ? 1 : 0 }}
			/>
			<div
				ref={setRefs}
				{...listeners}
				{...attributes}
				style={{ paddingLeft: `${depth * VISUAL_INDENT_WIDTH}px` }}
				className={`group flex h-8 items-center rounded-lg pr-1 text-sm text-[var(--seed-color-fg-neutral)] ${
					isNestTarget ? 'bg-[var(--seed-color-bg-brand-weak)]' : 'hover:bg-[var(--seed-color-bg-neutral-muted)]'
				}`}
			>
				{hasChildren ? (
					<button
						type="button"
						onClick={() => onToggle(item.id)}
						aria-label={expanded ? `${item.name} 폴더 접기` : `${item.name} 폴더 펼치기`}
						className="mx-1 flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-lg
							text-[var(--seed-color-fg-neutral-muted)] hover:bg-[var(--seed-color-bg-neutral-weak-pressed)]"
					>
						<IconChevronRightSmallLine
							size={16}
							style={{ transform: expanded ? 'rotate(90deg)' : undefined, transition: 'transform 0.15s' }}
						/>
					</button>
				) : (
					<span className="mx-1 h-6 w-6 shrink-0" />
				)}
				<span className="flex-1">{item.name}</span>
				<button
					type="button"
					onClick={() => onRequestCreate(item.id, item.name)}
					aria-label={`${item.name} 폴더 안에 새 폴더 만들기`}
					className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-lg
						text-(--seed-color-fg-neutral-muted) opacity-100 hover:bg-(--seed-color-bg-neutral-weak-pressed)
						lg:opacity-0 lg:group-hover:opacity-100"
				>
					<IconPlusSmallLine size={20} />
				</button>
			</div>
			<div
				aria-hidden="true"
				className="absolute inset-x-0 bottom-0 z-10 h-[3px] translate-y-1/2 rounded-full
					bg-[var(--seed-color-bg-brand-solid)]"
				style={{ marginLeft: `${depth * VISUAL_INDENT_WIDTH}px`, opacity: insertLinePosition === 'bottom' ? 1 : 0 }}
			/>
		</li>
	);
}
