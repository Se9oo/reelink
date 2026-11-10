import { useMutation } from '@tanstack/react-query';

import { Folder } from '@/entities/folder/model/types';

import { apiClient } from '@/shared/api/client';

interface MoveFolderParams {
	folderId: string;
	parentFolderId: string | null;
}

function moveFolder({ folderId, parentFolderId }: MoveFolderParams) {
	return apiClient.patch(`folders/${folderId}`, { json: { parentFolderId } }).json<Folder>();
}

export function useMoveFolder() {
	return useMutation({ mutationFn: moveFolder });
}
