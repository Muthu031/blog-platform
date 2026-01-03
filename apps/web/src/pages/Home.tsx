import { useEffect, useState } from 'react';
import api from '../services/api';
import useStore from '../stores/useStore';
import { useTheme } from '../hooks/useTheme';

export default function Home() {
  const { name, setName, logout } = useStore();
  const { theme, toggleTheme } = useTheme();
  const [msg, setMsg] = useState<string>('Loading...');

  useEffect(() => {
    const fetchMessage = async () => {
      try {
        const response = await api.get<{ message: string }>('/hello');
        setMsg(response?.data?.message);
      } catch (error) {
        setMsg('Failed to load message');
      }
    };

    fetchMessage();
  }, []);

  return (
    <main className="p-8 min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Welcome {name}</h1>
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
      </div>

      <p className="mb-4">Message from API: {msg}</p>

      <input
        className="border border-gray-300 dark:border-gray-700 p-2 rounded mr-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        placeholder="Muthu"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <button
        onClick={logout}
        className="bg-red-500 hover:bg-red-600 text-white p-2 rounded ml-2"
      >
        Logout
      </button>
    </main>
  );
}
