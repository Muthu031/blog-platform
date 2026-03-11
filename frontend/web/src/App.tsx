import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { LoginPage } from '@pages/LoginPage';
import { SignupPage } from '@pages/SignupPage';
import { DashboardPage } from '@pages/DashboardPage';
import { ProjectsListPage } from '@pages/ProjectsListPage';
import { BoardPage } from '@pages/BoardPage';
import { AppLayout } from '@layout/AppLayout';
import { useAuthStore, useOrganizationStore } from '@store';
import {
  Home,
  FolderOpen,
  LayoutGrid,
  Settings,
  Users,
} from 'lucide-react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

// Protected route component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  const user = useAuthStore((state) => state.user);
  const organization = useOrganizationStore((state) => state.currentOrganization);

  // Mock organization for demo
  const mockOrganization = organization || {
    id: '1',
    name: 'Acme Corp',
    slug: 'acme-corp',
    description: 'A leading software company',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Mock user for demo
  const mockUser = user || {
    id: '1',
    email: 'john@example.com',
    name: 'John Doe',
    role: 'user' as const,
    createdAt: new Date().toISOString(),
  };

  const navigationItems = [
    {
      label: 'Dashboard',
      path: `/org/${mockOrganization.slug}`,
      icon: <Home size={20} />,
    },
    {
      label: 'Projects',
      path: `/org/${mockOrganization.slug}/projects`,
      icon: <FolderOpen size={20} />,
    },
    {
      label: 'Board',
      path: `/org/${mockOrganization.slug}/project/1/board`,
      icon: <LayoutGrid size={20} />,
    },
    {
      label: 'Team',
      path: `/org/${mockOrganization.slug}/team`,
      icon: <Users size={20} />,
    },
  ];

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          {/* Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* Protected Routes */}
          <Route
            path="/org/:orgSlug"
            element={
              <ProtectedRoute>
                <AppLayout
                  user={mockUser}
                  organization={mockOrganization}
                  navItems={navigationItems}
                  onLogout={() => {
                    // Handle logout
                  }}
                >
                  <DashboardPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/org/:orgSlug/projects"
            element={
              <ProtectedRoute>
                <AppLayout
                  user={mockUser}
                  organization={mockOrganization}
                  navItems={navigationItems}
                  onLogout={() => {
                    // Handle logout
                  }}
                >
                  <ProjectsListPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/org/:orgSlug/project/:projectId/board"
            element={
              <ProtectedRoute>
                <AppLayout
                  user={mockUser}
                  organization={mockOrganization}
                  navItems={navigationItems}
                  onLogout={() => {
                    // Handle logout
                  }}
                >
                  <BoardPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          {/* Legacy /dashboard route redirect for convenience */}
          <Route path="/dashboard" element={<Navigate to={`/org/${mockOrganization.slug}`} replace />} />

          {/* Default Route */}
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>

      {/* Notifications */}
      <Toaster position="top-right" />
    </QueryClientProvider>
  );
}
