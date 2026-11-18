import { Folder } from '@/entities/folder/model/types';
import { Link } from '@/entities/link/model/types';

export interface TrashFolder extends Folder {
	parentName: string | null;
}

export interface TrashLink extends Link {
	parentFolderName: string | null;
}

export interface TrashResponse {
	folders: TrashFolder[];
	links: TrashLink[];
}
