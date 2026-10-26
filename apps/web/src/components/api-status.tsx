import type { ApiClient, Schemas } from '@seatlock/api-client';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

type Health = Schemas['Health'];
type Status = Health['status'] | 'unreachable';

/** Fetches /health/ready. A 503 still carries a Health body, so it's data, not an error. */
async function fetchHealth(client: ApiClient): Promise<Health | null> {
  try {
    const { data, error } = await client.GET('/health/ready');
    return data ?? error ?? null;
  } catch {
    return null; // network failure or CORS rejection
  }
}

const LABELS: Record<Status, { text: string; tone: string }> = {
  ok: { text: 'ready', tone: 'text-timer-ok' },
  degraded: { text: 'degraded (Redis down; booking still works)', tone: 'text-timer-warn' },
  down: { text: 'down (database unreachable)', tone: 'text-timer-danger' },
  unreachable: { text: 'unreachable', tone: 'text-timer-danger' },
};

/** Shows whether the web app can reach the API through the generated client (Phase 0 check). */
export function ApiStatus({ client = api }: { client?: ApiClient }) {
  const { data, isPending } = useQuery({
    queryKey: ['health'],
    queryFn: () => fetchHealth(client),
    refetchInterval: 15_000,
  });

  if (isPending) {
    return <p className="text-ink-muted">Checking API…</p>;
  }
  const status: Status = data?.status ?? 'unreachable';
  const { text, tone } = LABELS[status];

  return (
    <div role="status" className="space-y-2">
      <p className="text-lg">
        API: <strong className={tone}>{text}</strong>
      </p>
      {data && (
        <ul className="text-sm text-ink-muted">
          <li>Postgres: {data.checks.postgres ?? 'unknown'}</li>
          <li>Redis: {data.checks.redis ?? 'unknown'}</li>
        </ul>
      )}
    </div>
  );
}
