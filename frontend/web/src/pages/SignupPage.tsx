import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button, Input } from '@components/ui';
import { UserPlus } from 'lucide-react';
import { apiClient, ApiClient } from '@services/api';
import { useAuthStore, useOrganizationStore } from '@store';
import { useNotificationStore } from '@store';

const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

type SignupFormData = z.infer<typeof signupSchema>;

export function SignupPage() {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormData>({ resolver: zodResolver(signupSchema) });

  const onSubmit = async (data: SignupFormData) => {
    try {
      const res = await apiClient.signup(data.email, data.password, data.name);

      const token = res?.access_token || res?.token || res?.accessToken || res?.data?.access_token;
      const user = res?.user || res?.data?.user || res?.data || res;

      if (token) {
        localStorage.setItem('auth_token', token);
        useAuthStore.getState().login(user, token);
        useNotificationStore.getState().addNotification('Account created and logged in', 'success');
      } else {
        useNotificationStore.getState().addNotification('Account created — please sign in', 'success');
      }

      const organization = res?.organization || res?.data?.organization || null;
      if (organization) {
        useOrganizationStore.getState().setCurrentOrganization(organization);
        navigate(`/org/${organization.slug}`);
      } else {
        navigate('/');
      }
    } catch (error) {
      console.error('Signup failed:', error);
      const apiErr = (typeof error === 'object' && error !== null && 'response' in error) ? (ApiClient.handleError(error) as any) : null;
      useNotificationStore.getState().addNotification(apiErr?.message || 'Signup failed. Try again.', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600 rounded-xl mb-4">
            <UserPlus className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Create your account</h1>
          <p className="text-gray-600 mt-2">Join ProjectPal</p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Sign up</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input label="Name" placeholder="Your name" error={errors.name?.message} {...register('name')} />
            <Input label="Email" type="email" placeholder="you@example.com" error={errors.email?.message} {...register('email')} />
            <Input label="Password" type="password" placeholder="••••••••" error={errors.password?.message} {...register('password')} />

            <Button type="submit" variant="primary" fullWidth loading={isSubmitting}>
              Create account
            </Button>
          </form>

          <p className="text-center text-sm text-gray-600 mt-6">
            Already have an account?{' '}
            <button onClick={() => navigate('/login')} className="text-blue-600 hover:underline">
              Sign in
            </button>
          </p>
        </div>

        <p className="text-center text-sm text-gray-600 mt-8">© 2024 ProjectPal. All rights reserved.</p>
      </div>
    </div>
  );
}
