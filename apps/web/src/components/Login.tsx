import { useState } from 'react';
import api from '../services/api';
import useStore from '../stores/useStore';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const login = useStore((state) => state.login);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await api.post('/login', { email, password });
      login(response.data.token);
      setError('');
    } catch (err) {
      setError('Invalid credentials');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow-md">
        <h2 className="text-2xl mb-4">Login</h2>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <div className="mb-4">
          <label className="block text-gray-700">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
            required
          />
        </div>
        <button type="submit" className="w-full bg-blue-500 text-white p-2 rounded">
          Login
        </button>
      </form>
    </div>
  );
};

export default Login;