import { useEffect, useState } from 'react';
import api from '../services/api';
import useStore from '../stores/useStore';

export default function Home() {
  const { name, setName, logout } = useStore();
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
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">Welcome {name}</h1>

      <p className="mb-4">Message from API: {msg}</p>

      <input
        className="border p-2 rounded mr-2"
        placeholder="Muthu"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <button
        onClick={logout}
        className="bg-red-500 text-white p-2 rounded ml-2"
      >
        Logout
      </button>
    </main>
  );
}
