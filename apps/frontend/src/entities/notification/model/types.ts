export interface NotificationSettings {
	notificationMethod: 'kakao' | 'slack' | 'pwa' | 'manual';
	kakaoStatus: 'active' | 'revoked' | null;
}
