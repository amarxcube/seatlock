import { Link, isRouteErrorResponse, useRouteError } from 'react-router';

/** Full-page error for unknown routes and render errors (wireframes §7). */
export function ErrorPage() {
  const error = useRouteError();
  const notFound = isRouteErrorResponse(error) && error.status === 404;

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">
        {notFound ? 'Page not found' : 'Something went wrong'}
      </h1>
      <p className="mt-2 text-ink-muted">
        {notFound ? "We couldn't find that page." : 'Please try again in a moment.'}
      </p>
      <Link to="/" className="mt-6 inline-block underline">
        Back to events
      </Link>
    </div>
  );
}
