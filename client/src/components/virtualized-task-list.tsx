import React from "react";
import { List } from "react-window";
import { TaskCard } from "./task-card";
import type { Task } from "@shared/schema";

interface VirtualizedTaskListProps {
  tasks: Task[];
  allTasks?: Task[];
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onDragStart?: (e: React.DragEvent, taskId: string) => void;
  height?: number;
  itemSize?: number;
}

export const VirtualizedTaskList = React.memo<VirtualizedTaskListProps>(
  function VirtualizedTaskList({
    tasks,
    allTasks = [],
    onEdit,
    onDelete,
    onDragStart,
    height = 400,
    itemSize = 180, // Approximate height of a task card
  }) {
    // If there are few tasks, don't use virtualization
    if (tasks.length <= 10) {
      return (
        <div className="space-y-3">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              allTasks={allTasks}
              onEdit={onEdit}
              onDelete={onDelete}
              onDragStart={onDragStart}
            />
          ))}
        </div>
      );
    }

    return (
      <List
        height={height}
        itemCount={tasks.length}
        itemSize={itemSize}
        className="scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent"
      >
        {/* @ts-ignore */}
        {({ index, style }: any) => {
          const task = tasks[index];
          return (
            <div style={style} className="pr-1">
              <TaskCard
                task={task}
                allTasks={allTasks}
                onEdit={onEdit}
                onDelete={onDelete}
                onDragStart={onDragStart}
              />
            </div>
          );
        }}
      </List>
    );
  }
);
