import { Link, Outlet } from 'react-router';

export function RootLayout() {
  return (
    <div className="mx-auto min-h-screen max-w-5xl px-4 py-6">
      <header className="mb-8">
        <Link to="/" className="text-lg font-bold text-seat-available">
          SeatLock
        </Link>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
