import { createApiClient } from '@seatlock/api-client';

/** Base URL of the API, e.g. http://localhost:3000/api/v1 (set at build time). */
export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';

/** The app-wide typed client; requests and responses are checked against openapi.yaml. */
export const api = createApiClient(API_URL);

// type error: a string is not a number
export const retries: number = "three";
