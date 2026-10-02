'use client';

import { useEffect, useState } from 'react';

import { FolderTreeItem } from '@/widgets/folder-list/ui/folder-tree-item';

import { getFolders } from '@/entities/folder/api/get-folders';
import { buildFolderTree } from '@/entities/folder/model/build-folder-tree';
import { FolderTreeNode } from '@/entities/folder/model/types';

export function FolderList() {
	const [tree, setTree] = useState<FolderTreeNode[] | null>(null);

	useEffect(() => {
		getFolders().then((folders) => setTree(buildFolderTree(folders)));
	}, []);

	if (tree === null) {
		return null;
	}

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
