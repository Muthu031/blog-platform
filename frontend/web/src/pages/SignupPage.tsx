import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button, Input } from '@components/ui';
import { UserPlus } from 'lucide-react';
import { apiClient, ApiClient } from '@services/api';
import { useNotificationStore } from '@store';

const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
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
      await apiClient.register(data.email, data.name);
      useNotificationStore
        .getState()
        .addNotification(
          'Account created. Check your email for a temporary password.',
          'success'
        );
      navigate('/login');
    } catch (error) {
      console.error('Signup failed:', error);
      const apiErr =
        typeof error === 'object' && error !== null && 'response' in error
          ? (ApiClient.handleError(error) as any)
          : null;
      useNotificationStore
        .getState()
        .addNotification(apiErr?.message || 'Signup failed. Try again.', 'error');
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
            <Input
              label="Name"
              placeholder="Your name"
              error={errors.name?.message}
              {...register('name')}
            />
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              error={errors.email?.message}
              {...register('email')}
            />

            <Button type="submit" variant="primary" fullWidth loading={isSubmitting}>
              Create account
            </Button>
          </form>

          <p className="text-xs text-gray-500 mt-4">
            We will email you a temporary password. You will be required to reset it
            after your first login.
          </p>

          <p className="text-center text-sm text-gray-600 mt-6">
            Already have an account?{' '}
            <button
              onClick={() => navigate('/login')}
              className="text-blue-600 hover:underline"
            >
              Sign in
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

