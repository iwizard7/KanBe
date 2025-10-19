import {
  users,
  tasks,
  comments,
  type User,
  type UpsertUser,
  type Task,
  type InsertTask,
  type UpdateTask,
  type Comment,
  type InsertComment,
  type UpdateComment,
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
  getTask(id: string, userId: string): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(task: UpdateTask): Promise<Task>;
  deleteTask(id: string, userId: string): Promise<void>;
  updateTaskPosition(id: string, userId: string, status: string, position: number): Promise<Task>;

  // Comment operations
  getComments(taskId: string, userId: string): Promise<Comment[]>;
  getComment(id: string, userId: string): Promise<Comment | undefined>;
  createComment(comment: InsertComment & { userId: string }): Promise<Comment>;
  updateComment(comment: UpdateComment & { userId: string }): Promise<Comment>;
  deleteComment(id: string, userId: string): Promise<void>;
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
    const taskList = await db
      .select()
      .from(tasks)
      .where(eq(tasks.userId, userId))
      .orderBy(tasks.status, tasks.position);

    // Add comment count to each task
    const tasksWithComments = await Promise.all(
      taskList.map(async (task) => {
        const commentCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(comments)
          .where(eq(comments.taskId, task.id));

        return {
          ...task,
          commentCount: commentCount[0]?.count || 0,
        };
      })
    );

    return tasksWithComments;
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

  // Comment operations
  async getComments(taskId: string, userId: string): Promise<Comment[]> {
    // First check if task belongs to user
    const task = await this.getTask(taskId, userId);
    if (!task) {
      return [];
    }

    return await db
      .select()
      .from(comments)
      .where(eq(comments.taskId, taskId))
      .orderBy(desc(comments.createdAt));
  }

  async getComment(id: string, userId: string): Promise<Comment | undefined> {
    const [comment] = await db
      .select()
      .from(comments)
      .where(and(eq(comments.id, id), eq(comments.userId, userId)));
    return comment;
  }

  async createComment(commentData: InsertComment & { userId: string }): Promise<Comment> {
    const { userId, ...data } = commentData;
    const [comment] = await db
      .insert(comments)
      .values({
        ...data,
        userId,
      })
      .returning();
    return comment;
  }

  async updateComment(commentData: UpdateComment & { userId: string }): Promise<Comment> {
    const { id, userId, ...updateData } = commentData;
    const [comment] = await db
      .update(comments)
      .set({
        ...updateData,
        updatedAt: sql`(strftime('%s', 'now'))`,
      })
      .where(and(eq(comments.id, id), eq(comments.userId, userId)))
      .returning();
    return comment;
  }

  async deleteComment(id: string, userId: string): Promise<void> {
    await db
      .delete(comments)
      .where(and(eq(comments.id, id), eq(comments.userId, userId)));
  }
}

export const storage = new DatabaseStorage();
