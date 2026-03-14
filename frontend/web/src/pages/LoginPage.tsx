import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button, Input } from '@components/ui';
import { LogIn, Eye, EyeOff } from 'lucide-react';
import { apiClient, ApiClient } from '@services/api';
import { useAuthStore, useOrganizationStore, useNotificationStore } from '@store';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) });

  const [showPassword, setShowPassword] = React.useState(false);

  const onSubmit = async (data: LoginFormData) => {
    try {
      const res = await apiClient.login(data.email, data.password);

      const token = res?.accessToken || res?.access_token || res?.token;
      const user = res?.user || res?.data?.user;
      const organization = res?.organization || res?.data?.organization || null;

      if (user && token) {
        useAuthStore.getState().login(user, token);
      }

      if (organization) {
        useOrganizationStore.getState().setCurrentOrganization(organization);
      }

      useNotificationStore.getState().addNotification('Logged in successfully', 'success');

      if (user?.firstLoginRequired) {
        navigate('/reset-password');
        return;
      }

      if (organization?.slug) {
        navigate(`/org/${organization.slug}`);
        return;
      }

      navigate('/org/select');
    } catch (error) {
      console.error('Login failed:', error);
      const apiErr = ApiClient.handleError(error as unknown);
      useNotificationStore
        .getState()
        .addNotification(apiErr.message || 'Login failed. Please try again.', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-xl mb-4">
            <LogIn className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">ProjectPal</h1>
          <p className="text-gray-600 mt-2">Manage projects with ease</p>
        </div>

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
              Sign in
            </Button>
          </form>

          <p className="text-center text-sm text-gray-600 mt-6">
            Don't have an account?{' '}
            <button onClick={() => navigate('/signup')} className="text-blue-600 hover:underline">
              Sign up
            </button>
          </p>
        </div>

        <p className="text-center text-sm text-gray-600 mt-8">
          (c) 2024 ProjectPal. All rights reserved.
        </p>
      </div>
    </div>
  );
}

