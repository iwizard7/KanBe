import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { TaskCard } from "./task-card";
import type { Task } from "@shared/schema";

interface KanbanColumnProps {
  title: string;
  status: string;
  tasks: Task[];
  accentColor: string;
  onCreateTask: (status: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onDrop: (taskId: string, newStatus: string) => void;
}

export function KanbanColumn({
  title,
  status,
  tasks,
  accentColor,
  onCreateTask,
  onEditTask,
  onDeleteTask,
  onDrop,
}: KanbanColumnProps) {
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add('border-primary', 'border-2', 'border-dashed');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('border-primary', 'border-2', 'border-dashed');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove('border-primary', 'border-2', 'border-dashed');
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) {
      onDrop(taskId, status);
    }
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('taskId', taskId);
  };

  return (
    <div className="flex flex-col w-80 flex-shrink-0">
      {/* Column Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${accentColor}`} />
          <h2 className="text-lg font-semibold" data-testid={`text-column-title-${status}`}>
            {title}
          </h2>
          <Badge variant="secondary" className="text-xs" data-testid={`badge-task-count-${status}`}>
            {tasks.length}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onCreateTask(status)}
          data-testid={`button-add-task-${status}`}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Tasks Container */}
      <div
        className="flex-1 space-y-3 min-h-[200px] p-1 rounded-lg transition-all"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        data-testid={`column-${status}`}
      >
        {tasks.length === 0 ? (
          <Card className="p-8 text-center border-dashed">
            <p className="text-sm text-muted-foreground" data-testid={`text-empty-${status}`}>
              Нет задач
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={() => onCreateTask(status)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Добавить задачу
            </Button>
          </Card>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              draggable
              onDragStart={(e) => handleDragStart(e, task.id)}
            >
              <TaskCard
                task={task}
                onEdit={onEditTask}
                onDelete={onDeleteTask}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
