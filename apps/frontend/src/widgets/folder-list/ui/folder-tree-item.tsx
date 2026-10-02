import { FolderTreeNode } from '@/entities/folder/model/types';

export function FolderTreeItem({ node, depth = 0 }: { node: FolderTreeNode; depth?: number }) {
	return (
		<li>
			<div
				className="flex items-center gap-2 border-b border-[var(--seed-color-stroke-neutral-subtle)] px-4 py-3 text-sm
					text-[var(--seed-color-fg-neutral)]"
				style={{ paddingLeft: `${16 + depth * 20}px` }}
			>
				{node.name}
			</div>
			{node.children.length > 0 && (
				<ul>
					{node.children.map((child) => (
						<FolderTreeItem key={child.id} node={child} depth={depth + 1} />
					))}
				</ul>
			)}
		</li>
	);
}
