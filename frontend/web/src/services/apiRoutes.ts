export const apiRoutes = {
  auth: {
    register: () => '/auth/register',
    login: () => '/auth/login',
    refresh: () => '/auth/refresh',
    me: () => '/auth/me',
    logout: () => '/auth/logout',
    changePassword: () => '/auth/change-password',
  },
  organizations: {
    list: () => '/organizations',
    create: () => '/organizations',
    get: (orgIdOrSlug: string) => `/organizations/${orgIdOrSlug}`,
    members: (orgIdOrSlug: string) => `/organizations/${orgIdOrSlug}/members`,
    invitations: (orgIdOrSlug: string) => `/organizations/${orgIdOrSlug}/invitations`,
  },
  projects: {
    list: (orgIdOrSlug: string) => `/organizations/${orgIdOrSlug}/projects`,
    create: (orgIdOrSlug: string) => `/organizations/${orgIdOrSlug}/projects`,
    get: (orgIdOrSlug: string, projectId: string) =>
      `/organizations/${orgIdOrSlug}/projects/${projectId}`,
    update: (orgIdOrSlug: string, projectId: string) =>
      `/organizations/${orgIdOrSlug}/projects/${projectId}`,
    delete: (orgIdOrSlug: string, projectId: string) =>
      `/organizations/${orgIdOrSlug}/projects/${projectId}`,
    boards: {
      list: (orgIdOrSlug: string, projectId: string) =>
        `/organizations/${orgIdOrSlug}/projects/${projectId}/boards`,
      create: (orgIdOrSlug: string, projectId: string) =>
        `/organizations/${orgIdOrSlug}/projects/${projectId}/boards`,
    },
  },
  tasks: {
    columns: {
      list: (orgIdOrSlug: string, projectId: string, columnId: string) =>
        `/organizations/${orgIdOrSlug}/projects/${projectId}/columns/${columnId}/tasks`,
      create: (orgIdOrSlug: string, projectId: string, columnId: string) =>
        `/organizations/${orgIdOrSlug}/projects/${projectId}/columns/${columnId}/tasks`,
    },
    get: (orgIdOrSlug: string, projectId: string, taskId: string) =>
      `/organizations/${orgIdOrSlug}/projects/${projectId}/tasks/${taskId}`,
    update: (orgIdOrSlug: string, projectId: string, taskId: string) =>
      `/organizations/${orgIdOrSlug}/projects/${projectId}/tasks/${taskId}`,
    move: (orgIdOrSlug: string, projectId: string, taskId: string) =>
      `/organizations/${orgIdOrSlug}/projects/${projectId}/tasks/${taskId}/move`,
    assign: (orgIdOrSlug: string, projectId: string, taskId: string) =>
      `/organizations/${orgIdOrSlug}/projects/${projectId}/tasks/${taskId}/assign`,
    unassign: (orgIdOrSlug: string, projectId: string, taskId: string) =>
      `/organizations/${orgIdOrSlug}/projects/${projectId}/tasks/${taskId}/unassign`,
    delete: (orgIdOrSlug: string, projectId: string, taskId: string) =>
      `/organizations/${orgIdOrSlug}/projects/${projectId}/tasks/${taskId}`,
  },
} as const;
