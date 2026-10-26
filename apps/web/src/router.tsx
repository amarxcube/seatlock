import { createBrowserRouter } from 'react-router';
import { ErrorPage } from './routes/error-page';
import { RootLayout } from './routes/root-layout';

// Route bundles are lazy-loaded (architecture §6); the full route map arrives phase by phase.
export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <ErrorPage />,
    children: [{ index: true, lazy: () => import('./routes/home') }],
  },
]);
