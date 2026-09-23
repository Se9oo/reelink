import { type CanActivate, type ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

@Injectable()
export class JwtAuthGuard implements CanActivate {
	constructor(private readonly jwt: JwtService) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const req = context.switchToHttp().getRequest<Request>();
		const accessToken: string | undefined = req.cookies?.access_token;

		if (!accessToken) {
			throw new UnauthorizedException();
		}

		try {
			const payload = await this.jwt.verifyAsync(accessToken);
			req.user = payload;
		} catch (err) {
			throw new UnauthorizedException();
		}

		return true;
	}
}
