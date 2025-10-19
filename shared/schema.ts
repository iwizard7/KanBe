// Reference: javascript_log_in_with_replit and javascript_database blueprints
import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
import {
  index,
  integer,
  text,
  sqliteTable,
  real,
} from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table
export const sessions = sqliteTable(
  "sessions",
  {
    sid: text("sid").primaryKey(),
    sess: text("sess").notNull(),
    expire: real("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table
export const users = sqliteTable("users", {
  id: text("id").primaryKey().default(sql`(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))))`),
  email: text("email").unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  profileImageUrl: text("profile_image_url"),
  password: text("password"), // for local auth
  timezone: text("timezone").default('UTC'), // user timezone
  status: text("status").default('active'), // 'active', 'away', 'busy', 'offline'
  bio: text("bio"), // user bio/description
  notificationsEnabled: integer("notifications_enabled").default(1), // 1 = enabled, 0 = disabled
  emailNotifications: integer("email_notifications").default(1), // email notifications enabled
  createdAt: real("created_at").default(sql`(strftime('%s', 'now'))`),
  updatedAt: real("updated_at").default(sql`(strftime('%s', 'now'))`),
});

// Tasks table for kanban board
export const tasks = sqliteTable("tasks", {
  id: text("id").primaryKey().default(sql`(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))))`),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text("title").notNull(),
  description: text("description").default(''),
  status: text("status").notNull().default('todo'), // 'todo', 'in-progress', 'done'
  position: integer("position").notNull().default(0), // for ordering within column
  tags: text("tags").default('[]'), // JSON string for array
  priority: text("priority").default('medium'), // 'low', 'medium', 'high', 'urgent'
  dueDate: real("due_date"), // Unix timestamp for deadline
  subtasks: text("subtasks").default('[]'), // JSON array of subtasks
  timeEstimate: integer("time_estimate"), // estimated time in minutes
  timeSpent: integer("time_spent").default(0), // actual time spent in minutes
  dependencies: text("dependencies").default('[]'), // JSON array of task IDs this task depends on
  lastMovedAt: real("last_moved_at"), // Unix timestamp of last status change
  createdAt: real("created_at").default(sql`(strftime('%s', 'now'))`).notNull(),
  updatedAt: real("updated_at").default(sql`(strftime('%s', 'now'))`).notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  tasks: many(tasks),
}));

// Zod schemas for validation
export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  tags: z.string().default('[]'), // Override to expect string (JSON)
});

export const updateTaskSchema = insertTaskSchema.partial().extend({
  id: z.string(),
});

// Types
export type User = typeof users.$inferSelect;
export type UpsertUser = typeof users.$inferInsert;
export type Task = typeof tasks.$inferSelect & { commentCount?: number };
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type UpdateTask = z.infer<typeof updateTaskSchema>;

// Tag color options (matches design guidelines)
export const TAG_COLORS = [
  { name: 'red', label: 'Красный', bg: 'bg-[hsl(0,70%,60%)]', text: 'text-[hsl(0,70%,60%)]' },
  { name: 'orange', label: 'Оранжевый', bg: 'bg-[hsl(25,85%,60%)]', text: 'text-[hsl(25,85%,60%)]' },
  { name: 'yellow', label: 'Желтый', bg: 'bg-[hsl(45,90%,55%)]', text: 'text-[hsl(45,90%,55%)]' },
  { name: 'green', label: 'Зеленый', bg: 'bg-[hsl(145,65%,50%)]', text: 'text-[hsl(145,65%,50%)]' },
  { name: 'blue', label: 'Синий', bg: 'bg-[hsl(215,80%,60%)]', text: 'text-[hsl(215,80%,60%)]' },
  { name: 'purple', label: 'Фиолетовый', bg: 'bg-[hsl(270,70%,65%)]', text: 'text-[hsl(270,70%,65%)]' },
  { name: 'pink', label: 'Розовый', bg: 'bg-[hsl(330,75%,65%)]', text: 'text-[hsl(330,75%,65%)]' },
  { name: 'gray', label: 'Серый', bg: 'bg-[hsl(215,10%,50%)]', text: 'text-[hsl(215,10%,50%)]' },
] as const;

// Priority levels
export const PRIORITY_LEVELS = [
  { name: 'low', label: 'Низкий', color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900' },
  { name: 'medium', label: 'Средний', color: 'text-yellow-600', bg: 'bg-yellow-100 dark:bg-yellow-900' },
  { name: 'high', label: 'Высокий', color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900' },
  { name: 'urgent', label: 'Срочный', color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900' },
] as const;

export type TagColor = typeof TAG_COLORS[number]['name'];
export type PriorityLevel = typeof PRIORITY_LEVELS[number]['name'];

// Tags table for storing global tags
export const tags = sqliteTable("tags", {
  id: text("id").primaryKey().default(sql`(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))))`),
  name: text("name").notNull(),
  color: text("color").notNull(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: real("created_at").default(sql`(strftime('%s', 'now'))`).notNull(),
  updatedAt: real("updated_at").default(sql`(strftime('%s', 'now'))`).notNull(),
});

// Tags relations
export const tagsRelations = relations(tags, ({ one }) => ({
  user: one(users, {
    fields: [tags.userId],
    references: [users.id],
  }),
}));

// Zod schemas for tags
export const insertTagSchema = createInsertSchema(tags).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateTagSchema = insertTagSchema.partial().extend({
  id: z.string(),
});

// Comments table for task discussions
export const comments = sqliteTable("comments", {
  id: text("id").primaryKey().default(sql`(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))))`),
  taskId: text("task_id").notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text("content").notNull(),
  createdAt: real("created_at").default(sql`(strftime('%s', 'now'))`).notNull(),
  updatedAt: real("updated_at").default(sql`(strftime('%s', 'now'))`).notNull(),
});

// Comments relations
export const commentsRelations = relations(comments, ({ one }) => ({
  task: one(tasks, {
    fields: [comments.taskId],
    references: [tasks.id],
  }),
  user: one(users, {
    fields: [comments.userId],
    references: [users.id],
  }),
}));

// Update tasks relations to include comments
export const tasksRelations = relations(tasks, ({ one, many }) => ({
  user: one(users, {
    fields: [tasks.userId],
    references: [users.id],
  }),
  comments: many(comments),
}));

// Zod schemas for comments
export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateCommentSchema = insertCommentSchema.partial().extend({
  id: z.string(),
});

// Types
export type Tag = typeof tags.$inferSelect;
export type InsertTag = z.infer<typeof insertTagSchema>;
export type UpdateTag = z.infer<typeof updateTagSchema>;

export type Comment = typeof comments.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type UpdateComment = z.infer<typeof updateCommentSchema>;

// Subtask type
export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  createdAt: number;
}

// User status options
export const USER_STATUSES = [
  { name: 'active', label: 'Активен', color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900' },
  { name: 'away', label: 'Отошел', color: 'text-yellow-600', bg: 'bg-yellow-100 dark:bg-yellow-900' },
  { name: 'busy', label: 'Занят', color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900' },
  { name: 'offline', label: 'Не в сети', color: 'text-gray-600', bg: 'bg-gray-100 dark:bg-gray-900' },
] as const;

export type UserStatus = typeof USER_STATUSES[number]['name'];

// Time tracking entry type
export interface TimeEntry {
  id: string;
  taskId: string;
  userId: string;
  startTime: number;
  endTime?: number;
  duration: number; // in minutes
  description?: string;
  createdAt: number;
}
