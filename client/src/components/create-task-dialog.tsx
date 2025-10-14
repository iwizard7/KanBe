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
import { X } from "lucide-react";
import { TAG_COLORS } from "@shared/schema";

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateTask: (data: { title: string; description: string; tags: string; status?: string }) => void;
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

  const handleSubmit = () => {
    if (!title.trim()) return;

    onCreateTask({
      title: title.trim(),
      description: description.trim(),
      tags: JSON.stringify(selectedTags),
      status: defaultStatus,
    });

    // Reset form
    setTitle("");
    setDescription("");
    setSelectedTags([]);
    setTagInput("");
    setSelectedColor(TAG_COLORS[0].name);
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
