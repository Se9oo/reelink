export const ROUTES = {
	LOGIN: '/login',
	HOME: '/home',
	FEED: '/feed',
	FOLDERS: '/folders',
	SETTINGS: '/settings',
	TRASH: '/trash',
	PRIVACY: '/privacy',
} as const;

export function folderDetailPath(folderId: string) {
	return `${ROUTES.FOLDERS}/${folderId}`;
}
