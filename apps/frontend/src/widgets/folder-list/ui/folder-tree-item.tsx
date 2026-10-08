import { IconChevronRightSmallLine, IconPlusSmallLine } from '@karrotmarket/react-monochrome-icon';

import { FolderTreeNode } from '@/entities/folder/model/types';

interface FolderTreeItemProps {
	node: FolderTreeNode;
	depth?: number;
	expandedIds: Set<string>;
	onToggle: (id: string) => void;
	onRequestCreate: (parentId: string, parentName: string) => void;
}

export function FolderTreeItem({ node, depth = 0, expandedIds, onToggle, onRequestCreate }: FolderTreeItemProps) {
	const hasChildren = node.children.length > 0;
	const expanded = expandedIds.has(node.id);

	return (
		<li>
			<div
				className="group flex h-8 items-center rounded-lg pr-1 text-sm text-[var(--seed-color-fg-neutral)]
					hover:bg-[var(--seed-color-bg-neutral-muted)]"
				style={{ paddingLeft: `${depth * 12}px` }}
			>
				{hasChildren ? (
					<button
						type="button"
						onClick={() => onToggle(node.id)}
						aria-label={expanded ? `${node.name} 폴더 접기` : `${node.name} 폴더 펼치기`}
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
				<span className="flex-1">{node.name}</span>
				<button
					type="button"
					onClick={() => onRequestCreate(node.id, node.name)}
					aria-label={`${node.name} 폴더 안에 새 폴더 만들기`}
					className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-lg
						text-(--seed-color-fg-neutral-muted) opacity-100 hover:bg-(--seed-color-bg-neutral-weak-pressed)
						lg:opacity-0 lg:group-hover:opacity-100"
				>
					<IconPlusSmallLine size={20} />
				</button>
			</div>
			{hasChildren && expanded && (
				<ul>
					{node.children.map((child) => (
						<FolderTreeItem
							key={child.id}
							node={child}
							depth={depth + 1}
							expandedIds={expandedIds}
							onToggle={onToggle}
							onRequestCreate={onRequestCreate}
						/>
					))}
				</ul>
			)}
		</li>
	);
}
