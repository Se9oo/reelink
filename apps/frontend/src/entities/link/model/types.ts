export interface Link {
	id: string;
	userId: string;
	folderId: string;
	url: string;
	title: string | null;
	thumbnailUrl: string | null;
	folderSource: string;
	shelfLifeDays: number | null;
	savedReason: string | null;
	status: string;
	createdAt: string;
	lastRemindedAt: string | null;
	deletedAt: string | null;
}
