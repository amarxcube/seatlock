import { ApiStatus } from '../components/api-status';
import { API_URL } from '../lib/api';

/** Placeholder home page for Phase 0; the event listing (S1) replaces it in Phase 2. */
export function Component() {
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">SeatLock</h1>
        <p className="text-ink-muted">Pick your seat. Hold it. It's yours.</p>
      </div>
      <div className="rounded-lg bg-surface-muted p-4">
        <ApiStatus />
        <p className="mt-2 text-xs text-ink-muted">
          Calling <code>{API_URL}</code> ·{' '}
          <a className="underline" href={API_URL.replace(/\/v1$/, '/docs')}>
            API docs
          </a>
        </p>
      </div>
    </section>
  );
}
