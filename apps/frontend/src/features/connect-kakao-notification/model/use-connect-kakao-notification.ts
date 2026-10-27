import { useMutation } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';

export function useConnectKakaoNotification() {
	return useMutation({
		mutationFn: () => apiClient.get('notifications/kakao/connect').json<{ url: string }>(),
		onSuccess: ({ url }) => {
			window.location.href = url;
		},
	});
}
