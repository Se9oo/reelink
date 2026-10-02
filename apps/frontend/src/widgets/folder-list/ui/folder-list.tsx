'use client';

import { useQuery } from '@tanstack/react-query';

import { FolderTreeItem } from '@/widgets/folder-list/ui/folder-tree-item';

import { foldersQueryOptions } from '@/entities/folder/api/get-folders';
import { buildFolderTree } from '@/entities/folder/model/build-folder-tree';

export function FolderList() {
	const { data: folders } = useQuery(foldersQueryOptions());

	if (!folders) {
		return null;
	}

	const tree = buildFolderTree(folders);

	if (tree.length === 0) {
		return (
			<p className="p-6 text-center text-sm text-[var(--seed-color-fg-neutral-muted)]">아직 만든 폴더가 없어요.</p>
		);
	}

	return (
		<ul>
			{tree.map((node) => (
				<FolderTreeItem key={node.id} node={node} />
			))}
		</ul>
	);
}
