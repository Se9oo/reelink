import { type CanActivate, type ExecutionContext, ForbiddenException, Inject, Injectable } from '@nestjs/common';

import { eq } from 'drizzle-orm';
import type { Request } from 'express';

import { DRIZZLE, type DrizzleDb } from '../../db/drizzle.module.js';
import { users } from '../../db/schema.js';
import { type JwtPayload } from '../auth.types.js';

/**
 * 게스트를 막는 가드. JwtAuthGuard 뒤에 쓴다(`@UseGuards(JwtAuthGuard, NotGuestGuard)`).
 * 게스트 여부는 DB에서 확인한다.
 */
@Injectable()
export class NotGuestGuard implements CanActivate {
	constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const { sub } = context.switchToHttp().getRequest<Request>().user as JwtPayload;
		const [user] = await this.db.select({ isGuest: users.isGuest }).from(users).where(eq(users.id, sub));

		if (user?.isGuest) {
			throw new ForbiddenException('Guest cannot use this feature');
		}

		return true;
	}
}
