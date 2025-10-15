import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./authSetup";
import { insertTaskSchema, updateTaskSchema } from "@shared/schema";
import { z } from "zod";
import bcrypt from "bcrypt";
import { passport } from "./auth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { email, password, firstName, lastName } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await storage.createUser({
        email,
        password: hashedPassword,
        firstName,
        lastName,
      });

      res.status(201).json({ id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName });
    } catch (error) {
      console.error("Error registering user:", error);
      res.status(500).json({ message: "Failed to register user" });
    }
  });

  app.post('/api/auth/login', passport.authenticate('local'), (req, res) => {
    if (!req.user) {
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

  const httpServer = createServer(app);
  return httpServer;
}
