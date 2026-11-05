import { useMutation } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';

export function useConnectKakaoNotification() {
	return useMutation({
		mutationFn: (options: { from: 'onboarding' } | void) =>
			apiClient.get('notifications/kakao/connect', { searchParams: options ?? {} }).json<{ url: string }>(),
		onSuccess: ({ url }) => {
			window.location.href = url;
		},
	});
}
