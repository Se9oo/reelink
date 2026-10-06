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
	createdAt: Date;
	lastRemindedAt: Date | null;
	deletedAt: Date | null;
}
