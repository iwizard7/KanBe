import { useState, useEffect } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X, Plus } from "lucide-react";

import { TAG_COLORS, PRIORITY_LEVELS, type Task, type Subtask, type PriorityLevel } from "@shared/schema";

interface EditTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateTask: (data: { id: string; title: string; description: string; tags: string[]; subtasks?: Subtask[]; priority?: PriorityLevel }) => void;
  task: Task | null;
}

export function EditTaskDialog({
  open,
  onOpenChange,
  onUpdateTask,
  task
}: EditTaskDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [selectedColor, setSelectedColor] = useState<string>(TAG_COLORS[0].name);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [subtaskInput, setSubtaskInput] = useState("");
  const [priority, setPriority] = useState<PriorityLevel>("medium");

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || "");
      setPriority((task.priority as PriorityLevel) || "medium");
      try {
        const parsedTags = typeof task.tags === 'string' ? JSON.parse(task.tags) : [];
        setSelectedTags(parsedTags || []);
      } catch {
        setSelectedTags([]);
      }
      try {
        const parsedSubtasks = typeof task.subtasks === 'string' ? JSON.parse(task.subtasks) : [];
        setSubtasks(parsedSubtasks || []);
      } catch {
        setSubtasks([]);
      }
    }
  }, [task]);

  const handleSubmit = () => {
    if (!title.trim() || !task) return;

    onUpdateTask({
      id: task.id,
      title: title.trim(),
      description: description.trim(),
      tags: selectedTags,
      subtasks,
      priority,
    });

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

    const newSubtask: Subtask = {
      id: crypto.randomUUID(),
      title: subtaskInput.trim(),
      completed: false,
      createdAt: Date.now(),
    };

    setSubtasks([...subtasks, newSubtask]);
    setSubtaskInput("");
  };

  const getTagColor = (colorName: string) => {
    return TAG_COLORS.find(c => c.name === colorName) || TAG_COLORS[0];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden" data-testid="dialog-edit-task">
        <DialogHeader>
          <DialogTitle>Редактировать задачу</DialogTitle>
          <DialogDescription>
            Внесите изменения в задачу
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-1">
            <TabsTrigger value="details">Детали</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="edit-title">Название *</Label>
            <Input
              id="edit-title"
              placeholder="Введите название задачи"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              data-testid="input-edit-task-title"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="edit-description">Описание</Label>
            <Textarea
              id="edit-description"
              placeholder="Добавьте описание задачи"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              data-testid="input-edit-task-description"
            />
          </div>

          {/* Subtasks */}
          <div className="space-y-2">
            <Label>Подзадачи</Label>

            {/* Subtask List */}
            {subtasks.length > 0 && (
              <div className="space-y-1 mb-2">
                {subtasks.map((subtask, index) => (
                  <div key={subtask.id} className="flex items-center gap-2 p-2 bg-muted rounded">
                    <Checkbox
                      checked={subtask.completed}
                      onCheckedChange={(checked) => {
                        const updatedSubtasks = subtasks.map(s =>
                          s.id === subtask.id ? { ...s, completed: checked as boolean } : s
                        );
                        setSubtasks(updatedSubtasks);
                      }}
                      data-testid={`checkbox-subtask-${index}`}
                    />
                    <span className={`text-sm flex-1 ${subtask.completed ? 'line-through text-muted-foreground' : ''}`}>
                      {subtask.title}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => setSubtasks(subtasks.filter(s => s.id !== subtask.id))}
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
                data-testid="input-edit-subtask"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={handleAddSubtask}
                disabled={!subtaskInput.trim() || subtasks.length >= 10}
                data-testid="button-edit-add-subtask"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Максимум 10 подзадач
            </p>
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label>Приоритет</Label>
            <div className="flex gap-2">
              {PRIORITY_LEVELS.map((level) => (
                <Button
                  key={level.name}
                  type="button"
                  variant={priority === level.name ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPriority(level.name)}
                  className={`flex items-center gap-1 ${priority === level.name ? `${level.bg} ${level.color}` : ''}`}
                  data-testid={`button-edit-priority-${level.name}`}
                >
                  <div className={`w-2 h-2 rounded-full ${level.bg}`} />
                  {level.label}
                </Button>
              ))}
            </div>
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
                      data-testid={`badge-edit-tag-${index}`}
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
                  data-testid={`button-edit-color-${color.name}`}
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
                data-testid="input-edit-tag-name"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={handleAddTag}
                disabled={!tagInput.trim() || selectedTags.length >= 10}
                data-testid="button-edit-add-tag"
              >
                Добавить
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Максимум 10 меток на задачу
            </p>
          </div>
          </TabsContent>


        </Tabs>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel-edit"
          >
            Отмена
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!title.trim()}
            data-testid="button-submit-edit"
          >
            Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
