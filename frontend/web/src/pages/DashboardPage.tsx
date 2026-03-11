import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, FolderOpen, Users, BarChart3 } from 'lucide-react';
import { Button, Card, Badge, Avatar, EmptyState } from '@components/ui';

interface Project {
  id: string;
  name: string;
  key: string;
  description?: string;
  status: string;
  color?: string;
}

interface TeamMember {
  id: string;
  name: string;
  avatar?: string;
  role: string;
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { orgSlug = 'default' } = useParams();
  //const { data: projects, isLoading } = useProjects(orgId);

  // Mock data for demo
  const projects: Project[] = [
    {
      id: '1',
      name: 'Website Redesign',
      key: 'WR',
      description: 'Modern UI/UX overhaul of the main website',
      status: 'active',
      color: 'bg-blue-500',
    },
    {
      id: '2',
      name: 'Mobile App',
      key: 'MA',
      description: 'Native mobile application for iOS and Android',
      status: 'active',
      color: 'bg-green-500',
    },
    {
      id: '3',
      name: 'API Integration',
      key: 'AI',
      description: 'Third-party API integrations and webhooks',
      status: 'active',
      color: 'bg-purple-500',
    },
  ];

  const teamMembers: TeamMember[] = [
    { id: '1', name: 'John Doe', role: 'Product Manager' },
    { id: '2', name: 'Jane Smith', role: 'Designer' },
    { id: '3', name: 'Mike Johnson', role: 'Developer' },
  ];

  const stats = [
    { icon: FolderOpen, label: 'Active Projects', value: projects.length },
    { icon: Users, label: 'Team Members', value: teamMembers.length },
    { icon: BarChart3, label: 'Tasks This Week', value: 24 },
  ];

  // Minimal Jira-like board preview layout (3 columns)
  const boardColumns = [
    { id: 'col-1', title: 'To Do', color: 'bg-slate-200', tasks: ['Task A', 'Task B'] },
    { id: 'col-2', title: 'In Progress', color: 'bg-amber-100', tasks: ['Task C'] },
    { id: 'col-3', title: 'Done', color: 'bg-emerald-100', tasks: ['Task D', 'Task E', 'Task F'] },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">Welcome back! Here's your project overview.</p>
        </div>
        <Button
          variant="primary"
          icon={<Plus size={20} />}
          onClick={() => navigate(`/org/${orgSlug}/new-project`)}
        >
          New Project
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className="p-6">
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

      {/* Projects Section */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Recent Projects</h2>
          <Button variant="ghost" size="sm" onClick={() => navigate(`/org/${orgSlug}/projects`)}>
            View all
          </Button>
        </div>

        {projects.length === 0 ? (
          <EmptyState
            icon={<FolderOpen size={48} />}
            title="No projects yet"
            description="Create your first project to get started"
            action={<Button variant="primary" onClick={() => navigate(`/org/${orgSlug}/new-project`)}>Create Project</Button>}
          />
        ) : (
          <div className="space-y-6">
            {/* Project cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <Card
                  key={project.id}
                  hoverable
                  className="p-6 cursor-pointer transition-all"
                  onClick={() => navigate(`/org/${orgSlug}/project/${project.id}`)}
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold ${project.color}`}>
                      {project.key.charAt(0)}
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
                    <Badge variant="secondary" size="sm">
                      {project.status}
                    </Badge>
                    <div className="flex -space-x-2">
                      {teamMembers.slice(0, 3).map((member) => (
                        <Avatar key={member.id} name={member.name} size="sm" />
                      ))}
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Board preview - Jira style small kanban */}
            <div>
              <h3 className="text-xl font-semibold mb-3">Board Preview</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {boardColumns.map((col) => (
                  <div key={col.id} className="bg-white rounded shadow p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">{col.title}</h4>
                      <span className="text-sm text-gray-500">{col.tasks.length}</span>
                    </div>
                    <div className="space-y-2">
                      {col.tasks.map((t, i) => (
                        <div key={i} className="p-2 bg-gray-50 rounded border border-gray-100">{t}</div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Team Section */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Team Members</h2>
        <Card>
          <div className="divide-y divide-gray-200">
            {teamMembers.map((member) => (
              <div key={member.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-4">
                  <Avatar name={member.name} />
                  <div>
                    <p className="font-medium text-gray-900">{member.name}</p>
                    <p className="text-sm text-gray-500">{member.role}</p>
                  </div>
                </div>
                <Badge variant="secondary" size="sm">
                  Member
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
