import { existsSync } from 'node:fs';

process.loadEnvFile(existsSync('.env.local') ? '.env.local' : '.env');
