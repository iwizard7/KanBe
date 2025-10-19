import {
  users,
  tasks,
  type User,
  type UpsertUser,
  type Task,
  type InsertTask,
  type UpdateTask,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: { email: string; password: string; firstName?: string; lastName?: string }): Promise<User>;
  upsertUser(user: { id: string; email: string; firstName?: string; lastName?: string; profileImageUrl?: string }): Promise<User>;

  // Task operations
  getTasks(userId: string): Promise<Task[]>;
  getTasksPaginated(userId: string, options: {
    offset: number;
    limit: number;
    status?: string;
    priority?: string;
    search?: string;
  }): Promise<Task[]>;
  getTasksCount(userId: string, filters?: {
    status?: string;
    priority?: string;
    search?: string;
  }): Promise<number>;
  getTask(id: string, userId: string): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(task: UpdateTask): Promise<Task>;
  deleteTask(id: string, userId: string): Promise<void>;
  updateTaskPosition(id: string, userId: string, status: string, position: number): Promise<Task>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: { email: string; password: string; firstName?: string; lastName?: string }): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        email: userData.email,
        password: userData.password,
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
      })
      .returning();
    return user;
  }

  async upsertUser(userData: { id: string; email: string; firstName?: string; lastName?: string; profileImageUrl?: string }): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        id: userData.id,
        email: userData.email,
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        profileImageUrl: userData.profileImageUrl || '',
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: userData.email,
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          profileImageUrl: userData.profileImageUrl || '',
          updatedAt: sql`(strftime('%s', 'now'))`,
        },
      })
      .returning();
    return user;
  }

  // Task operations
  async getTasks(userId: string): Promise<Task[]> {
    return await db
      .select()
      .from(tasks)
      .where(eq(tasks.userId, userId))
      .orderBy(tasks.status, tasks.position);
  }

  async getTasksPaginated(userId: string, options: {
    offset: number;
    limit: number;
    status?: string;
    priority?: string;
    search?: string;
  }): Promise<Task[]> {
    let whereConditions = [eq(tasks.userId, userId)];

    if (options.status) {
      whereConditions.push(eq(tasks.status, options.status));
    }

    if (options.priority) {
      whereConditions.push(eq(tasks.priority, options.priority));
    }

    if (options.search) {
      // Search in title and description
      whereConditions.push(sql`${tasks.title} LIKE ${`%${options.search}%`} OR ${tasks.description} LIKE ${`%${options.search}%`}`);
    }

    return await db
      .select()
      .from(tasks)
      .where(and(...whereConditions))
      .orderBy(tasks.status, tasks.position)
      .limit(options.limit)
      .offset(options.offset);
  }

  async getTasksCount(userId: string, filters?: {
    status?: string;
    priority?: string;
    search?: string;
  }): Promise<number> {
    let whereConditions = [eq(tasks.userId, userId)];

    if (filters?.status) {
      whereConditions.push(eq(tasks.status, filters.status));
    }

    if (filters?.priority) {
      whereConditions.push(eq(tasks.priority, filters.priority));
    }

    if (filters?.search) {
      // Search in title and description
      whereConditions.push(sql`${tasks.title} LIKE ${`%${filters.search}%`} OR ${tasks.description} LIKE ${`%${filters.search}%`}`);
    }

    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(tasks)
      .where(and(...whereConditions));

    return result[0]?.count || 0;
  }

  async getTask(id: string, userId: string): Promise<Task | undefined> {
    const [task] = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)));
    return task;
  }

  async createTask(taskData: InsertTask): Promise<Task> {
    // Get max position for the status column
    const existingTasks = await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, taskData.userId),
          eq(tasks.status, taskData.status || 'todo')
        )
      );
    
    const maxPosition = existingTasks.length > 0
      ? Math.max(...existingTasks.map(t => t.position))
      : -1;

    const [task] = await db
      .insert(tasks)
      .values({
        ...taskData,
        position: maxPosition + 1,
      })
      .returning();
    return task;
  }

  async updateTask(taskData: UpdateTask): Promise<Task> {
    const { id, ...updateData } = taskData;
    const [task] = await db
      .update(tasks)
      .set({
        ...updateData,
        updatedAt: sql`(strftime('%s', 'now'))`,
      })
      .where(eq(tasks.id, id))
      .returning();
    return task;
  }

  async deleteTask(id: string, userId: string): Promise<void> {
    await db
      .delete(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)));
  }

  async updateTaskPosition(
    id: string,
    userId: string,
    status: string,
    position: number
  ): Promise<Task> {
    const [task] = await db
      .update(tasks)
      .set({
        status,
        position,
        lastMovedAt: sql`(strftime('%s', 'now'))`,
        updatedAt: sql`(strftime('%s', 'now'))`,
      })
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
      .returning();
    return task;
  }


}

export const storage = new DatabaseStorage();
