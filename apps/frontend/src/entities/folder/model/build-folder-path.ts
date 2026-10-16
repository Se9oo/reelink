import { Folder } from '@/entities/folder/model/types';

export function buildFolderPath(folders: Folder[], folderId: string): string {
	const folderById = new Map(folders.map((folder) => [folder.id, folder]));
	const names: string[] = [];
	const visited = new Set<string>();
	let current = folderById.get(folderId);

	while (current && !visited.has(current.id)) {
		visited.add(current.id);
		names.unshift(current.name);
		current = current.parentFolderId ? folderById.get(current.parentFolderId) : undefined;
	}

	return names.join(' > ');
}
