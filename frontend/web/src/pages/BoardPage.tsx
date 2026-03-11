import React from 'react';
import { useParams } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { Plus, Filter, Search } from 'lucide-react';
import { Button, Card, Badge, Avatar, Input, Modal, Spinner } from '@components/ui';
import { cn } from '@utils';

interface Task {
  id: string;
  title: string;
  key: string;
  priority: string;
  assignee?: string;
  dueDate?: string;
}

interface Column {
  id: string;
  name: string;
  type: string;
  tasks: Task[];
}

const COLUMNS: Column[] = [
  {
    id: 'todo',
    name: 'To Do',
    type: 'todo',
    tasks: [
      { id: '1', title: 'Design new homepage layout', key: 'WR-1', priority: 'high', assignee: 'Sarah' },
      { id: '2', title: 'Create brand guidelines document', key: 'WR-2', priority: 'medium' },
    ],
  },
  {
    id: 'in-progress',
    name: 'In Progress',
    type: 'in-progress',
    tasks: [
      { id: '3', title: 'Implement responsive design', key: 'WR-3', priority: 'high', assignee: 'Mike' },
      { id: '4', title: 'Setup analytics tracking', key: 'WR-4', priority: 'low', assignee: 'Jane' },
    ],
  },
  {
    id: 'done',
    name: 'Done',
    type: 'done',
    tasks: [
      { id: '5', title: 'Setup project repository', key: 'WR-5', priority: 'medium', assignee: 'Alex' },
    ],
  },
];

export function BoardPage() {
  const { projectId, orgSlug } = useParams();
  const [columns, setColumns] = React.useState(COLUMNS);
  const [showNewTaskModal, setShowNewTaskModal] = React.useState(false);
  const [selectedColumnForNewTask, setSelectedColumnForNewTask] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');

  const handleDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;

    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    setColumns((prevColumns) => {
      const newColumns = JSON.parse(JSON.stringify(prevColumns));
      const sourceColumn = newColumns.find((col: Column) => col.id === source.droppableId);
      const destColumn = newColumns.find((col: Column) => col.id === destination.droppableId);

      const [movedTask] = sourceColumn.tasks.splice(source.index, 1);
      destColumn.tasks.splice(destination.index, 0, movedTask);

      return newColumns;
    });
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      critical: 'bg-red-100 text-red-800',
      high: 'bg-orange-100 text-orange-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-green-100 text-green-800',
      none: 'bg-gray-100 text-gray-800',
    };
    return colors[priority] || colors.none;
  };

  return (
    <div className="space-y-6 h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Board</h1>
          <p className="text-gray-600 mt-1">Manage project tasks and track progress</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" icon={<Filter size={18} />}>
            Filter
          </Button>
        </div>
      </div>

      {/* Search */}
      <Input
        placeholder="Search tasks..."
        icon={<Search size={18} />}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="max-w-xs"
      />

      {/* Kanban Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-6 overflow-x-auto pb-4">
          {columns.map((column) => (
            <div key={column.id} className="flex-shrink-0 w-96">
              {/* Column Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-gray-900">{column.name}</h2>
                  <Badge variant="secondary" size="sm">
                    {column.tasks.length}
                  </Badge>
                </div>
                <button
                  onClick={() => {
                    setSelectedColumnForNewTask(column.id);
                    setShowNewTaskModal(true);
                  }}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                >
                  <Plus size={18} className="text-gray-600" />
                </button>
              </div>

              {/* Tasks */}
              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      'bg-gray-50 rounded-lg p-4 min-h-96 space-y-3 transition-colors',
                      snapshot.isDraggingOver && 'bg-blue-50'
                    )}
                  >
                    {column.tasks.map((task, index) => (
                      <Draggable key={task.id} draggableId={task.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={cn(
                              'bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-grab',
                              snapshot.isDragging && 'shadow-lg opacity-50'
                            )}
                          >
                            {/* Task Key and Title */}
                            <p className="text-xs font-semibold text-gray-500 mb-1">{task.key}</p>
                            <p className="text-sm font-medium text-gray-900 mb-3">{task.title}</p>

                            {/* Priority and Assignee */}
                            <div className="flex items-center justify-between gap-2">
                              <Badge size="sm" className={getPriorityColor(task.priority)}>
                                {task.priority}
                              </Badge>
                              {task.assignee && (
                                <Avatar name={task.assignee} size="sm" />
                              )}
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}

                    {column.tasks.length === 0 && (
                      <div className="text-center py-8 text-gray-400">
                        <p className="text-sm">No tasks yet</p>
                      </div>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>

      {/* New Task Modal */}
      <Modal
        isOpen={showNewTaskModal}
        onClose={() => setShowNewTaskModal(false)}
        title="Create New Task"
        description="Add a new task to the board"
        size="md"
      >
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Task title"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <textarea
            placeholder="Description (optional)"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
          />
          <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option>Select priority...</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </Modal>
    </div>
  );
}
