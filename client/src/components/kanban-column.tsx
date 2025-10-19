import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { VirtualizedTaskList } from "./virtualized-task-list";
import type { Task } from "@shared/schema";
import { PRIORITY_LEVELS } from "@shared/schema";

interface KanbanColumnProps {
  title: string;
  status: string;
  tasks: Task[];
  allTasks?: Task[];
  accentColor: string;
  onCreateTask: (status: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onDrop: (taskId: string, newStatus: string) => void;
}

export const KanbanColumn = React.memo<KanbanColumnProps>(function KanbanColumn({
  title,
  status,
  tasks,
  allTasks = [],
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

  // Count tasks by priority
  const priorityCounts = tasks.reduce((acc, task) => {
    const priority = task.priority || 'medium';
    acc[priority] = (acc[priority] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

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

      {/* Priority Summary */}
      {tasks.length > 0 && (
        <div className="flex items-center gap-1 mb-3 flex-wrap">
          {PRIORITY_LEVELS.map((priority) => {
            const count = priorityCounts[priority.name] || 0;
            if (count === 0) return null;
            return (
              <Badge
                key={priority.name}
                variant="outline"
                className={`text-xs px-2 py-0.5 ${priority.bg} border-current`}
                data-testid={`badge-priority-${priority.name}-${status}`}
              >
                <div className={`w-1.5 h-1.5 rounded-full mr-1 ${priority.bg}`} />
                {priority.label}: {count}
              </Badge>
            );
          })}
        </div>
      )}

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
          <VirtualizedTaskList
            tasks={tasks}
            allTasks={allTasks}
            onEdit={onEditTask}
            onDelete={onDeleteTask}
            height={400}
          />
        )}
      </div>
    </div>
  );
});
