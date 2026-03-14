import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Outlet,
  useLocation,
  useParams,
  useNavigate,
} from 'react-router-dom';
import { QueryClientProvider, QueryClient, useQuery } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import {
  LoginPage,
  SignupPage,
  DashboardPage,
  ProjectsListPage,
  BoardPage,
  ResetPasswordPage,
  OrganizationSelectPage,
  SettingsPage,
} from '@pages';
import { AppLayout } from '@layout/AppLayout';
import { useAuthStore, useOrganizationStore, useNotificationStore } from '@store';
import { apiClient } from '@services/api';
import { Home, FolderOpen } from 'lucide-react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: false,
    },
  },
});

function FullScreenLoader({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-sm text-gray-600">{label}</div>
    </div>
  );
}

function RequireAuth({
  children,
  allowPasswordReset = false,
}: {
  children: React.ReactNode;
  allowPasswordReset?: boolean;
}) {
  const location = useLocation();
  const token = useAuthStore((s) => s.token) || localStorage.getItem('auth_token');
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const setToken = useAuthStore((s) => s.setToken);
  const logout = useAuthStore((s) => s.logout);

  React.useEffect(() => {
    if (token && !useAuthStore.getState().token) {
      setToken(token);
    }
  }, [setToken, token]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['auth-me'],
    queryFn: () => apiClient.me(),
    enabled: Boolean(token),
  });

  React.useEffect(() => {
    if (data) setUser(data);
  }, [data, setUser]);

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (isLoading) {
    return <FullScreenLoader label="Verifying session..." />;
  }

  if (isError) {
    logout();
    useOrganizationStore.getState().clear();
    return <Navigate to="/login" replace />;
  }

  const firstLoginRequired = Boolean((user as any)?.firstLoginRequired ?? (data as any)?.firstLoginRequired);
  if (firstLoginRequired && !allowPasswordReset) {
    return <Navigate to="/reset-password" replace />;
  }

  return <>{children}</>;
}

function RequireTenant({ children }: { children: React.ReactNode }) {
  const { orgSlug } = useParams();
  const setOrganizations = useOrganizationStore((s) => s.setOrganizations);
  const setCurrentOrganization = useOrganizationStore((s) => s.setCurrentOrganization);
  const logout = useAuthStore((s) => s.logout);

  const { data: organizations = [], isLoading, isError } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => apiClient.getOrganizations(),
  });

  React.useEffect(() => {
    setOrganizations(organizations);
    const current = organizations.find((o: any) => o.slug === orgSlug);
    if (current) setCurrentOrganization(current);
  }, [organizations, orgSlug, setOrganizations, setCurrentOrganization]);

  if (isLoading) {
    return <FullScreenLoader label="Loading tenant..." />;
  }

  if (isError) {
    logout();
    useOrganizationStore.getState().clear();
    return <Navigate to="/login" replace />;
  }

  const current = organizations.find((o: any) => o.slug === orgSlug);
  if (!current) {
    useNotificationStore.getState().addNotification('Access denied', 'error');
    logout();
    useOrganizationStore.getState().clear();
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function OrgShell() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const organization = useOrganizationStore((s) => s.currentOrganization);
  const organizations = useOrganizationStore((s) => s.organizations);

  if (!user || !organization) return <FullScreenLoader />;

  const navItems = [
    {
      label: 'Dashboard',
      path: `/org/${organization.slug}`,
      icon: <Home size={20} />,
    },
    {
      label: 'Projects',
      path: `/org/${organization.slug}/projects`,
      icon: <FolderOpen size={20} />,
    },
  ];

  return (
    <AppLayout
      user={user as any}
      organization={organization as any}
      organizations={organizations as any}
      navItems={navItems}
      onOrganizationChange={(org) => {
        useOrganizationStore.getState().setCurrentOrganization(org);
        navigate(`/org/${org.slug}`);
      }}
      onLogout={async () => {
        try {
          await apiClient.logout();
        } catch {
          // ignore
        }
        useAuthStore.getState().logout();
        useOrganizationStore.getState().clear();
        navigate('/login');
      }}
    >
      <Outlet />
    </AppLayout>
  );
}

function IndexRedirect() {
  const token = useAuthStore((s) => s.token) || localStorage.getItem('auth_token');
  return <Navigate to={token ? '/org/select' : '/login'} replace />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/" element={<IndexRedirect />} />

          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          <Route
            path="/reset-password"
            element={
              <RequireAuth allowPasswordReset>
                <ResetPasswordPage />
              </RequireAuth>
            }
          />

          <Route
            path="/org/select"
            element={
              <RequireAuth>
                <OrganizationSelectPage />
              </RequireAuth>
            }
          />

          <Route
            path="/org/:orgSlug"
            element={
              <RequireAuth>
                <RequireTenant>
                  <OrgShell />
                </RequireTenant>
              </RequireAuth>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="projects" element={<ProjectsListPage />} />
            <Route path="project/:projectId/board" element={<BoardPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>

      <Toaster position="top-right" />
    </QueryClientProvider>
  );
}
