import type { CSSProperties } from 'react';

import { PrefixIcon } from '@seed-design/react';
import { ActionButton } from 'seed-design/ui/action-button';

import { GuestStartButton } from '@/widgets/login/ui/guest-start-button';

import { API_URL } from '@/shared/config/env';
import { ReelinkSymbol, ReelinkWordmark } from '@/shared/ui/logo/reelink-logo';

import { GithubIcon, GoogleIcon, KakaoIcon } from './provider-icons';

const KAKAO_BUTTON_STYLE = {
	'--seed-color-bg-neutral-solid': '#FEE500',
	'--seed-color-bg-neutral-solid-pressed': '#F0D800',
	'--seed-color-fg-on-neutral-solid': 'rgba(0, 0, 0, 0.85)',
} as CSSProperties;

export function LoginScreen() {
	return (
		<main className="flex flex-1 flex-col items-center justify-center px-6">
			<div className="animate-fade-in-up flex w-full max-w-sm flex-col items-center gap-8 text-center">
				<div className="flex flex-col items-center gap-3">
					<ReelinkSymbol size={76} />
					<h1 className="text-3xl text-[var(--seed-color-fg-neutral)]">
						<ReelinkWordmark />
					</h1>
				</div>

				<div className="flex w-full flex-col gap-3">
					<ActionButton asChild variant="neutralSolid" size="medium" style={KAKAO_BUTTON_STYLE}>
						<a href={`${API_URL}/auth/kakao`}>
							<PrefixIcon svg={<KakaoIcon />} />
							카카오 로그인
						</a>
					</ActionButton>
					<ActionButton asChild variant="neutralOutline" size="medium">
						<a href={`${API_URL}/auth/google`}>
							<PrefixIcon svg={<GoogleIcon />} />
							Google 로그인
						</a>
					</ActionButton>
					<ActionButton asChild variant="neutralSolid" size="medium">
						<a href={`${API_URL}/auth/github`}>
							<PrefixIcon svg={<GithubIcon />} />
							GitHub 로그인
						</a>
					</ActionButton>

					<div className="flex items-center gap-3 py-1 text-xs text-[var(--seed-color-fg-neutral-subtle)]">
						<span className="h-px flex-1 bg-[var(--seed-color-stroke-neutral-subtle)]" />
						또는
						<span className="h-px flex-1 bg-[var(--seed-color-stroke-neutral-subtle)]" />
					</div>

					<GuestStartButton />
				</div>
			</div>
		</main>
	);
}
