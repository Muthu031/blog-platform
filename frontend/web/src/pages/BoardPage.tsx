import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { Plus, Search } from 'lucide-react';
import { Button, Badge, Avatar, Input, Modal, Card } from '@components/ui';
import { cn } from '@utils';
import { apiClient, ApiClient } from '@services/api';
import { useNotificationStore } from '@store';

type BoardColumn = {
  id: string;
  name: string;
  position: number;
  tasks: Array<any>;
};

export function BoardPage() {
  const queryClient = useQueryClient();
  const { projectId, orgSlug } = useParams();

  const [searchQuery, setSearchQuery] = React.useState('');
  const [columns, setColumns] = React.useState<BoardColumn[]>([]);
  const [activeColumnId, setActiveColumnId] = React.useState<string | null>(null);
  const [showNewTaskModal, setShowNewTaskModal] = React.useState(false);
  const [newTaskTitle, setNewTaskTitle] = React.useState('');
  const [newTaskDescription, setNewTaskDescription] = React.useState('');

  const { data: project } = useQuery({
    queryKey: ['project', orgSlug, projectId],
    queryFn: () => apiClient.getProject(orgSlug as string, projectId as string),
    enabled: Boolean(orgSlug && projectId),
  });

  const {
    data: boards = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['boards', orgSlug, projectId],
    queryFn: () => apiClient.getBoards(orgSlug as string, projectId as string),
    enabled: Boolean(orgSlug && projectId),
  });

  const activeBoard = boards[0];

  React.useEffect(() => {
    const cols = (activeBoard?.columns || [])
      .slice()
      .sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0))
      .map((c: any) => ({
        ...c,
        tasks: (c.tasks || []).slice().sort((t1: any, t2: any) => (t1.position ?? 0) - (t2.position ?? 0)),
      }));
    setColumns(cols);
  }, [activeBoard?.id]);

  const createBoard = useMutation({
    mutationFn: () => apiClient.createBoard(orgSlug as string, projectId as string, { name: 'Main Board' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards', orgSlug, projectId] });
      useNotificationStore.getState().addNotification('Board created', 'success');
    },
    onError: (err) => {
      const apiErr = ApiClient.handleError(err as unknown);
      useNotificationStore.getState().addNotification(apiErr.message || 'Failed to create board', 'error');
    },
  });

  const createTask = useMutation({
    mutationFn: (data: { columnId: string; title: string; description?: string }) =>
      apiClient.createTask(orgSlug as string, projectId as string, data.columnId, {
        title: data.title,
        description: data.description,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards', orgSlug, projectId] });
      useNotificationStore.getState().addNotification('Task created', 'success');
      setShowNewTaskModal(false);
      setNewTaskTitle('');
      setNewTaskDescription('');
      setActiveColumnId(null);
    },
    onError: (err) => {
      const apiErr = ApiClient.handleError(err as unknown);
      useNotificationStore.getState().addNotification(apiErr.message || 'Failed to create task', 'error');
    },
  });

  const moveTask = useMutation({
    mutationFn: (data: { taskId: string; columnId: string; position: number }) =>
      apiClient.moveTask(orgSlug as string, projectId as string, data.taskId, data.columnId, data.position),
    onError: (err) => {
      const apiErr = ApiClient.handleError(err as unknown);
      useNotificationStore.getState().addNotification(apiErr.message || 'Failed to move task', 'warning');
      queryClient.invalidateQueries({ queryKey: ['boards', orgSlug, projectId] });
    },
  });

  const filteredColumns = columns.map((col) => ({
    ...col,
    tasks: (col.tasks || []).filter((t: any) =>
      searchQuery ? String(t.title || '').toLowerCase().includes(searchQuery.toLowerCase()) : true
    ),
  }));

  const handleDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;

    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    setColumns((prev) => {
      const next = prev.map((c) => ({ ...c, tasks: [...(c.tasks || [])] }));
      const sourceCol = next.find((c) => c.id === source.droppableId);
      const destCol = next.find((c) => c.id === destination.droppableId);
      if (!sourceCol || !destCol) return prev;

      const [moved] = sourceCol.tasks.splice(source.index, 1);
      destCol.tasks.splice(destination.index, 0, moved);

      // Optimistic move request. Backend persists columnId + position.
      moveTask.mutate({ taskId: draggableId, columnId: destination.droppableId, position: destination.index });

      return next;
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

  if (isLoading) {
    return <Card className="p-6 text-gray-500">Loading board...</Card>;
  }

  if (isError) {
    return <Card className="p-6 text-gray-500">Failed to load board.</Card>;
  }

  if (!activeBoard) {
    return (
      <Card className="p-8 space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">No boards yet</h1>
          <p className="text-gray-600 mt-1">Create a board to start tracking tasks.</p>
        </div>
        <Button variant="primary" onClick={() => createBoard.mutate()} loading={createBoard.isPending}>
          Create board
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6 h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Board</h1>
          <p className="text-gray-600 mt-1">{project?.name || 'Project board'}</p>
        </div>
      </div>

      <Input
        placeholder="Search tasks..."
        icon={<Search size={18} />}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="max-w-xs"
      />

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-6 overflow-x-auto pb-4">
          {filteredColumns.map((column) => (
            <div key={column.id} className="flex-shrink-0 w-96">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-gray-900">{column.name}</h2>
                  <Badge variant="secondary" size="sm">
                    {column.tasks.length}
                  </Badge>
                </div>
                <button
                  onClick={() => {
                    setActiveColumnId(column.id);
                    setShowNewTaskModal(true);
                  }}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                  aria-label="Create task"
                >
                  <Plus size={18} className="text-gray-600" />
                </button>
              </div>

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
                    {column.tasks.map((task: any, index: number) => (
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
                            <p className="text-xs font-semibold text-gray-500 mb-1">
                              {project?.key ? `${project.key}-${task.taskNumber}` : task.taskNumber}
                            </p>
                            <p className="text-sm font-medium text-gray-900 mb-3">{task.title}</p>

                            <div className="flex items-center justify-between gap-2">
                              <Badge size="sm" className={getPriorityColor(task.priority)}>
                                {task.priority}
                              </Badge>
                              {task.assignee?.name && <Avatar name={task.assignee.name} size="sm" />}
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

      <Modal
        isOpen={showNewTaskModal}
        onClose={() => setShowNewTaskModal(false)}
        title="Create new task"
        description="Add a new task to the board"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Title"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={newTaskDescription}
              onChange={(e) => setNewTaskDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowNewTaskModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={createTask.isPending}
              onClick={() => {
                if (!activeColumnId) return;
                if (!newTaskTitle.trim()) {
                  useNotificationStore.getState().addNotification('Title is required', 'invalid');
                  return;
                }
                createTask.mutate({
                  columnId: activeColumnId,
                  title: newTaskTitle.trim(),
                  description: newTaskDescription.trim() || undefined,
                });
              }}
            >
              Create
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

