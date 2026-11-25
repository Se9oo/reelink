export const linkKeys = {
	all: ['links'] as const,
	folder: (folderId: string) => ['links', 'folder', folderId] as const,
	search: (query: string) => ['links', 'search', query] as const,
};

export const folderKeys = {
	all: ['folders'] as const,
};

export const trashKeys = {
	all: ['trash'] as const,
};

export const autoSortKeys = {
	quota: ['auto-sort-quota'] as const,
};
