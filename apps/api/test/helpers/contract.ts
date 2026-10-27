import type { INestApplication } from '@nestjs/common';
import { Ajv2020 } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import type { Response } from 'supertest';
import { loadContract } from '../../src/docs/contract.js';

// Contract enforcement (ADR-0014): real responses are validated against docs/api/openapi.yaml.

type Json = Record<string, unknown>;

const contract = loadContract() as Json & { paths: Record<string, Record<string, Json>> };
const ajv = new Ajv2020({ strict: false, allErrors: true, validateSchema: false });
addFormats.default(ajv);
ajv.addSchema(contract, 'contract');

const HTTP_METHODS = ['get', 'put', 'post', 'delete', 'patch', 'head', 'options'];

const escapePointer = (segment: string) => segment.replaceAll('~', '~0').replaceAll('/', '~1');

function resolve(pointer: string): Json {
  let node: unknown = contract;
  for (const raw of pointer.replace(/^#\//, '').split('/')) {
    const key = raw.replaceAll('~1', '/').replaceAll('~0', '~');
    node = (node as Json)[key];
    if (node === undefined) throw new Error(`Contract has no ${pointer}`);
  }
  return node as Json;
}

function findOperation(operationId: string): { path: string; method: string } {
  for (const [path, item] of Object.entries(contract.paths)) {
    for (const method of HTTP_METHODS) {
      if (item[method]?.operationId === operationId) return { path, method };
    }
  }
  throw new Error(`No operation "${operationId}" in openapi.yaml`);
}

function validate(pointer: string, body: unknown, label: string): void {
  const check = ajv.getSchema(`contract${pointer}`);
  if (!check) throw new Error(`Cannot compile schema at ${pointer}`);
  if (!check(body)) {
    throw new Error(
      `${label} does not match the contract: ${ajv.errorsText(check.errors)}\n` +
        `Body: ${JSON.stringify(body)}`,
    );
  }
}

/** Asserts the response's status, content type and body match the operation in openapi.yaml. */
export function expectContract(res: Response, operationId: string): void {
  const { path, method } = findOperation(operationId);
  const base = `#/paths/${escapePointer(path)}/${method}/responses`;
  const responses = resolve(base);
  const statusKey = String(res.status) in responses ? String(res.status) : 'default';
  if (!(statusKey in responses)) {
    throw new Error(
      `${operationId}: status ${res.status} is not in the contract ` +
        `(allowed: ${Object.keys(responses).join(', ')})`,
    );
  }

  let pointer = `${base}/${statusKey}`;
  let response = resolve(pointer);
  if (typeof response.$ref === 'string') {
    pointer = response.$ref;
    response = resolve(pointer);
  }
  const content = response.content as Record<string, unknown> | undefined;
  if (!content) return;

  const contentType =
    String(res.headers['content-type'] ?? '')
      .split(';')[0]
      ?.trim() ?? '';
  if (!(contentType in content)) {
    throw new Error(
      `${operationId} ${res.status}: content type "${contentType}" is not in the contract ` +
        `(allowed: ${Object.keys(content).join(', ')})`,
    );
  }
  validate(
    `${pointer}/content/${escapePointer(contentType)}/schema`,
    res.body,
    `${operationId} ${res.status}`,
  );
}

/** Asserts a body matches a named schema in components/schemas (e.g. 'Problem'). */
export function expectSchema(body: unknown, schemaName: string): void {
  validate(`#/components/schemas/${schemaName}`, body, schemaName);
}

/** Every `METHOD /path` the contract defines, with `{param}` placeholders. */
export function contractRoutes(): Set<string> {
  const routes = new Set<string>();
  for (const [path, item] of Object.entries(contract.paths)) {
    for (const method of HTTP_METHODS) {
      if (item[method]) routes.add(`${method.toUpperCase()} ${path}`);
    }
  }
  return routes;
}

/** Every `METHOD /path` the running Nest app serves, relative to the API prefix. */
export function appRoutes(app: INestApplication, prefix: string): Set<string> {
  const express = app.getHttpAdapter().getInstance() as {
    router?: { stack: { route?: { path: string; methods: Record<string, boolean> } }[] };
  };
  const routes = new Set<string>();
  for (const layer of express.router?.stack ?? []) {
    // Skip non-API routes (docs) and Nest's catch-all 404 handler (`{/*splat}`).
    if (!layer.route?.path.startsWith(`${prefix}/`) || layer.route.path.includes('*')) continue;
    const path = layer.route.path.replace(prefix, '').replace(/:(\w+)/g, '{$1}');
    for (const [method, enabled] of Object.entries(layer.route.methods)) {
      if (enabled && method !== '_all') routes.add(`${method.toUpperCase()} ${path}`);
    }
  }
  return routes;
}
