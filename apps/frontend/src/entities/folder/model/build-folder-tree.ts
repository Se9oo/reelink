import { Folder, FolderTreeNode } from '@/entities/folder/model/types';

/** 플랫 폴더 배열을 parentFolderId 기준으로 중첩 트리로 변환하고, 각 레벨을 sortOrder로 정렬한다. */
export function buildFolderTree(folders: Folder[]): FolderTreeNode[] {
	const nodeById = new Map<string, FolderTreeNode>(folders.map((folder) => [folder.id, { ...folder, children: [] }]));
	const roots: FolderTreeNode[] = [];

	for (const folder of folders) {
		const node = nodeById.get(folder.id)!;
		const parent = folder.parentFolderId ? nodeById.get(folder.parentFolderId) : undefined;

		if (parent) {
			parent.children.push(node);
		} else {
			roots.push(node);
		}
	}

	const sortBySortOrder = (nodes: FolderTreeNode[]) => {
		nodes.sort((a, b) => a.sortOrder - b.sortOrder);
		nodes.forEach((node) => sortBySortOrder(node.children));
	};

	sortBySortOrder(roots);

	return roots;
}
