import type { IncomingMessage, ServerResponse } from 'node:http';
import { uuidv7 } from 'uuidv7';

export const REQUEST_ID_HEADER = 'X-Request-Id';

const SAFE_ID = /^[\w.:-]{1,128}$/;

/** Reuses a well-formed incoming X-Request-Id or generates one, and echoes it on the response. */
export function requestIdFor(req: IncomingMessage, res: ServerResponse): string {
  const incoming = req.headers['x-request-id'];
  const id = typeof incoming === 'string' && SAFE_ID.test(incoming) ? incoming : `req_${uuidv7()}`;
  res.setHeader(REQUEST_ID_HEADER, id);
  return id;
}
