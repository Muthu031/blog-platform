import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button, Input } from '@components/ui';
import { LogIn, Eye, EyeOff } from 'lucide-react';
import { apiClient, ApiClient } from '@services/api';
import { useAuthStore, useOrganizationStore } from '@store';
import { useNotificationStore } from '@store';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const [showPassword, setShowPassword] = React.useState(false);

  const onSubmit = async (data: LoginFormData) => {
    try {
      const res = await apiClient.login(data.email, data.password);

      // Attempt to extract token and user from common response shapes
      const token = res?.access_token || res?.token || res?.accessToken || res?.data?.access_token;
      const user = res?.user || res?.data?.user || res?.data || res;
      const organization = res?.organization || res?.data?.organization || null;

      // Ensure we set auth state even if the API response doesn't include a token
      if (user) {
        const t = token ?? '';
        if (t) localStorage.setItem('auth_token', t);
        useAuthStore.getState().login(user, t);
        useNotificationStore.getState().addNotification('Logged in successfully', 'success');
      }

      if (organization) {
        useOrganizationStore.getState().setCurrentOrganization(organization);
        navigate(`/org/${organization.slug}`);
      } else {
        navigate('/');
      }
    } catch (error) {
      console.error('Login failed:', error);
      try {
        const apiErr = ApiClient.handleError(error as unknown);
        useNotificationStore.getState().addNotification(apiErr.message || 'Login failed. Please check your credentials.', 'error');
      } catch {
        useNotificationStore.getState().addNotification('Login failed. Please check your credentials.', 'error');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-xl mb-4">
            <LogIn className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">ProjectPal</h1>
          <p className="text-gray-600 mt-2">Manage projects with ease</p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Welcome back</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              error={errors.password?.message}
              icon={(
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="p-1 text-gray-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              )}
              iconPosition="right"
              {...register('password')}
            />

            <Button type="submit" variant="primary" fullWidth loading={isSubmitting}>
              Sign In
            </Button>
          </form>

          <p className="text-center text-sm text-gray-600 mt-6">
            Don't have an account?{' '}
            <button onClick={() => navigate('/signup')} className="text-blue-600 hover:underline">
              Sign up
            </button>
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-600 mt-8">
          © 2024 ProjectPal. All rights reserved.
        </p>
      </div>
    </div>
  );
}
