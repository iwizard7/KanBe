import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./authSetup";
import { insertTaskSchema, updateTaskSchema, insertCommentSchema, updateCommentSchema } from "@shared/schema";
import { z } from "zod";
import { passport } from "./auth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);



  app.post('/api/auth/login', passport.authenticate('local'), (req, res) => {
    if (!req.user) {
      console.error(`[AUTH ERROR] 401 Authentication failed - IP: ${req.ip}, URL: ${req.originalUrl}, User-Agent: ${req.get('User-Agent')}`);
      return res.status(401).json({ message: "Authentication failed" });
    }
    const user = req.user as any;
    res.json({ id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName });
  });

  app.post('/api/auth/logout', (req, res) => {
    req.logout(() => {
      res.json({ message: "Logged out" });
    });
  });

  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Logout route (GET for browser navigation)
  app.get('/api/logout', (req, res) => {
    req.logout(() => {
      res.redirect('/login');
    });
  });

  // Task routes - all protected
  
    // Get all tasks for user
    app.get("/api/tasks", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const tasks = await storage.getTasks(userId);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  // Get single task
  app.get("/api/tasks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const task = await storage.getTask(req.params.id, userId);
  
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
  
      res.json(task);
    } catch (error) {
      console.error("Error fetching task:", error);
      res.status(500).json({ message: "Failed to fetch task" });
    }
  });

  // Create task
  app.post("/api/tasks", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
  
      // Validate request body
      const validatedData = insertTaskSchema.parse({
        ...req.body,
        userId,
      });
  
      const task = await storage.createTask(validatedData);
      res.status(201).json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Validation error",
          errors: error.errors
        });
      }
      console.error("Error creating task:", error);
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  // Update task
  app.patch("/api/tasks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
  
      // Check if task exists and belongs to user
      const existingTask = await storage.getTask(req.params.id, userId);
      if (!existingTask) {
        return res.status(404).json({ message: "Task not found" });
      }
  
      // Validate request body
      const validatedData = updateTaskSchema.parse({
        id: req.params.id,
        ...req.body,
      });
  
      const task = await storage.updateTask(validatedData);
      res.json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Validation error",
          errors: error.errors
        });
      }
      console.error("Error updating task:", error);
      res.status(500).json({ message: "Failed to update task" });
    }
  });

  // Delete task
  app.delete("/api/tasks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
  
      // Check if task exists and belongs to user
      const existingTask = await storage.getTask(req.params.id, userId);
      if (!existingTask) {
        return res.status(404).json({ message: "Task not found" });
      }
  
      await storage.deleteTask(req.params.id, userId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(500).json({ message: "Failed to delete task" });
    }
  });

  // Update task position (for drag & drop)
  app.patch("/api/tasks/:id/position", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { status, position } = req.body;

      if (!status || typeof position !== 'number') {
        return res.status(400).json({
          message: "Status and position are required"
        });
      }

      // Check if task exists and belongs to user
      const existingTask = await storage.getTask(req.params.id, userId);
      if (!existingTask) {
        return res.status(404).json({ message: "Task not found" });
      }

      const task = await storage.updateTaskPosition(
        req.params.id,
        userId,
        status,
        position
      );
      res.json(task);
    } catch (error) {
      console.error("Error updating task position:", error);
      res.status(500).json({ message: "Failed to update task position" });
    }
  });

  // Comment routes - all protected

  // Get comments for a task
  app.get("/api/tasks/:taskId/comments", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const comments = await storage.getComments(req.params.taskId, userId);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  // Create comment
  app.post("/api/tasks/:taskId/comments", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;

      // Check if task exists and belongs to user
      const task = await storage.getTask(req.params.taskId, userId);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      // Validate request body
      const validatedData = insertCommentSchema.parse({
        ...req.body,
        taskId: req.params.taskId,
      });

      const comment = await storage.createComment({
        ...validatedData,
        userId,
      });
      res.status(201).json(comment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Validation error",
          errors: error.errors
        });
      }
      console.error("Error creating comment:", error);
      res.status(500).json({ message: "Failed to create comment" });
    }
  });

  // Update comment
  app.patch("/api/tasks/:taskId/comments/:commentId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;

      // Check if comment exists and belongs to user
      const existingComment = await storage.getComment(req.params.commentId, userId);
      if (!existingComment) {
        return res.status(404).json({ message: "Comment not found" });
      }

      // Validate request body
      const validatedData = updateCommentSchema.parse({
        id: req.params.commentId,
        ...req.body,
      });

      const comment = await storage.updateComment({
        ...validatedData,
        userId,
      });
      res.json(comment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Validation error",
          errors: error.errors
        });
      }
      console.error("Error updating comment:", error);
      res.status(500).json({ message: "Failed to update comment" });
    }
  });

  // Delete comment
  app.delete("/api/tasks/:taskId/comments/:commentId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;

      // Check if comment exists and belongs to user
      const existingComment = await storage.getComment(req.params.commentId, userId);
      if (!existingComment) {
        return res.status(404).json({ message: "Comment not found" });
      }

      await storage.deleteComment(req.params.commentId, userId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting comment:", error);
      res.status(500).json({ message: "Failed to delete comment" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
