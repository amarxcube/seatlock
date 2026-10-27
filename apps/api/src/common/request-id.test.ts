import type { IncomingMessage, ServerResponse } from 'node:http';
import { describe, expect, it } from 'vitest';
import { requestIdFor } from './request-id.js';

function call(header?: string) {
  const headers: Record<string, string> = {};
  const req = {
    headers: header === undefined ? {} : { 'x-request-id': header },
  } as IncomingMessage;
  const res = {
    setHeader: (k: string, v: string) => (headers[k] = v),
  } as unknown as ServerResponse;
  return { id: requestIdFor(req, res), echoed: headers['X-Request-Id'] };
}

describe('requestIdFor', () => {
  it('reuses a well-formed incoming ID and echoes it', () => {
    expect(call('demo-1')).toEqual({ id: 'demo-1', echoed: 'demo-1' });
  });

  it('generates a time-ordered ID when none is sent', () => {
    expect(call().id).toMatch(/^req_[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-/);
  });

  it('rejects IDs that could inject into logs or headers', () => {
    expect(call('a\nb').id).toMatch(/^req_/);
    expect(call('x'.repeat(200)).id).toMatch(/^req_/);
  });
});
