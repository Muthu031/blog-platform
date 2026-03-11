import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { User, Organization } from '@types';
import { cn } from '@utils';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

interface AppLayoutProps {
  children: React.ReactNode;
  user: User;
  organization: Organization;
  navItems: NavItem[];
  organizations?: Organization[];
  onOrganizationChange?: (org: Organization) => void;
  onLogout?: () => void;
  onProfileClick?: () => void;
  onSettingsClick?: () => void;
}

export function AppLayout({
  children,
  user,
  organization,
  navItems,
  organizations,
  onOrganizationChange,
  onLogout,
  onProfileClick,
  onSettingsClick,
}: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar organizationSlug={organization.slug} navItems={navItems} onLogout={onLogout} />

      {/* Header */}
      <Header
        user={user}
        organization={organization}
        onOrganizationChange={onOrganizationChange}
        organizations={organizations}
        onProfileClick={onProfileClick}
        onSettingsClick={onSettingsClick}
        onLogout={onLogout}
      />

      {/* Main Content */}
      <main className={cn('pt-16 lg:pl-64 min-h-screen')}>
        <div className="p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
