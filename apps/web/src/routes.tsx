import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { RequireAuth } from './lib/auth';
import { DashboardPage } from './pages/DashboardPage';
import { DesignGalleryPage } from './pages/DesignGalleryPage';
import { LoginPage } from './pages/auth/LoginPage';
import { ClientsPage } from './pages/clients/ClientsPage';
import { EngagementCreatePage } from './pages/engagements/EngagementCreatePage';
import { EngagementLayout } from './pages/engagements/EngagementLayout';
import { EngagementOverviewPage } from './pages/engagements/EngagementOverviewPage';
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
          { path: '/engagements/new', element: <EngagementCreatePage /> },
          {
            path: '/engagements/:id',
            element: <EngagementLayout />,
            children: [{ index: true, element: <EngagementOverviewPage /> }],
          },
          { path: '/design', element: <DesignGalleryPage /> },
        ],
      },
    ],
  },
]);
