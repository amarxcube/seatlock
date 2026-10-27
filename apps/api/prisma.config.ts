import { existsSync } from 'node:fs';
import { defineConfig } from 'prisma/config';

// Prisma 7 doesn't load .env itself; locally the repo-root .env holds DATABASE_URL.
if (existsSync('../../.env')) process.loadEnvFile('../../.env');

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  // Optional so `prisma generate` works without a database (CI, Docker build).
  datasource: { url: process.env.DATABASE_URL },
});
