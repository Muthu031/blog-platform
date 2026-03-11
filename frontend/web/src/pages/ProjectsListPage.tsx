import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Search, Filter, MoreVertical } from 'lucide-react';
import { Button, Input, Card, Badge, Avatar, DropdownMenu } from '@components/ui';

interface Project {
  id: string;
  name: string;
  key: string;
  description?: string;
  status: string;
  mentor?: string;
  members: number;
  color?: string;
}

export function ProjectsListPage() {
  const navigate = useNavigate();
  const { orgSlug } = useParams();
  const [searchQuery, setSearchQuery] = React.useState('');

  const projects: Project[] = [
    {
      id: '1',
      name: 'Website Redesign',
      key: 'WR',
      description: 'Modern UI/UX overhaul of the main website',
      status: 'active',
      mentor: 'Sarah Chen',
      members: 8,
      color: 'bg-blue-500',
    },
    {
      id: '2',
      name: 'Mobile App',
      key: 'MA',
      description: 'Native mobile application for iOS and Android',
      status: 'active',
      mentor: 'Alex Rodriguez',
      members: 6,
      color: 'bg-green-500',
    },
    {
      id: '3',
      name: 'API Integration',
      key: 'AI',
      description: 'Third-party API integrations and webhooks',
      status: 'planning',
      mentor: 'Emma Wilson',
      members: 4,
      color: 'bg-purple-500',
    },
  ];

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.key.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-600 mt-1">Manage all your organization projects</p>
        </div>
        <Button
          variant="primary"
          icon={<Plus size={20} />}
          onClick={() => navigate(`/org/${orgSlug}/new-project`)}
        >
          New Project
        </Button>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Search projects..."
          icon={<Search size={18} />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1"
        />
        <Button variant="outline" icon={<Filter size={18} />}>
          Filter
        </Button>
      </div>

      {/* Projects Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  Project
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  Lead
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  Members
                </th>
                <th className="px-6 py-3 relative">&nbsp;</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredProjects.map((project) => (
                <tr
                  key={project.id}
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/org/${orgSlug}/project/${project.id}`)}
                >
                  {/* Project */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded ${project.color} text-white flex items-center justify-center font-bold text-sm`}>
                        {project.key.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{project.name}</p>
                        <p className="text-xs text-gray-500">{project.key}</p>
                      </div>
                    </div>
                  </td>

                  {/* Lead */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Avatar name={project.mentor || 'Unknown'} size="sm" />
                      <p className="text-sm text-gray-900">{project.mentor}</p>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4">
                    <Badge variant={project.status === 'active' ? 'success' : 'warning'} size="sm">
                      {project.status}
                    </Badge>
                  </td>

                  {/* Members */}
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-600">{project.members} members</p>
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4">
                    <DropdownMenu
                      trigger={<MoreVertical size={18} className="text-gray-500" />}
                      items={[
                        { label: 'View', value: 'view' },
                        { label: 'Edit Settings', value: 'edit' },
                        { label: 'Members', value: 'members', divider: true },
                        { label: 'Delete', value: 'delete' },
                      ]}
                      onSelect={(value) => {
                        if (value === 'view') {
                          navigate(`/org/${orgSlug}/project/${project.id}`);
                        }
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {filteredProjects.length === 0 && (
        <Card className="p-12 text-center">
          <p className="text-gray-500">No projects found. Create or search with different keywords.</p>
        </Card>
      )}
    </div>
  );
}
