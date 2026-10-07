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
				className="group flex items-center rounded-lg text-sm text-[var(--seed-color-fg-neutral)]
					hover:bg-[var(--seed-color-bg-neutral-muted)]"
				style={{ paddingLeft: `${depth * 12}px` }}
			>
				{hasChildren ? (
					<button
						type="button"
						onClick={() => onToggle(node.id)}
						aria-label={expanded ? `${node.name} 폴더 접기` : `${node.name} 폴더 펼치기`}
						className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center
							text-[var(--seed-color-fg-neutral-muted)]"
					>
						<IconChevronRightSmallLine
							size={14}
							style={{ transform: expanded ? 'rotate(90deg)' : undefined, transition: 'transform 0.15s' }}
						/>
					</button>
				) : (
					<span className="h-8 w-8 shrink-0" />
				)}
				<span className="flex-1">{node.name}</span>
				<button
					type="button"
					onClick={() => onRequestCreate(node.id, node.name)}
					aria-label={`${node.name} 폴더 안에 새 폴더 만들기`}
					className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center
						text-[var(--seed-color-fg-neutral-muted)] opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
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
