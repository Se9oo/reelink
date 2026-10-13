import { useRouter } from 'next/navigation';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';
import { ROUTES } from '@/shared/config/routes';

function logout() {
	return apiClient.post('auth/logout');
}

export function useLogout() {
	const router = useRouter();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: logout,
		onSuccess: () => {
			queryClient.clear();
			router.push(ROUTES.LOGIN);
		},
	});
}
