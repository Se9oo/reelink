import { redirect } from 'next/navigation';

import { ROUTES } from '@/shared/config/routes';

// TODO: 랜딩 페이지 만들면 이 리다이렉트 제거
export default function Home() {
	redirect(ROUTES.LOGIN);
}
