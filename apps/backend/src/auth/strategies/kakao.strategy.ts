import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, type Profile } from 'passport-kakao';

@Injectable()
export class KakaoStrategy extends PassportStrategy(Strategy, 'kakao') {
	constructor() {
		super({
			clientID: process.env.KAKAO_CLIENT_ID ?? '',
			clientSecret: process.env.KAKAO_CLIENT_SECRET,
			callbackURL: process.env.KAKAO_CALLBACK_URL ?? '',
		});
	}

	async validate(_accessToken: string, _refreshToken: string, profile: Profile) {
		const kakaoAccount = profile._json.kakao_account;
		const email = kakaoAccount?.email;
		const nickname = kakaoAccount?.profile?.nickname;

		if (!email) {
			throw new UnauthorizedException('Not exist user email');
		}

		const userInfo = {
			provider: 'kakao',
			providerAccountId: String(profile.id),
			email,
			nickname,
		};

		return userInfo;
	}
}
