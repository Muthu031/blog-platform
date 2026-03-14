import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, ApiClient } from '@services/api';
import { Button, Card, Input } from '@components/ui';
import { useOrganizationStore, useNotificationStore } from '@store';

const createOrgSchema = z.object({
  name: z.string().min(2, 'Organization name is required'),
  slug: z
    .string()
    .min(2, 'Slug is required')
    .regex(/^[a-z0-9-]+$/, 'Use lowercase letters, numbers, and hyphens only'),
});

type CreateOrgForm = z.infer<typeof createOrgSchema>;

export function OrganizationSelectPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setOrganizations = useOrganizationStore((s) => s.setOrganizations);
  const setCurrentOrganization = useOrganizationStore((s) => s.setCurrentOrganization);

  const { data: organizations = [], isLoading } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => apiClient.getOrganizations(),
    retry: false,
  });

  React.useEffect(() => {
    setOrganizations(organizations);
  }, [organizations, setOrganizations]);

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<CreateOrgForm>({
    resolver: zodResolver(createOrgSchema),
  });

  const createOrg = useMutation({
    mutationFn: (data: CreateOrgForm) => apiClient.createOrganization(data),
    onSuccess: (org) => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      useNotificationStore.getState().addNotification('Organization created', 'success');
      setCurrentOrganization(org);
      navigate(`/org/${org.slug}`);
      reset();
    },
    onError: (err) => {
      const apiErr = ApiClient.handleError(err as unknown);
      useNotificationStore.getState().addNotification(apiErr.message || 'Failed to create organization', 'error');
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-3xl space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Choose an organization</h1>
          <p className="text-gray-600 mt-2">Select a tenant to continue, or create a new one.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900">Your organizations</h2>
            <p className="text-sm text-gray-600 mt-1">
              {isLoading ? 'Loading...' : `${organizations.length} available`}
            </p>

            <div className="mt-4 space-y-2">
              {organizations.map((org: any) => (
                <button
                  key={org.id}
                  onClick={() => {
                    setCurrentOrganization(org);
                    navigate(`/org/${org.slug}`);
                  }}
                  className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-white transition-colors"
                >
                  <div className="font-medium text-gray-900">{org.name}</div>
                  <div className="text-xs text-gray-500">{org.slug}</div>
                </button>
              ))}

              {!isLoading && organizations.length === 0 && (
                <p className="text-sm text-gray-500 mt-3">
                  You do not belong to any organizations yet.
                </p>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900">Create organization</h2>
            <p className="text-sm text-gray-600 mt-1">
              This becomes your tenant slug in URLs.
            </p>

            <form
              onSubmit={handleSubmit((data) => createOrg.mutate(data))}
              className="mt-4 space-y-4"
            >
              <Input label="Name" error={errors.name?.message} {...register('name')} />
              <Input label="Slug" error={errors.slug?.message} {...register('slug')} />

              <Button type="submit" variant="primary" fullWidth loading={isSubmitting || createOrg.isPending}>
                Create
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}

