import { useMutation, useQueryClient } from '@tanstack/react-query';

import { Folder } from '@/entities/folder/model/types';

import { apiClient } from '@/shared/api/client';
import { folderKeys } from '@/shared/api/query-keys';

interface CreateFolderParams {
	name: string;
	parentFolderId?: string | null;
}

function createFolder(params: CreateFolderParams) {
	return apiClient.post('folders', { json: params }).json<Folder>();
}

export function useCreateFolder() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: createFolder,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: folderKeys.all });
		},
	});
}
