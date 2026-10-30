import { PrefixIcon } from '@seed-design/react';
import { ActionButton } from 'seed-design/ui/action-button';

import { API_URL } from '@/shared/config/env';
import { ReelinkSymbol, ReelinkWordmark } from '@/shared/ui/logo/reelink-logo';

import { GithubIcon, GoogleIcon } from './provider-icons';

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
					<ActionButton asChild variant="neutralOutline" size="medium">
						<a href={`${API_URL}/auth/google`}>
							<PrefixIcon svg={<GoogleIcon />} />
							Google로 시작하기
						</a>
					</ActionButton>
					<ActionButton asChild variant="neutralSolid" size="medium">
						<a href={`${API_URL}/auth/github`}>
							<PrefixIcon svg={<GithubIcon />} />
							GitHub로 시작하기
						</a>
					</ActionButton>
				</div>
			</div>
		</main>
	);
}
