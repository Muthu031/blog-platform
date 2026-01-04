import { useState } from 'react';
import api from '../../services/api';

interface SignUpFormProps {
  onSwitchToSignIn: () => void;
}

const SignUpForm = ({ onSwitchToSignIn }: SignUpFormProps) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
 

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    try {
      const response = await api.post('/auth/signup', { name, email, password });
      if (response.data.success) {
        setSuccess(response.data.message || 'Account created successfully! Please sign in.');
        setError('');
        // Optionally switch to sign in after success
        setTimeout(() => onSwitchToSignIn(), 2000);
      } else {
        setError(response.data.error || 'Registration failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f0e9] dark:bg-gray-900 flex items-center justify-center p-6">
      <div className="max-w-6xl w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        {/* Left: Card */}
        <div className="flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl w-full md:w-[520px] p-10">
            <h1 className="text-2xl font-semibold text-center text-gray-900 dark:text-white">Create Account</h1>
            <p className="text-sm text-center text-gray-500 dark:text-gray-400 mt-2 mb-6">
              Join us today! Create your account to get started.
            </p>

            {error && <p className="text-red-500 text-center mb-4">{error}</p>}
            {success && <p className="text-green-500 text-center mb-4">{success}</p>}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  className="mt-2 w-full border border-gray-200 dark:border-gray-700 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="mt-2 w-full border border-gray-200 dark:border-gray-700 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password"
                  className="mt-2 w-full border border-gray-200 dark:border-gray-700 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  className="mt-2 w-full border border-gray-200 dark:border-gray-700 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-amber-400 hover:bg-amber-500 text-white py-3 rounded-lg font-medium mt-1"
              >
                Create Account
              </button>

              <div className="text-center mt-4 text-sm text-gray-500 dark:text-gray-400">
                Already have an account? <button onClick={onSwitchToSignIn} className="text-amber-500 font-medium">Sign In</button>
              </div>
            </form>
          </div>
        </div>

        {/* Right: Illustration */}
        <div className="hidden md:flex items-center justify-center">
          <div className="w-full max-w-md">
            <div className="bg-[url('/asset/images.jfif')] bg-contain bg-no-repeat h-96 rounded-xl"></div>
            {/* Fallback decorative shapes if no image is provided */}
            <div className="mt-6 flex gap-3">
              <div className="h-16 w-12 rounded bg-amber-200 dark:bg-amber-700"></div>
              <div className="h-16 w-12 rounded bg-white dark:bg-gray-800 border dark:border-gray-700"></div>
              <div className="h-16 w-12 rounded bg-amber-100 dark:bg-amber-800"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUpForm;