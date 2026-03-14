import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, ApiClient } from '@services/api';
import { useNotificationStore } from '@store';

export function useOrganizations() {
  return useQuery({
    queryKey: ['organizations'],
    queryFn: () => apiClient.getOrganizations(),
  });
}

export function useOrganizationMembers(orgSlug: string) {
  return useQuery({
    queryKey: ['org-members', orgSlug],
    queryFn: () => apiClient.getOrganizationMembers(orgSlug),
    enabled: Boolean(orgSlug),
  });
}

export function useProjects(orgSlug: string) {
  return useQuery({
    queryKey: ['projects', orgSlug],
    queryFn: () => apiClient.getProjects(orgSlug),
    enabled: Boolean(orgSlug),
  });
}

export function useProject(orgSlug: string, projectId: string) {
  return useQuery({
    queryKey: ['project', orgSlug, projectId],
    queryFn: () => apiClient.getProject(orgSlug, projectId),
    enabled: Boolean(orgSlug && projectId),
  });
}

export function useBoards(orgSlug: string, projectId: string) {
  return useQuery({
    queryKey: ['boards', orgSlug, projectId],
    queryFn: () => apiClient.getBoards(orgSlug, projectId),
    enabled: Boolean(orgSlug && projectId),
  });
}

export function useCreateProject(orgSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => apiClient.createProject(orgSlug, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', orgSlug] });
      useNotificationStore.getState().addNotification('Project created', 'success');
    },
    onError: (err) => {
      const apiErr = ApiClient.handleError(err as unknown);
      useNotificationStore.getState().addNotification(apiErr.message || 'Failed to create project', 'error');
    },
  });
}

