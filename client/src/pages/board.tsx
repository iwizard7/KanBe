import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Navbar } from "@/components/navbar";
import { KanbanColumn } from "@/components/kanban-column";
import { CreateTaskDialog } from "@/components/create-task-dialog";
import { EditTaskDialog } from "@/components/edit-task-dialog";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Task, PriorityLevel } from "@shared/schema";
import { Loader2 } from "lucide-react";

const COLUMNS = [
  { 
    status: 'todo', 
    title: 'К выполнению', 
    accentColor: 'bg-[hsl(200,75%,50%)]' 
  },
  { 
    status: 'in-progress', 
    title: 'В процессе', 
    accentColor: 'bg-[hsl(30,80%,55%)]' 
  },
  { 
    status: 'done', 
    title: 'Готово', 
    accentColor: 'bg-[hsl(145,65%,45%)]' 
  },
];

export default function Board() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [defaultStatus, setDefaultStatus] = useState<string>('todo');

  // Fetch tasks
  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ['/api/tasks'],
    enabled: !!user,
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (data: {
      title: string;
      description: string;
      tags: string[];
      priority?: PriorityLevel;
      dueDate?: Date;
      subtasks?: string[];
      status?: string;
      timeEstimate?: number;
      dependencies?: string[];
    }) => {
      return await apiRequest('POST', '/api/tasks', {
        ...data,
        tags: JSON.stringify(data.tags),
        subtasks: data.subtasks ? JSON.stringify(data.subtasks.map(title => ({
          id: crypto.randomUUID(),
          title,
          completed: false,
          createdAt: Date.now()
        }))) : undefined,
        dueDate: data.dueDate ? Math.floor(data.dueDate.getTime() / 1000) : undefined,
        dependencies: data.dependencies ? JSON.stringify(data.dependencies) : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      toast({
        title: "Задача создана",
        description: "Новая задача успешно добавлена на доску",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Не авторизован",
          description: "Вы вышли из системы. Вход снова...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
        return;
      }
      toast({
        title: "Ошибка",
        description: "Не удалось создать задачу. Попробуйте снова.",
        variant: "destructive",
      });
    },
  });

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: async (data: { id: string; title?: string; description?: string; tags?: string[]; subtasks?: any[]; priority?: PriorityLevel; dueDate?: Date; dependencies?: string[] }) => {
      const { id, ...updateData } = data;
      return await apiRequest('PATCH', `/api/tasks/${id}`, {
        ...updateData,
        tags: updateData.tags ? JSON.stringify(updateData.tags) : undefined,
        subtasks: updateData.subtasks ? JSON.stringify(updateData.subtasks) : undefined,
        dueDate: updateData.dueDate ? Math.floor(updateData.dueDate.getTime() / 1000) : undefined,
        dependencies: updateData.dependencies ? JSON.stringify(updateData.dependencies) : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      toast({
        title: "Задача обновлена",
        description: "Изменения сохранены",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Не авторизован",
          description: "Вы вышли из системы. Вход снова...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
        return;
      }
      toast({
        title: "Ошибка",
        description: "Не удалось обновить задачу. Попробуйте снова.",
        variant: "destructive",
      });
    },
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      return await apiRequest('DELETE', `/api/tasks/${taskId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      toast({
        title: "Задача удалена",
        description: "Задача успешно удалена с доски",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Не авторизован",
          description: "Вы вышли из системы. Вход снова...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
        return;
      }
      toast({
        title: "Ошибка",
        description: "Не удалось удалить задачу. Попробуйте снова.",
        variant: "destructive",
      });
    },
  });

  // Move task mutation (for drag & drop)
  const moveTaskMutation = useMutation({
    mutationFn: async ({ taskId, status, position }: { taskId: string; status: string; position: number }) => {
      return await apiRequest('PATCH', `/api/tasks/${taskId}/position`, { status, position });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Не авторизован",
          description: "Вы вышли из системы. Вход снова...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
        return;
      }
      toast({
        title: "Ошибка",
        description: "Не удалось переместить задачу. Попробуйте снова.",
        variant: "destructive",
      });
    },
  });

  // Group tasks by status
  const tasksByStatus = COLUMNS.reduce((acc, column) => {
    acc[column.status] = tasks
      .filter(task => task.status === column.status)
      .sort((a, b) => a.position - b.position);
    return acc;
  }, {} as Record<string, Task[]>);

  const handleCreateTask = (status: string) => {
    setDefaultStatus(status);
    setCreateDialogOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setSelectedTask(task);
    setEditDialogOpen(true);
  };

  const handleDeleteTask = (taskId: string) => {
    deleteTaskMutation.mutate(taskId);
  };

  const handleDrop = (taskId: string, newStatus: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // Only allow cross-column moves for MVP (simpler implementation)
    if (task.status === newStatus) return;

    // Get tasks in target column and calculate position
    const tasksInTargetColumn = tasksByStatus[newStatus] || [];
    const newPosition = tasksInTargetColumn.length;

    moveTaskMutation.mutate({ taskId, status: newStatus, position: newPosition });
  };

  const createTask = (data: {
    title: string;
    description: string;
    tags: string[];
    priority?: PriorityLevel;
    dueDate?: Date;
    subtasks?: string[];
    status?: string;
    timeEstimate?: number;
    dependencies?: string[];
  }) => {
    createTaskMutation.mutate({
      ...data,
      status: data.status || defaultStatus,
    });
  };

  const updateTask = (data: { id: string; title: string; description: string; tags: string[]; subtasks?: any[]; priority?: PriorityLevel }) => {
    updateTaskMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar user={user} />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold mb-2">Моя Доска</h1>
          <p className="text-muted-foreground">
            Управляйте своими задачами и отслеживайте прогресс
          </p>
        </div>

        {/* Kanban Board */}
        <div className="flex gap-6 overflow-x-auto pb-4">
          {COLUMNS.map((column) => (
            <KanbanColumn
              key={column.status}
              title={column.title}
              status={column.status}
              tasks={tasksByStatus[column.status] || []}
              allTasks={tasks}
              accentColor={column.accentColor}
              onCreateTask={handleCreateTask}
              onEditTask={handleEditTask}
              onDeleteTask={handleDeleteTask}
              onDrop={handleDrop}
            />
          ))}
        </div>
      </div>

      {/* Dialogs */}
      <CreateTaskDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreateTask={createTask}
        defaultStatus={defaultStatus}
      />

      <EditTaskDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onUpdateTask={updateTask}
        task={selectedTask}
      />
    </div>
  );
}
