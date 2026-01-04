import React from 'react';

interface NavBarProps {
  userName?: string;
  loadingUser: boolean;
  theme: string;
  onToggleTheme: () => void;
  onLogout: () => void;
}

class NavBar extends React.Component<NavBarProps> {
  constructor(props: NavBarProps) {
    super(props);
    this.handleScrollToSection = this.handleScrollToSection.bind(this);
  }

  handleScrollToSection(sectionId: string) {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }

  render() {
    const { userName, loadingUser, theme, onToggleTheme, onLogout } = this.props;

    const navItems = [
      { id: 'about', label: 'About' },
      { id: 'skills', label: 'Skills' },
      { id: 'experience', label: 'Experience' },
      { id: 'projects', label: 'Projects' },
      { id: 'latest-work', label: 'Latest Work' },
      { id: 'contact', label: 'Contact' },
    ];

    return (
      <nav className="fixed top-0 w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm z-10 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Portfolio</h1>
          <div className="hidden md:flex items-center space-x-6">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => this.handleScrollToSection(item.id)}
                className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm hidden sm:block">
              Welcome {userName || (loadingUser ? 'Loading...' : 'User')}
            </span>
            <button
              onClick={onToggleTheme}
              className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                </svg>
              )}
            </button>
            <button
              onClick={onLogout}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
            >
              Logout
            </button>
          </div>
          {/* Mobile menu */}
          <div className="md:hidden flex items-center space-x-2 overflow-x-auto">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => this.handleScrollToSection(item.id)}
                className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors whitespace-nowrap px-2 py-1"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </nav>
    );
  }
}

export default NavBar;