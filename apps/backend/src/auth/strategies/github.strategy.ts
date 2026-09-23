import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, type Profile } from 'passport-github2';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
	constructor() {
		super({
			clientID: process.env.GITHUB_CLIENT_ID ?? '',
			clientSecret: process.env.GITHUB_CLIENT_SECRET ?? '',
			callbackURL: process.env.GITHUB_CALLBACK_URL ?? '',
			scope: ['user:email'],
		});
	}

	async validate(_accessToken: string, _refreshToken: string, profile: Profile) {
		const email = profile.emails?.[0]?.value;

		if (!email) {
			throw new UnauthorizedException('Not exist user email');
		}

		return {
			provider: 'github',
			providerAccountId: String(profile.id),
			email,
			// displayName(실명)은 GitHub 프로필에 설정 안 했으면 null이라, username(깃허브 아이디)으로 폴백
			nickname: profile.displayName ?? profile.username,
		};
	}
}
