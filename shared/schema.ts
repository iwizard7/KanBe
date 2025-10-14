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
  createdAt: real("created_at").default(sql`(strftime('%s', 'now'))`).notNull(),
  updatedAt: real("updated_at").default(sql`(strftime('%s', 'now'))`).notNull(),
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
}).extend({
  tags: z.string().default('[]'), // Override to expect string (JSON)
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
