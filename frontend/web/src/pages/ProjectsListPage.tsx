import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import { Button, Input, Card, Badge, DropdownMenu, Modal } from '@components/ui';
import { apiClient, ApiClient } from '@services/api';
import { useNotificationStore } from '@store';

type CreateProjectForm = {
  name: string;
  key: string;
  description?: string;
};

export function ProjectsListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { orgSlug } = useParams();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [createForm, setCreateForm] = React.useState<CreateProjectForm>({
    name: '',
    key: '',
    description: '',
  });

  const {
    data: projects = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['projects', orgSlug],
    queryFn: () => apiClient.getProjects(orgSlug as string),
    enabled: Boolean(orgSlug),
  });

  const createProject = useMutation({
    mutationFn: (data: CreateProjectForm) => apiClient.createProject(orgSlug as string, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', orgSlug] });
      useNotificationStore.getState().addNotification('Project created', 'success');
      setShowCreateModal(false);
      setCreateForm({ name: '', key: '', description: '' });
    },
    onError: (err) => {
      const apiErr = ApiClient.handleError(err as unknown);
      useNotificationStore.getState().addNotification(apiErr.message || 'Failed to create project', 'error');
    },
  });

  const filteredProjects = projects.filter((p: any) => {
    const q = searchQuery.toLowerCase();
    return (
      p.name?.toLowerCase().includes(q) ||
      p.key?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-600 mt-1">Manage your tenant projects</p>
        </div>
        <Button
          variant="primary"
          icon={<Plus size={20} />}
          onClick={() => setShowCreateModal(true)}
        >
          New Project
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Search projects..."
          icon={<Search size={18} />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1"
        />
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  Project
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  Visibility
                </th>
                <th className="px-6 py-3 relative">&nbsp;</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td className="px-6 py-6 text-gray-500" colSpan={4}>
                    Loading projects...
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td className="px-6 py-6 text-gray-500" colSpan={4}>
                    Failed to load projects.
                  </td>
                </tr>
              ) : filteredProjects.length === 0 ? (
                <tr>
                  <td className="px-6 py-6 text-gray-500" colSpan={4}>
                    No projects found.
                  </td>
                </tr>
              ) : (
                filteredProjects.map((project: any) => (
                  <tr
                    key={project.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/org/${orgSlug}/project/${project.id}/board`)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                          {(project.key || project.name || 'P').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{project.name}</p>
                          <p className="text-xs text-gray-500">{project.key}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <Badge variant={project.archived ? 'secondary' : 'success'} size="sm">
                        {project.archived ? 'archived' : 'active'}
                      </Badge>
                    </td>

                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">{project.visibility || 'private'}</span>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <DropdownMenu
                        trigger={<span className="text-gray-500">...</span>}
                        items={[
                          { label: 'Open board', value: 'open' },
                        ]}
                        onSelect={(value) => {
                          if (value === 'open') {
                            navigate(`/org/${orgSlug}/project/${project.id}/board`);
                          }
                        }}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create project"
        description="Add a new project to this organization"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Name"
            value={createForm.name}
            onChange={(e) => setCreateForm((s) => ({ ...s, name: e.target.value }))}
          />
          <Input
            label="Key"
            placeholder="E.g. PROJ"
            value={createForm.key}
            onChange={(e) => setCreateForm((s) => ({ ...s, key: e.target.value.toUpperCase() }))}
          />
          <Input
            label="Description"
            value={createForm.description}
            onChange={(e) => setCreateForm((s) => ({ ...s, description: e.target.value }))}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={createProject.isPending}
              onClick={() => createProject.mutate(createForm)}
            >
              Create
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

