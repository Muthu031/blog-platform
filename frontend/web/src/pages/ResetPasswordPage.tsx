import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button, Input, Card } from '@components/ui';
import { apiClient, ApiClient } from '@services/api';
import { useAuthStore, useOrganizationStore, useNotificationStore } from '@store';

const resetSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ResetFormData = z.infer<typeof resetSchema>;

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const setCurrentOrganization = useOrganizationStore((s) => s.setCurrentOrganization);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetFormData>({ resolver: zodResolver(resetSchema) });

  const onSubmit = async (data: ResetFormData) => {
    try {
      const res = await apiClient.changePassword(data.currentPassword, data.newPassword);
      const token = res?.accessToken || res?.access_token || res?.token;
      const nextUser = res?.user || res?.data?.user;
      const organization = res?.organization || res?.data?.organization || null;

      if (token && nextUser) {
        useAuthStore.getState().login(nextUser, token);
      }

      if (organization) {
        setCurrentOrganization(organization);
        useNotificationStore.getState().addNotification('Password updated successfully', 'success');
        navigate(`/org/${organization.slug}`);
        return;
      }

      useNotificationStore.getState().addNotification('Password updated successfully', 'success');
      navigate('/');
    } catch (error) {
      console.error('Password reset failed:', error);
      const apiErr = ApiClient.handleError(error as unknown);
      useNotificationStore.getState().addNotification(apiErr.message || 'Failed to reset password', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-lg">
        <Card className="p-8">
          <h1 className="text-2xl font-bold text-gray-900">Reset your password</h1>
          <p className="text-gray-600 mt-2">
            {user?.firstLoginRequired
              ? 'First login requires a password reset before you can access the system.'
              : 'Update your password to continue.'}
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <Input
              label="Current password"
              type="password"
              error={errors.currentPassword?.message}
              {...register('currentPassword')}
            />
            <Input
              label="New password"
              type="password"
              error={errors.newPassword?.message}
              {...register('newPassword')}
            />
            <Input
              label="Confirm new password"
              type="password"
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />

            <Button type="submit" variant="primary" fullWidth loading={isSubmitting}>
              Update password
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}

