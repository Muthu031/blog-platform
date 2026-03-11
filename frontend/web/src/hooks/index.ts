import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@services/api';
import { useNotificationStore } from '@store';

/**
 * Hook for fetching projects
 */
export function useProjects(organizationId: string) {
  return useQuery({
    queryKey: ['projects', organizationId],
    queryFn: () => apiClient.getProjects(organizationId),
    enabled: !!organizationId,
  });
}

/**
 * Hook for fetching a single project
 */
export function useProject(projectId: string) {
  return useQuery({
    queryKey: ['project', projectId],
    queryFn: () => apiClient.getProject(projectId),
    enabled: !!projectId,
  });
}

/**
 * Hook for creating a project
 */
export function useCreateProject() {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((state: { addNotification: (message: string, type: 'success' | 'error') => void }) => state.addNotification);

  return useMutation({
    mutationFn: ({ organizationId, data }: { organizationId: string; data: any }) =>
      apiClient.createProject(organizationId, data),
    onSuccess: (data, { organizationId }) => {
      queryClient.invalidateQueries({ queryKey: ['projects', organizationId] });
      addNotification('Project created successfully', 'success');
    },
    onError: () => {
      addNotification('Failed to create project', 'error');
    },
  });
}

/**
 * Hook for fetching organization
 */
export function useOrganization(slug: string) {
  return useQuery({
    queryKey: ['organization', slug],
    queryFn: () => apiClient.getOrganization(slug),
    enabled: !!slug,
  });
}

/**
 * Hook for fetching organizations
 */
export function useOrganizations() {
  return useQuery({
    queryKey: ['organizations'],
    queryFn: () => apiClient.getOrganizations(),
  });
}

/**
 * Hook for fetching tasks
 */
export function useTasks(boardId: string, filters?: any) {
  return useQuery({
    queryKey: ['tasks', boardId, filters],
    queryFn: () => apiClient.getTasks(boardId, filters),
    enabled: !!boardId,
  });
}

/**
 * Hook for fetching a single task
 */
export function useTask(taskId: string) {
  return useQuery({
    queryKey: ['task', taskId],
    queryFn: () => apiClient.getTask(taskId),
    enabled: !!taskId,
  });
}

/**
 * Hook for creating a task
 */
export function useCreateTask() {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((state: { addNotification: any; }) => state.addNotification);

  return useMutation({
    mutationFn: ({ columnId, data }: { columnId: string; data: any }) =>
      apiClient.createTask(columnId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      addNotification('Task created successfully', 'success');
    },
    onError: () => {
      addNotification('Failed to create task', 'error');
    },
  });
}

/**
 * Hook for updating a task
 */
export function useUpdateTask() {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((state: { addNotification: any; }) => state.addNotification);

  return useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: any }) =>
      apiClient.updateTask(taskId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task'] });
      addNotification('Task updated successfully', 'success');
    },
    onError: () => {
      addNotification('Failed to update task', 'error');
    },
  });
}

/**
 * Hook for moving a task
 */
export function useMoveTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, columnId, position }: { taskId: string; columnId: string; position: number }) =>
      apiClient.moveTask(taskId, columnId, position),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

/**
 * Hook for deleting a task
 */
export function useDeleteTask() {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((state: { addNotification: any; }) => state.addNotification);

  return useMutation({
    mutationFn: (taskId: string) => apiClient.deleteTask(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      addNotification('Task deleted successfully', 'success');
    },
    onError: () => {
      addNotification('Failed to delete task', 'error');
    },
  });
}

/**
 * Hook for fetching board columns
 */
export function useBoardColumns(boardId: string) {
  return useQuery({
    queryKey: ['board-columns', boardId],
    queryFn: () => apiClient.getBoardColumns(boardId),
    enabled: !!boardId,
  });
}

/**
 * Hook for creating a board column
 */
export function useCreateBoardColumn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ boardId, data }: { boardId: string; data: any }) =>
      apiClient.createBoardColumn(boardId, data),
    onSuccess: (_, { boardId }) => {
      queryClient.invalidateQueries({ queryKey: ['board-columns', boardId] });
    },
  });
}

/**
 * Hook for fetching project labels
 */
export function useProjectLabels(projectId: string) {
  return useQuery({
    queryKey: ['labels', projectId],
    queryFn: () => apiClient.getProjectLabels(projectId),
    enabled: !!projectId,
  });
}

/**
 * Hook for fetching task comments
 */
export function useTaskComments(taskId: string) {
  return useQuery({
    queryKey: ['comments', taskId],
    queryFn: () => apiClient.getTaskComments(taskId),
    enabled: !!taskId,
  });
}

/**
 * Hook for creating a task comment
 */
export function useCreateTaskComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: any }) =>
      apiClient.createTaskComment(taskId, data),
    onSuccess: (_, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: ['comments', taskId] });
    },
  });
}

/**
 * Hook for fetching organization members
 */
export function useOrganizationMembers(organizationId: string) {
  return useQuery({
    queryKey: ['org-members', organizationId],
    queryFn: () => apiClient.getOrganizationMembers(organizationId),
    enabled: !!organizationId,
  });
}
