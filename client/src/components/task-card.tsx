import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, GripVertical, CheckSquare, Clock, AlertTriangle } from "lucide-react";
import type { Task, Subtask } from "@shared/schema";
import { TAG_COLORS, PRIORITY_LEVELS } from "@shared/schema";
import { formatDistanceToNow, isAfter, isBefore, addDays } from "date-fns";
import { ru } from "date-fns/locale";

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  isDragging?: boolean;
}

export function TaskCard({ task, onEdit, onDelete, isDragging }: TaskCardProps) {
  // Parse tags from JSON string to array
  const tagsArray = task.tags ? JSON.parse(task.tags) : [];
  const visibleTags = tagsArray.slice(0, 3);
  const remainingCount = tagsArray.length - 3;

  // Parse subtasks from JSON string to array
  const subtasks: Subtask[] = task.subtasks ? JSON.parse(task.subtasks) : [];
  const completedSubtasks = subtasks.filter(subtask => subtask.completed).length;
  const totalSubtasks = subtasks.length;

  // Priority and deadline logic
  const priority = PRIORITY_LEVELS.find(p => p.name === task.priority) || PRIORITY_LEVELS[0];
  const dueDate = task.dueDate ? new Date(task.dueDate * 1000) : null;
  const now = new Date();
  const isOverdue = dueDate && isBefore(dueDate, now);
  const isDueSoon = dueDate && !isOverdue && isBefore(dueDate, addDays(now, 1));

  const getTagColor = (tagName: string) => {
    // Extract color from tag format "colorName:labelText" or just "labelText"
    const parts = tagName.split(':');
    const colorName = parts.length > 1 ? parts[0] : 'gray';
    const label = parts.length > 1 ? parts[1] : tagName;
    const color = TAG_COLORS.find(c => c.name === colorName) || TAG_COLORS[7]; // default to gray
    return { ...color, label };
  };

  return (
    <Card
      className={`p-4 space-y-3 hover-elevate active-elevate-2 transition-all cursor-pointer group border-l-4 ${
        isDragging ? 'opacity-50 scale-105' : ''
      } ${priority.bg.replace('bg-', 'border-l-')}`}
      data-testid={`card-task-${task.id}`}
    >
      {/* Header with drag handle, priority, and actions */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <GripVertical className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${priority.bg}`} title={priority.label} />
          <h3 className="font-medium line-clamp-2 flex-1" data-testid={`text-task-title-${task.id}`}>
            {task.title}
          </h3>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(task);
            }}
            data-testid={`button-edit-task-${task.id}`}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(task.id);
            }}
            data-testid={`button-delete-task-${task.id}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Description */}
      {task.description && (
        <p className="text-sm text-muted-foreground line-clamp-3" data-testid={`text-task-description-${task.id}`}>
          {task.description}
        </p>
      )}

      {/* Priority Badge */}
      <div className="flex items-center gap-2">
        <Badge
          variant="outline"
          className={`text-xs px-2 py-0.5 ${priority.bg} border-current`}
          data-testid={`badge-priority-${task.id}`}
        >
          <div className={`w-1.5 h-1.5 rounded-full mr-1 ${priority.bg}`} />
          {priority.label}
        </Badge>
      </div>

      {/* Subtasks */}
      {totalSubtasks > 0 && (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckSquare className="w-4 h-4" />
            <span>
              {completedSubtasks}/{totalSubtasks} подзадач
            </span>
          </div>
          <div className="space-y-1 ml-6">
            {subtasks.slice(0, 3).map((subtask, index) => (
              <div key={subtask.id} className="flex items-center gap-2 text-xs">
                <div className={`w-3 h-3 rounded-full border flex items-center justify-center ${
                  subtask.completed ? 'bg-green-500 border-green-500' : 'border-muted-foreground'
                }`}>
                  {subtask.completed && (
                    <div className="w-1.5 h-1.5 bg-white rounded-full" />
                  )}
                </div>
                <span className={`truncate ${subtask.completed ? 'line-through text-muted-foreground' : ''}`}>
                  {subtask.title}
                </span>
              </div>
            ))}
            {totalSubtasks > 3 && (
              <div className="text-xs text-muted-foreground">
                +{totalSubtasks - 3} ещё...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {visibleTags.map((tag: string, index: number) => {
            const { bg, label } = getTagColor(tag);
            return (
              <Badge
                key={index}
                variant="secondary"
                className={`${bg} bg-opacity-20 text-xs px-2 py-0.5`}
                data-testid={`badge-tag-${index}-${task.id}`}
              >
                {label}
              </Badge>
            );
          })}
          {remainingCount > 0 && (
            <Badge variant="secondary" className="text-xs px-2 py-0.5">
              +{remainingCount}
            </Badge>
          )}
        </div>
      )}

      {/* Footer with deadline and timestamp */}
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
        <div className="flex items-center gap-2">
          {dueDate && (
            <div className={`flex items-center gap-1 ${
              isOverdue ? 'text-red-600' : isDueSoon ? 'text-orange-600' : 'text-muted-foreground'
            }`}>
              {isOverdue ? (
                <AlertTriangle className="w-3 h-3" />
              ) : (
                <Clock className="w-3 h-3" />
              )}
              <span>
                {isOverdue ? 'Просрочено' : isDueSoon ? 'Скоро дедлайн' : 'Дедлайн'} {formatDistanceToNow(dueDate, {
                  addSuffix: true,
                  locale: ru
                })}
              </span>
            </div>
          )}
        </div>
        <span data-testid={`text-task-date-${task.id}`}>
          {formatDistanceToNow(new Date(task.createdAt * 1000), {
            addSuffix: true,
            locale: ru
          })}
        </span>
      </div>
    </Card>
  );
}
