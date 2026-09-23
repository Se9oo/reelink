import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, type Profile } from 'passport-google-oauth20';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
	constructor() {
		super({
			clientID: process.env.GOOGLE_CLIENT_ID ?? '',
			clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
			callbackURL: process.env.GOOGLE_CALLBACK_URL ?? '',
			scope: ['email', 'profile'],
		});
	}

	async validate(_accessToken: string, _refreshToken: string, profile: Profile) {
		const { id, displayName, emails } = profile;

		const userEmail = emails?.[0]?.value;

		if (!userEmail) {
			throw new UnauthorizedException('Not exist user email');
		}

		const userInfo = {
			provider: 'google',
			providerAccountId: String(id),
			email: userEmail,
			nickname: displayName,
		};

		return userInfo;
	}
}
