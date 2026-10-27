'use client';

import { useEffect } from 'react';

import { useMutation, useQuery } from '@tanstack/react-query';
import { ActionButton } from 'seed-design/ui/action-button';
import { Snackbar, useSnackbarAdapter } from 'seed-design/ui/snackbar';

import { notificationSettingsQueryOptions } from '@/entities/notification/api/get-notification-settings';

import { apiClient } from '@/shared/api/client';

const RESULT_MESSAGES: Record<string, { message: string; variant: 'default' | 'critical' }> = {
	connected: { message: '카카오 알림을 연동했어요', variant: 'default' },
	cancelled: { message: '카카오 알림 연동을 취소했어요', variant: 'default' },
	failed: { message: '카카오 알림 연동에 실패했어요. 다시 시도해주세요', variant: 'critical' },
};

export function KakaoNotificationConnect() {
	const { data } = useQuery(notificationSettingsQueryOptions());
	const snackbar = useSnackbarAdapter();

	const connect = useMutation({
		mutationFn: () => apiClient.get('notifications/kakao/connect').json<{ url: string }>(),
		onSuccess: ({ url }) => {
			window.location.href = url;
		},
	});

	useEffect(() => {
		const url = new URL(window.location.href);
		const result = RESULT_MESSAGES[url.searchParams.get('kakao') ?? ''];

		if (!result) {
			return;
		}

		snackbar.create({ render: () => <Snackbar variant={result.variant} message={result.message} /> });
		url.searchParams.delete('kakao');
		window.history.replaceState(null, '', url);
	}, [snackbar]);

	if (!data) {
		return null;
	}

	if (data.kakaoStatus === 'active') {
		return <span className="text-sm text-[var(--seed-color-fg-neutral-muted)]">연동됨</span>;
	}

	return (
		<ActionButton size="small" variant="neutralWeak" loading={connect.isPending} onClick={() => connect.mutate()}>
			{data.kakaoStatus === 'revoked' ? '다시 연동하기' : '연동하기'}
		</ActionButton>
	);
}
