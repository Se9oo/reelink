import { useMutation, useQueryClient } from '@tanstack/react-query';

import { folderKeys } from '@/entities/folder/api/folder-keys';
import { Folder } from '@/entities/folder/model/types';

import { apiClient } from '@/shared/api/client';

interface RenameFolderParams {
	folderId: string;
	name: string;
}

function renameFolder({ folderId, name }: RenameFolderParams) {
	return apiClient.patch(`folders/${folderId}`, { json: { name } }).json<Folder>();
}

export function useRenameFolder() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: renameFolder,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: folderKeys.all });
		},
	});
}
