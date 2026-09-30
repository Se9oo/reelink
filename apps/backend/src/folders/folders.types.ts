export interface Folder {
	id: string;
	userId: string;
	name: string;
	parentFolderId: string | null;
	sortOrder: number;
	isSystem: boolean;
	deletedAt: Date | null;
}
