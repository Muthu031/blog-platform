import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

const SocialButton = ({ href, children }: { href?: string; children: React.ReactNode }) => {
  const Component = href ? 'a' : 'button';
  return (
    <Component
      {...(href ? { href, target: '_blank', rel: 'noopener noreferrer' } : { type: 'button' })}
      className="flex items-center justify-center gap-2 border border-gray-200 dark:border-gray-700 rounded px-4 py-2 bg-white dark:bg-gray-800 hover:shadow-sm"
    >
      {children}
    </Component>
  );
};

const socialProviders = [
  {
    name: 'Google',
    href: 'https://accounts.google.com',
    icon: 'M21.35 11.1h-9.17v3.66h5.65c-.24 1.45-1.44 4.18-5.65 4.18-3.41 0-6.19-2.81-6.19-6.27s2.78-6.27 6.19-6.27c1.89 0 3.16.81 3.89 1.51l2.2-2.12C17.9 4.27 15.6 3.09 12 3.09 6.48 3.09 2 7.64 2 13.02s4.48 9.93 10 9.93c5.79 0 9.85-4.06 9.85-9.77 0-.65-.07-1.15-.5-1.98z',
  },
  {
    name: 'Apple ID',
    href: undefined,
    icon: 'M16.365 1.043c-.85.03-1.86.586-2.463 1.29-.53.616-1.04 1.705-.86 2.708.99.041 1.92-.526 2.507-1.208.57-.666 1.01-1.606.816-2.79zM12.002 5.44c-2.7 0-5.27 1.842-6.41 4.578-1.07 2.44-.78 5.927 1.72 8.183 1.11.944 2.37 1.877 4.34 1.877 1.95 0 2.67-.6 3.69-.6 1.02 0 1.64.6 3.62.6 1.18 0 2.83-.54 3.94-1.86-1.86-1.37-2.94-3.63-2.94-6.56 0-4.03-2.9-6.68-7.96-6.96z',
  },
  {
    name: 'Facebook',
    href: undefined,
    icon: 'M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.99 3.66 9.12 8.44 9.88v-6.99H8.08v-2.89h2.36V9.41c0-2.33 1.38-3.61 3.5-3.61.99 0 2.02.18 2.02.18v2.22h-1.14c-1.12 0-1.47.7-1.47 1.42v1.71h2.5l-.4 2.89h-2.1v6.99C18.34 21.12 22 16.99 22 12z',
  },
];

interface SignInFormProps {
  onSwitchToSignUp: () => void;
}

const SignInForm = ({ onSwitchToSignUp }: SignInFormProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();

  const Navigate = () => {
    window.location.href = '/home';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await login(email, password);
    if (result.success) {
      setError('');
      Navigate()
    } else {
      setError('Invalid credentials');
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f0e9] dark:bg-gray-900 flex items-center justify-center p-6">
      <div className="max-w-6xl w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        {/* Left: Card */}
        <div className="flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl w-full md:w-[520px] p-10">
            <h1 className="text-2xl font-semibold text-center text-gray-900 dark:text-white">Agent Login</h1>
            <p className="text-sm text-center text-gray-500 dark:text-gray-400 mt-2 mb-6">
              Hey, Enter your details to get sign in to your account
            </p>

            {error && <p className="text-red-500 text-center mb-4">{error}</p>}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Enter Email / Phone No</label>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter Email / Phone No"
                  className="mt-2 w-full border border-gray-200 dark:border-gray-700 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Passcode</label>
                  <button type="button" className="text-xs text-gray-500 dark:text-gray-400">
                    Hide
                  </button>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Passcode"
                  className="mt-2 w-full border border-gray-200 dark:border-gray-700 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-amber-400 hover:bg-amber-500 text-white py-3 rounded-lg font-medium mt-1"
              >
                Sign in
              </button>

              <div className="flex items-center mt-4">
                <div className="flex-1 border-t border-gray-200 dark:border-gray-700"></div>
                <div className="px-3 text-gray-400 dark:text-gray-500 text-sm">— Or Sign in with —</div>
                <div className="flex-1 border-t border-gray-200 dark:border-gray-700"></div>
              </div>

              <div className="grid grid-cols-3 gap-3 mt-3">
                {socialProviders.map((provider) => (
                  <SocialButton key={provider.name} href={provider.href}>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d={provider.icon} />
                    </svg>
                    <span className="text-xs">{provider.name}</span>
                  </SocialButton>
                ))}
              </div>

              <div className="text-center mt-4 text-sm text-gray-500 dark:text-gray-400">
                Don't have an account? <button onClick={onSwitchToSignUp} className="text-amber-500 font-medium">Create account</button>
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

export default SignInForm;