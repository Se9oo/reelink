import { sendNotification, WebPushError } from 'web-push';

const VAPID_SUBJECT = 'https://reelink.link';
const GONE_STATUSES = [404, 410];

export interface WebPushSubscription {
	endpoint: string;
	p256dhKey: string;
	authKey: string;
}

export interface WebPushPayload {
	title: string;
	body: string;
	url: string;
	tag: string;
}

/**
 * 웹 푸시를 보낸다. 서비스 워커가 payload의 tag로 알림을 띄워 같은 tag 알림은 덮어쓴다.
 * @param subscription WebPushSubscription
 * @param payload WebPushPayload
 * @param options { ttlSeconds: number; urgency: 'normal' | 'high' } ttlSeconds는 브라우저가 꺼져 있을 때 푸시 서버가 보관하는 시간
 * @returns boolean 보냈으면 true, 구독이 만료되거나 권한이 해제돼(404/410) 더 보낼 수 없으면 false
 * @throws WebPushError 5xx 등 일시적인 실패
 */
export async function sendWebPush(
	subscription: WebPushSubscription,
	payload: WebPushPayload,
	{ ttlSeconds, urgency }: { ttlSeconds: number; urgency: 'normal' | 'high' },
): Promise<boolean> {
	try {
		await sendNotification(
			{ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dhKey, auth: subscription.authKey } },
			JSON.stringify(payload),
			{
				TTL: ttlSeconds,
				urgency,
				vapidDetails: {
					subject: VAPID_SUBJECT,
					publicKey: process.env.VAPID_PUBLIC_KEY ?? '',
					privateKey: process.env.VAPID_PRIVATE_KEY ?? '',
				},
			},
		);
		return true;
	} catch (err) {
		if (err instanceof WebPushError && GONE_STATUSES.includes(err.statusCode)) {
			return false;
		}
		throw err;
	}
}
