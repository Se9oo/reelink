import { Global, Module } from '@nestjs/common';

import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import * as schema from './schema.js';

export const DRIZZLE = Symbol('DRIZZLE');

export type DrizzleDb = NodePgDatabase<typeof schema>;

export type DrizzleTx = Parameters<Parameters<DrizzleDb['transaction']>[0]>[0];

@Global()
@Module({
	providers: [
		{
			provide: DRIZZLE,
			useFactory: (): DrizzleDb => {
				const pool = new Pool({ connectionString: process.env.DATABASE_URL });
				return drizzle(pool, { schema });
			},
		},
	],
	exports: [DRIZZLE],
})
export class DrizzleModule {}
