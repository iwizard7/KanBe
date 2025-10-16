import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, X, Plus } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { TAG_COLORS, PRIORITY_LEVELS, type PriorityLevel } from "@shared/schema";

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateTask: (data: {
    title: string;
    description: string;
    tags: string[];
    priority?: PriorityLevel;
    dueDate?: Date;
    subtasks?: string[];
    status?: string;
    timeEstimate?: number;
    dependencies?: string[];
  }) => void;
  defaultStatus?: string;
}

export function CreateTaskDialog({
  open,
  onOpenChange,
  onCreateTask,
  defaultStatus
}: CreateTaskDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [selectedColor, setSelectedColor] = useState<string>(TAG_COLORS[0].name);
  const [priority, setPriority] = useState<PriorityLevel>("medium");
  const [dueDate, setDueDate] = useState<Date>();
  const [subtasks, setSubtasks] = useState<string[]>([]);
  const [subtaskInput, setSubtaskInput] = useState("");
  const [timeEstimate, setTimeEstimate] = useState<number>(0);
  const [dependencies, setDependencies] = useState<string[]>([]);

  const handleSubmit = () => {
    if (!title.trim()) return;

    onCreateTask({
      title: title.trim(),
      description: description.trim(),
      tags: selectedTags,
      priority,
      dueDate,
      subtasks,
      status: defaultStatus,
      timeEstimate,
      dependencies,
    });

    // Reset form
    setTitle("");
    setDescription("");
    setSelectedTags([]);
    setTagInput("");
    setSelectedColor(TAG_COLORS[0].name);
    setPriority("medium");
    setDueDate(undefined);
    setSubtasks([]);
    setSubtaskInput("");
    onOpenChange(false);
  };

  const handleAddTag = () => {
    if (!tagInput.trim() || selectedTags.length >= 10) return;
    
    const tagValue = `${selectedColor}:${tagInput.trim()}`;
    if (!selectedTags.includes(tagValue)) {
      setSelectedTags([...selectedTags, tagValue]);
    }
    setTagInput("");
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setSelectedTags(selectedTags.filter(tag => tag !== tagToRemove));
  };

  const handleAddSubtask = () => {
    if (!subtaskInput.trim() || subtasks.length >= 10) return;

    if (!subtasks.includes(subtaskInput.trim())) {
      setSubtasks([...subtasks, subtaskInput.trim()]);
    }
    setSubtaskInput("");
  };

  const getTagColor = (colorName: string) => {
    return TAG_COLORS.find(c => c.name === colorName) || TAG_COLORS[0];
  };

  const statusNames: Record<string, string> = {
    'todo': 'К выполнению',
    'in-progress': 'В процессе',
    'done': 'Готово',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" data-testid="dialog-create-task">
        <DialogHeader>
          <DialogTitle>Создать задачу</DialogTitle>
          <DialogDescription>
            {defaultStatus && `Задача будет добавлена в колонку "${statusNames[defaultStatus] || defaultStatus}"`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Название *</Label>
            <Input
              id="title"
              placeholder="Введите название задачи"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              data-testid="input-task-title"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Описание</Label>
            <Textarea
              id="description"
              placeholder="Добавьте описание задачи"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              data-testid="input-task-description"
            />
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label>Приоритет</Label>
            <Select value={priority} onValueChange={(value: PriorityLevel) => setPriority(value)}>
              <SelectTrigger data-testid="select-priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITY_LEVELS.map((level) => (
                  <SelectItem key={level.name} value={level.name} data-testid={`priority-${level.name}`}>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${level.bg}`} />
                      {level.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Time Estimate */}
          <div className="space-y-2">
            <Label htmlFor="timeEstimate">Оценка времени (минуты)</Label>
            <Input
              id="timeEstimate"
              type="number"
              placeholder="0"
              value={timeEstimate || ''}
              onChange={(e) => setTimeEstimate(parseInt(e.target.value) || 0)}
              min="0"
              data-testid="input-time-estimate"
            />
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label>Дедлайн</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dueDate && "text-muted-foreground"
                  )}
                  data-testid="button-due-date"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, "PPP") : "Выберите дату"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={setDueDate}
                  initialFocus
                  data-testid="calendar-due-date"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Subtasks */}
          <div className="space-y-2">
            <Label>Подзадачи</Label>

            {/* Subtask List */}
            {subtasks.length > 0 && (
              <div className="space-y-1 mb-2">
                {subtasks.map((subtask, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded">
                    <span className="text-sm flex-1">{subtask}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => setSubtasks(subtasks.filter((_, i) => i !== index))}
                      data-testid={`button-remove-subtask-${index}`}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Subtask */}
            <div className="flex gap-2">
              <Input
                placeholder="Название подзадачи"
                value={subtaskInput}
                onChange={(e) => setSubtaskInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSubtask();
                  }
                }}
                disabled={subtasks.length >= 10}
                data-testid="input-subtask"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={handleAddSubtask}
                disabled={!subtaskInput.trim() || subtasks.length >= 10}
                data-testid="button-add-subtask"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Максимум 10 подзадач
            </p>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Метки</Label>

            {/* Selected Tags */}
            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {selectedTags.map((tag, index) => {
                  const [colorName, label] = tag.split(':');
                  const color = getTagColor(colorName);
                  return (
                    <Badge
                      key={index}
                      variant="secondary"
                      className={`${color.bg} bg-opacity-20 pr-1`}
                      data-testid={`badge-selected-tag-${index}`}
                    >
                      {label}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 ml-1 hover:bg-transparent"
                        onClick={() => handleRemoveTag(tag)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  );
                })}
              </div>
            )}

            {/* Color Picker */}
            <div className="flex gap-2 mb-2">
              {TAG_COLORS.map((color) => (
                <button
                  key={color.name}
                  type="button"
                  className={`w-8 h-8 rounded-full ${color.bg} border-2 transition-all ${
                    selectedColor === color.name
                      ? 'border-foreground scale-110'
                      : 'border-transparent hover:scale-105'
                  }`}
                  onClick={() => setSelectedColor(color.name)}
                  title={color.label}
                  data-testid={`button-color-${color.name}`}
                />
              ))}
            </div>

            {/* Tag Input */}
            <div className="flex gap-2">
              <Input
                placeholder="Название метки"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                disabled={selectedTags.length >= 10}
                data-testid="input-tag-name"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={handleAddTag}
                disabled={!tagInput.trim() || selectedTags.length >= 10}
                data-testid="button-add-tag"
              >
                Добавить
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Максимум 10 меток на задачу
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel-create"
          >
            Отмена
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!title.trim()}
            data-testid="button-submit-create"
          >
            Создать
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
