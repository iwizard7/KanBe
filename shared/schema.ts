// Reference: javascript_log_in_with_replit and javascript_database blueprints
import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (mandatory for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (mandatory for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tasks table for kanban board
export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text("title").notNull(),
  description: text("description").default(''),
  status: varchar("status", { length: 50 }).notNull().default('todo'), // 'todo', 'in-progress', 'done'
  position: integer("position").notNull().default(0), // for ordering within column
  tags: text("tags").array().default(sql`ARRAY[]::text[]`), // array of tag names with colors
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  tasks: many(tasks),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  user: one(users, {
    fields: [tasks.userId],
    references: [users.id],
  }),
}));

// Zod schemas for validation
export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateTaskSchema = insertTaskSchema.partial().extend({
  id: z.string(),
});

// Types
export type User = typeof users.$inferSelect;
export type UpsertUser = typeof users.$inferInsert;
export type Task = typeof tasks.$inferSelect;
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

export type TagColor = typeof TAG_COLORS[number]['name'];
