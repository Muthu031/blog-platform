import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, LogOut, Settings, Home, FolderOpen, Users, LayoutGrid } from 'lucide-react';
import { cn } from '@utils';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

interface SidebarProps {
  organizationSlug: string;
  navItems: NavItem[];
  onLogout?: () => void;
}

export function Sidebar({ organizationSlug, navItems, onLogout }: SidebarProps) {
  const location = useLocation();
  const [isOpen, setIsOpen] = React.useState(true);

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Mobile Menu Button */}
      <button onClick={() => setIsOpen(!isOpen)} className="lg:hidden fixed top-4 left-4 z-40 p-2 hover:bg-gray-100 rounded-lg">
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <div
        className={cn(
          'fixed left-0 top-0 h-screen bg-white border-r border-gray-200 transition-all duration-300 z-30',
          isOpen ? 'w-64' : 'w-20 lg:w-64'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-4 border-b border-gray-200">
            <Link to={`/org/${organizationSlug}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
                P
              </div>
              {isOpen && <span className="font-bold text-gray-900">ProjectPal</span>}
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                  isActive(item.path) ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-100'
                )}
                title={!isOpen ? item.label : undefined}
              >
                {item.icon}
                {isOpen && <span className="text-sm font-medium">{item.label}</span>}
              </Link>
            ))}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 space-y-2">
            <Link
              to={`/org/${organizationSlug}/settings`}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                isActive(`/org/${organizationSlug}/settings`) ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-100'
              )}
              title="Settings"
            >
              <Settings size={20} />
              {isOpen && <span className="text-sm font-medium">Settings</span>}
            </Link>

            {onLogout && (
              <button
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <LogOut size={20} />
                {isOpen && <span className="text-sm font-medium">Logout</span>}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Overlay */}
      {isOpen && <div className="fixed inset-0 bg-black/20 lg:hidden z-20" onClick={() => setIsOpen(false)} />}
    </>
  );
}
