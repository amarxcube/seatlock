import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

export const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/, error: 'must be a postgres:// URL' }),
  REDIS_URL: z.url({ protocol: /^rediss?$/, error: 'must be a redis:// or rediss:// URL' }),
  WEB_ORIGIN: z.url({ error: 'must be the web app origin, e.g. http://localhost:5173' }),
  WORKER_HEARTBEAT_MS: z.coerce.number().int().min(100).default(60_000),
});

export type AppConfig = z.infer<typeof EnvSchema>;

export class ConfigError extends Error {}

/** Parses and validates configuration; throws a readable ConfigError listing every problem. */
export function parseConfig(source: Record<string, string | undefined>): AppConfig {
  const result = EnvSchema.safeParse(source);
  if (result.success) return result.data;
  const lines = result.error.issues.map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`);
  throw new ConfigError(`Invalid configuration:\n${lines.join('\n')}`);
}

/** Outside production, loads the repo-root .env (shared with docker compose) if it exists. */
export function loadDotEnv(): void {
  if (process.env.NODE_ENV === 'production') return;
  const file = fileURLToPath(new URL('../../../../.env', import.meta.url));
  if (existsSync(file)) process.loadEnvFile(file);
}

/** Entry-point helper: load and validate config, or print the problems and exit. */
export function loadConfigOrExit(): AppConfig {
  loadDotEnv();
  try {
    return parseConfig(process.env);
  } catch (error) {
    if (!(error instanceof ConfigError)) throw error;
    process.stderr.write(`${error.message}\nSee .env.example for every variable.\n`);
    process.exit(1);
  }
}
