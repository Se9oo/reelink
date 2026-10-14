import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { ROUTES } from '@/shared/config/routes';

const PUBLIC_ROUTES = [ROUTES.LOGIN, '/'];

export function proxy(request: NextRequest) {
	const { pathname } = request.nextUrl;

	if (PUBLIC_ROUTES.includes(pathname)) {
		return NextResponse.next();
	}

	if (!request.cookies.has('has_session')) {
		return NextResponse.redirect(new URL(ROUTES.LOGIN, request.url));
	}

	return NextResponse.next();
}

export const config = {
	matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
