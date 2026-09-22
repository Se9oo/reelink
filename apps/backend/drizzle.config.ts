import { existsSync } from 'node:fs';
import { defineConfig } from 'drizzle-kit';

process.loadEnvFile(existsSync('.env.local') ? '.env.local' : '.env');

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
