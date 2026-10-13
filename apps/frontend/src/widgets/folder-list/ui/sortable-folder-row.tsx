'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { IconChevronRightSmallLine, IconPlusSmallLine } from '@karrotmarket/react-monochrome-icon';

import { type FlattenedFolder, VISUAL_INDENT_WIDTH } from '@/widgets/folder-list/model/flatten-tree';

interface SortableFolderRowProps {
	item: FlattenedFolder;
	depth: number;
	hasChildren: boolean;
	expanded: boolean;
	onToggle: (id: string) => void;
	onRequestCreate: (parentId: string, parentName: string) => void;
}

export function SortableFolderRow({
	item,
	depth,
	hasChildren,
	expanded,
	onToggle,
	onRequestCreate,
}: SortableFolderRowProps) {
	const { setNodeRef, listeners, attributes, transform, transition, isDragging } = useSortable({ id: item.id });

	return (
		<li
			ref={setNodeRef}
			style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
		>
			<div
				{...listeners}
				{...attributes}
				style={{ paddingLeft: `${depth * VISUAL_INDENT_WIDTH}px` }}
				className="group flex h-8 items-center rounded-lg pr-1 text-sm text-[var(--seed-color-fg-neutral)]
					hover:bg-[var(--seed-color-bg-neutral-muted)]"
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
		</li>
	);
}
