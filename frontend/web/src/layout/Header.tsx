import React from 'react';
import { ChevronDown, Bell, HelpCircle, Search } from 'lucide-react';
import { Avatar } from '@components/ui';
import { User, Organization } from '@types';
import { cn } from '@utils';

interface HeaderProps {
  user: User;
  organization: Organization;
  onOrganizationChange?: (org: Organization) => void;
  organizations?: Organization[];
  onProfileClick?: () => void;
  onSettingsClick?: () => void;
  onLogout?: () => void;
}

export function Header({
  user,
  organization,
  onOrganizationChange,
  organizations = [],
  onProfileClick,
  onSettingsClick,
  onLogout,
}: HeaderProps) {
  const [showOrgDropdown, setShowOrgDropdown] = React.useState(false);
  const [showUserMenu, setShowUserMenu] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const userMenuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowOrgDropdown(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <header className="fixed top-0 right-0 left-0 lg:left-64 h-16 bg-white border-b border-gray-200 z-20">
      <div className="h-full px-4 sm:px-6 flex items-center justify-between gap-4">
        {/* Left side - Workspace and Search */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {/* Organization Switcher */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowOrgDropdown(!showOrgDropdown)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white text-sm font-bold">
                {organization.name.charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:flex flex-col items-start min-w-0">
                <span className="text-sm font-medium text-gray-900 truncate">{organization.name}</span>
                <span className="text-xs text-gray-500">{organization.slug}</span>
              </div>
              <ChevronDown size={16} className="text-gray-500 flex-shrink-0" />
            </button>

            {showOrgDropdown && organizations.length > 0 && (
              <div className="absolute top-full left-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                {organizations.map((org) => (
                  <button
                    key={org.id}
                    onClick={() => {
                      onOrganizationChange?.(org);
                      setShowOrgDropdown(false);
                    }}
                    className={cn(
                      'w-full px-4 py-2 text-left text-sm transition-colors',
                      org.id === organization.id ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700 hover:bg-gray-50'
                    )}
                  >
                    <div className="font-medium">{org.name}</div>
                    <div className="text-xs text-gray-500">{org.slug}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Search */}
          <div className="hidden md:flex flex-1 items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/20 transition-colors">
            <Search size={16} className="text-gray-500" />
            <input
              type="text"
              placeholder="Search projects, tasks..."
              className="flex-1 bg-transparent text-sm outline-none placeholder-gray-500"
            />
          </div>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative group">
            <Bell size={20} className="text-gray-600" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          </button>

          {/* Help */}
          <button
            className="hidden sm:flex p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Help"
          >
            <HelpCircle size={20} className="text-gray-600" />
          </button>

          {/* User Menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Avatar name={user.name} avatar={user.avatar} size="sm" />
              <ChevronDown size={16} className="text-gray-500" />
            </button>

            {showUserMenu && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                {/* User Info */}
                <div className="px-4 py-3 border-b border-gray-200">
                  <p className="text-sm font-medium text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>

                {/* Menu Items */}
                <button
                  onClick={() => {
                    onProfileClick?.();
                    setShowUserMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Profile
                </button>
                <button
                  onClick={() => {
                    onSettingsClick?.();
                    setShowUserMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Settings
                </button>

                {/* Divider */}
                <div className="border-t border-gray-200" />

                {/* Logout */}
                {onLogout && (
                  <button
                    onClick={() => {
                      onLogout();
                      setShowUserMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Logout
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
