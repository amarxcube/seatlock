import createClient, { type ClientOptions } from 'openapi-fetch';
import type { components, paths } from './schema.js';

export type { components, paths };
export type Schemas = components['schemas'];

/** A client whose paths, parameters and responses are typed from the OpenAPI contract. */
export function createApiClient(baseUrl: string, options: Omit<ClientOptions, 'baseUrl'> = {}) {
  return createClient<paths>({ baseUrl, ...options });
}

export type ApiClient = ReturnType<typeof createApiClient>;
