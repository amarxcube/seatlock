import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { NestExpressApplication } from '@nestjs/platform-express';
import swaggerUi from 'swagger-ui-express';
import { parse } from 'yaml';

/**
 * The committed OpenAPI contract (ADR-0010). The build copies it next to the compiled code;
 * when running from source it's read from docs/api/.
 */
export function contractPath(): string {
  const candidates = [
    new URL('../openapi.yaml', import.meta.url), // dist/docs/contract.js → dist/openapi.yaml
    new URL('../../../../docs/api/openapi.yaml', import.meta.url), // src/docs/contract.ts → repo
  ].map((url) => fileURLToPath(url));
  const found = candidates.find((file) => existsSync(file));
  if (!found) throw new Error(`OpenAPI contract not found; looked in:\n${candidates.join('\n')}`);
  return found;
}

export function loadContract(): Record<string, unknown> {
  return parse(readFileSync(contractPath(), 'utf8')) as Record<string, unknown>;
}

/** Serves the committed contract at /api/docs (Swagger UI) and /api/docs/openapi.json. */
export function mountContractDocs(app: NestExpressApplication): void {
  const contract = loadContract();
  const express = app.getHttpAdapter().getInstance();
  express.get('/api/docs/openapi.json', (_req, res) => {
    res.json(contract);
  });
  express.use('/api/docs', swaggerUi.serve, swaggerUi.setup(contract));
}
