'use client';

import Link from 'next/link';

import { useQuery } from '@tanstack/react-query';
import { ActionButton } from 'seed-design/ui/action-button';
import { Switch } from 'seed-design/ui/switch';

import { browserPushSubscriptionKey, getBrowserSubscription } from '@/features/web-push-notification/lib/browser-push';
import { usePushEnvironment } from '@/features/web-push-notification/lib/push-environment';
import { useSetWebPush } from '@/features/web-push-notification/model/use-set-web-push';

import { meQueryOptions } from '@/entities/user/api/get-me';

import { ROUTES } from '@/shared/config/routes';

const DESCRIPTIONS = {
	desktop:
		'브라우저가 켜져 있을 때만 알림이 와요. 알림이 안 오면 컴퓨터 설정에서 브라우저 알림이 허용돼 있는지 확인해주세요',
	mobile: '설정한 시각에 이 기기로 알림이 울려요',
	'install-required': '홈 화면에 추가하면 알림을 받을 수 있어요',
	unsupported: '이 브라우저는 알림을 지원하지 않아요',
};

export function WebPushDescription() {
	const environment = usePushEnvironment();

	return environment ? DESCRIPTIONS[environment] : null;
}

export function WebPushToggle() {
	const environment = usePushEnvironment();
	const canSubscribe = environment === 'desktop' || environment === 'mobile';
	const { data: me } = useQuery(meQueryOptions());
	const { data: subscription } = useQuery({
		queryKey: browserPushSubscriptionKey,
		queryFn: getBrowserSubscription,
		enabled: canSubscribe,
	});
	const toggle = useSetWebPush();

	if (!canSubscribe || !me) {
		return null;
	}

	if (me.isGuest) {
		return (
			<ActionButton asChild size="small" variant="neutralWeak">
				<Link href={ROUTES.LOGIN}>로그인</Link>
			</ActionButton>
		);
	}

	return (
		<Switch
			size="24"
			checked={!!subscription}
			disabled={subscription === undefined || toggle.isPending}
			onCheckedChange={(checked) => toggle.mutate(checked ? undefined : (subscription ?? undefined))}
			inputProps={{ 'aria-label': '이 기기에서 알림 받기' }}
		/>
	);
}
