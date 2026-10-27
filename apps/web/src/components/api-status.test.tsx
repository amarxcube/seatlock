import { createApiClient } from '@seatlock/api-client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ApiStatus } from './api-status';

function clientReturning(status: number, body: unknown) {
  return createApiClient('http://api.test/api/v1', {
    fetch: async () =>
      new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      }),
  });
}

function renderWith(client: ReturnType<typeof createApiClient>) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <ApiStatus client={client} />
    </QueryClientProvider>,
  );
}

describe('ApiStatus', () => {
  it('shows ready when the API and its dependencies are up', async () => {
    renderWith(clientReturning(200, { status: 'ok', checks: { postgres: 'up', redis: 'up' } }));
    expect(await screen.findByText('ready')).toBeInTheDocument();
    expect(screen.getByText('Redis: up')).toBeInTheDocument();
  });

  it('shows degraded when only Redis is down', async () => {
    renderWith(
      clientReturning(200, { status: 'degraded', checks: { postgres: 'up', redis: 'down' } }),
    );
    expect(await screen.findByText(/degraded/)).toBeInTheDocument();
  });

  it('reads the Health body of a 503 instead of treating it as unreachable', async () => {
    renderWith(clientReturning(503, { status: 'down', checks: { postgres: 'down', redis: 'up' } }));
    expect(await screen.findByText(/database unreachable/)).toBeInTheDocument();
  });

  it('shows unreachable when the request fails', async () => {
    const client = createApiClient('http://api.test/api/v1', {
      fetch: async () => {
        throw new TypeError('Failed to fetch');
      },
    });
    renderWith(client);
    expect(await screen.findByText('unreachable')).toBeInTheDocument();
  });
});
