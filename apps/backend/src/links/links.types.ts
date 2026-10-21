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
	pinnedAt: Date | null;
	viewedAt: Date | null;
	deletedAt: Date | null;
}

export interface HomeSummary {
	remind: {
		unviewedCount: number;
		revisitCount: number;
		oldestUnviewed: Link | null;
		previews: Link[];
	};
	week: { saved: number; viewed: number; cleaned: number; viewedLastWeek: number };
	recent: Link[];
	throwbacks: { label: 'oneMonth' | 'threeMonths'; link: Link }[];
}
