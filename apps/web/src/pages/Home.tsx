import { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { User } from '../types';

// Sample blog posts
const blogPosts = [
  {
    id: 1,
    title: 'Building a Future-Ready Blog Platform',
    excerpt: 'Learn how to create a premium blog that positions you as an expert and drives organic growth.',
    category: 'Tutorials',
    readTime: '5 min read',
    date: '2026-01-04',
  },
  {
    id: 2,
    title: 'The Art of Writing Insightful Content',
    excerpt: 'Discover the principles behind creating content that resonates and converts readers into loyal followers.',
    category: 'Insights',
    readTime: '7 min read',
    date: '2026-01-03',
  },
  {
    id: 3,
    title: 'From Code to Monetization: Scaling Your Tech Blog',
    excerpt: 'A case study on turning technical writing into a sustainable income stream.',
    category: 'Case Studies',
    readTime: '10 min read',
    date: '2026-01-02',
  },
];



export default function Home() {
  const { userId, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [msg, setMsg] = useState<string>('Loading...');
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState<boolean>(true);

  useEffect(() => {
    // const fetchMessage = async () => {
    //   try {
    //     const response = await api.get<{ message: string }>('/hello');
    //     setMsg(response?.data?.message);
    //   } catch (error) {
    //     setMsg('Failed to load message');
    //   }
    // };

    const fetchUser = async () => {
      if (userId) {
        try {
          const response = await api.get<User>(`/users/${userId}`);
          setUser(response.data);
        } catch (error) {
          console.error('Failed to fetch user details:', error);
        } finally {
          setLoadingUser(false);
        }
      } else {
        setLoadingUser(false);
      }
    };

    // fetchMessage();
    fetchUser();
  }, [userId]);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm z-10 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Portfolio</h1>
          <div className="flex items-center space-x-4">
            <span className="text-sm">Welcome {user ? user.name : loadingUser ? 'Loading...' : 'User'}</span>
            <button
              onClick={toggleTheme}
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
              onClick={logout}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Expert Developer & Writer
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            Building future-ready applications and sharing insights through premium content that drives growth and innovation.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <span className="text-sm text-gray-500 dark:text-gray-400 self-center">API Status: {user ? 'Active' : 'Inactive'}</span>
          </div>
        </div>
      </section>

      {/* Blog/Portfolio Projects Section */}
      <section className="py-16 px-4 bg-gray-50 dark:bg-gray-800/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12">Featured Articles & Projects</h2>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {blogPosts.map((post) => (
              <article
                key={post.id}
                className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="text-sm text-blue-600 dark:text-blue-400 font-medium mb-3 uppercase tracking-wide">
                  {post.category}
                </div>
                <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white leading-tight">
                  {post.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                  {post.excerpt}
                </p>
                <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-4">
                  <span className="flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                    {post.readTime}
                  </span>
                  <span>{post.date}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-gray-200 dark:border-gray-800">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-gray-600 dark:text-gray-400">
            © 2026 Portfolio Blog. Built with passion for excellence.
          </p>
        </div>
      </footer>
    </div>
  );
}
