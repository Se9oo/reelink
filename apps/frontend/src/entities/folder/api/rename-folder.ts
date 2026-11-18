import { useMutation, useQueryClient } from '@tanstack/react-query';

import { Folder } from '@/entities/folder/model/types';

import { apiClient } from '@/shared/api/client';
import { folderKeys } from '@/shared/api/query-keys';

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
