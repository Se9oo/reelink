import { PrefixIcon } from '@seed-design/react';
import { ActionButton } from 'seed-design/ui/action-button';

import { API_URL } from '@/shared/config/env';

import { GithubIcon, GoogleIcon } from './provider-icons';

export function LoginScreen() {
	return (
		<main className="flex flex-1 flex-col items-center justify-center px-6">
			<div className="animate-fade-in-up flex w-full max-w-sm flex-col items-center gap-8 text-center">
				<div className="flex flex-col gap-2">
					<h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Reelink</h1>
					<p className="text-sm text-zinc-500 dark:text-zinc-400">나중에 볼 링크, 잊기 전에 다시 떠오르게</p>
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
