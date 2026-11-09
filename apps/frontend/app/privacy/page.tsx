import type { Metadata } from 'next';

import { PrivacyPolicy } from '@/widgets/privacy/ui/privacy-policy';

export const metadata: Metadata = {
	title: '개인정보 처리방침 | Reelink',
};

export default function PrivacyPage() {
	return <PrivacyPolicy />;
}
