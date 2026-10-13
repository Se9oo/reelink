import { useMutation, useQueryClient } from '@tanstack/react-query';

import { folderKeys } from '@/entities/folder/api/folder-keys';
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
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: moveFolder,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: folderKeys.all });
		},
	});
}
