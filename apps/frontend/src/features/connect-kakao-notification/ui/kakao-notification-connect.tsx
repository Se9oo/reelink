'use client';

import { useEffect } from 'react';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ActionButton } from 'seed-design/ui/action-button';
import { Snackbar, useSnackbarAdapter } from 'seed-design/ui/snackbar';
import { Switch } from 'seed-design/ui/switch';

import { useConnectKakaoNotification } from '@/features/connect-kakao-notification/model/use-connect-kakao-notification';

import { notificationSettingsQueryOptions } from '@/entities/notification/api/get-notification-settings';
import { notificationKeys } from '@/entities/notification/api/notification-keys';
import { useUpdateNotificationMethod } from '@/entities/notification/api/update-notification-method';

const RESULT_MESSAGES: Record<string, { message: string; variant: 'default' | 'critical' }> = {
	connected: { message: '카카오 알림을 연동했어요', variant: 'default' },
	cancelled: { message: '카카오 알림 연동을 취소했어요', variant: 'default' },
	failed: { message: '카카오 알림 연동에 실패했어요. 다시 시도해주세요', variant: 'critical' },
};

export function KakaoNotificationConnect() {
	const { data } = useQuery(notificationSettingsQueryOptions());
	const snackbar = useSnackbarAdapter();

	const connect = useConnectKakaoNotification();
	const updateMethod = useUpdateNotificationMethod();
	const queryClient = useQueryClient();

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
		return (
			<Switch
				size="24"
				checked={data.notificationMethod === 'kakao'}
				disabled={updateMethod.isPending}
				onCheckedChange={(checked) =>
					updateMethod.mutate(checked ? 'kakao' : 'manual', {
						onError: () => {
							snackbar.create({
								render: () => <Snackbar variant="critical" message="알림 설정을 바꾸지 못했어요. 다시 시도해주세요" />,
							});
							queryClient.invalidateQueries({ queryKey: notificationKeys.settings });
						},
					})
				}
				inputProps={{ 'aria-label': '카카오톡 알림 받기' }}
			/>
		);
	}

	return (
		<div className="flex items-center gap-2">
			{data.kakaoStatus === 'revoked' && (
				<span className="text-sm text-[var(--seed-color-fg-critical)]">연동이 끊어졌어요</span>
			)}
			<ActionButton size="small" variant="neutralWeak" loading={connect.isPending} onClick={() => connect.mutate()}>
				{data.kakaoStatus === 'revoked' ? '다시 연동하기' : '연동하기'}
			</ActionButton>
		</div>
	);
}
