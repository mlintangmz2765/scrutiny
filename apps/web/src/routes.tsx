import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { RequireAuth } from './lib/auth';
import { DashboardPage } from './pages/DashboardPage';
import { DesignGalleryPage } from './pages/DesignGalleryPage';
import { LoginPage } from './pages/auth/LoginPage';
import { ClientsPage } from './pages/clients/ClientsPage';
import { EngagementsPage } from './pages/engagements/EngagementsPage';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: '/', element: <DashboardPage /> },
          { path: '/clients', element: <ClientsPage /> },
          { path: '/engagements', element: <EngagementsPage /> },
          { path: '/design', element: <DesignGalleryPage /> },
        ],
      },
    ],
  },
]);
