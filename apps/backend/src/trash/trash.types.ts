import { Folder } from '../folders/folders.types.js';
import { Link } from '../links/links.types.js';

export interface TrashFolder extends Folder {
	/** 부모 폴더도 같이(cascade로) 삭제된 경우에만 그 부모 이름, 아니면 null */
	parentName: string | null;
}

export interface TrashLink extends Link {
	/** 소속 폴더도 같이(cascade로) 삭제된 경우에만 그 폴더 이름, 아니면 null */
	parentFolderName: string | null;
}

export interface TrashResponse {
	folders: TrashFolder[];
	links: TrashLink[];
}

export type TrashItemType = 'folder' | 'link';
