import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, FolderOpen, Users, BarChart3 } from 'lucide-react';
import { Button, Card, Badge, Avatar, EmptyState } from '@components/ui';
import { apiClient, ApiClient } from '@services/api';
import { useNotificationStore } from '@store';

export function DashboardPage() {
  const navigate = useNavigate();
  const { orgSlug } = useParams();

  const {
    data: projects = [],
    isLoading: isProjectsLoading,
    isError: isProjectsError,
  } = useQuery({
    queryKey: ['projects', orgSlug],
    queryFn: () => apiClient.getProjects(orgSlug as string),
    enabled: Boolean(orgSlug),
  });

  const {
    data: members = [],
    isLoading: isMembersLoading,
  } = useQuery({
    queryKey: ['org-members', orgSlug],
    queryFn: () => apiClient.getOrganizationMembers(orgSlug as string),
    enabled: Boolean(orgSlug),
  });

  const firstProjectId = projects[0]?.id as string | undefined;
  const {
    data: boards = [],
    isLoading: isBoardsLoading,
  } = useQuery({
    queryKey: ['boards', orgSlug, firstProjectId],
    queryFn: () => apiClient.getBoards(orgSlug as string, firstProjectId as string),
    enabled: Boolean(orgSlug && firstProjectId),
  });

  React.useEffect(() => {
    if (isProjectsError) {
      useNotificationStore.getState().addNotification('Failed to load dashboard data', 'system');
    }
  }, [isProjectsError]);

  const activeProjects = projects.filter((p: any) => !p.archived).length;
  const teamMembers = members.length;

  const stats = [
    { icon: FolderOpen, label: 'Active Projects', value: activeProjects },
    { icon: Users, label: 'Team Members', value: teamMembers },
    { icon: BarChart3, label: 'Boards', value: projects.reduce((sum: number, p: any) => sum + (p.boards?.length || 0), 0) },
  ];

  const boardPreview = boards[0];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">Overview of your tenant activity.</p>
        </div>
        <Button
          variant="primary"
          icon={<Plus size={20} />}
          onClick={() => navigate(`/org/${orgSlug}/projects`)}
        >
          New Project
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <stat.icon className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Recent Projects</h2>
          <Button variant="ghost" size="sm" onClick={() => navigate(`/org/${orgSlug}/projects`)}>
            View all
          </Button>
        </div>

        {isProjectsLoading ? (
          <Card className="p-12 text-center">
            <p className="text-gray-500">Loading projects...</p>
          </Card>
        ) : projects.length === 0 ? (
          <EmptyState
            icon={<FolderOpen size={48} />}
            title="No projects yet"
            description="Create your first project to get started"
            action={<Button variant="primary" onClick={() => navigate(`/org/${orgSlug}/projects`)}>Create Project</Button>}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.slice(0, 6).map((project: any) => (
              <Card
                key={project.id}
                hoverable
                className="p-6 cursor-pointer transition-all"
                onClick={() => navigate(`/org/${orgSlug}/project/${project.id}/board`)}
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold bg-blue-600">
                    {(project.key || project.name || 'P').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{project.name}</h3>
                    <p className="text-xs text-gray-500">{project.key}</p>
                  </div>
                </div>

                {project.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">{project.description}</p>
                )}

                <div className="flex items-center justify-between">
                  <Badge variant={project.archived ? 'secondary' : 'success'} size="sm">
                    {project.archived ? 'archived' : 'active'}
                  </Badge>
                  <p className="text-xs text-gray-500">
                    {(project.boards?.length || 0)} boards
                  </p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Board Preview</h2>
        <Card className="p-6">
          {isBoardsLoading ? (
            <p className="text-gray-500">Loading board...</p>
          ) : !boardPreview ? (
            <p className="text-gray-500">No boards to preview yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {boardPreview.columns?.map((col: any) => (
                <div key={col.id} className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900">{col.name}</h4>
                    <span className="text-sm text-gray-500">{col.tasks?.length || 0}</span>
                  </div>
                  <div className="space-y-2">
                    {(col.tasks || []).slice(0, 3).map((t: any) => (
                      <div key={t.id} className="p-2 bg-white rounded border border-gray-200 text-sm">
                        {t.title}
                      </div>
                    ))}
                    {(col.tasks || []).length === 0 && (
                      <div className="text-sm text-gray-400">No tasks</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Team Members</h2>
        <Card>
          <div className="divide-y divide-gray-200">
            {isMembersLoading ? (
              <div className="p-4 text-gray-500">Loading members...</div>
            ) : members.length === 0 ? (
              <div className="p-4 text-gray-500">No members found.</div>
            ) : (
              members.map((m: any) => (
                <div key={m.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <Avatar name={m.user?.name || 'Unknown'} avatar={m.user?.avatarUrl} />
                    <div>
                      <p className="font-medium text-gray-900">{m.user?.name}</p>
                      <p className="text-sm text-gray-500">{m.user?.email}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" size="sm">
                    {m.role}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

