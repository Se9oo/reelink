export const linkKeys = {
	all: ['links'] as const,
	folder: (folderId: string) => ['links', 'folder', folderId] as const,
	search: (query: string) => ['links', 'search', query] as const,
};
