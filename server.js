require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');
const helmet = require('helmet');
const morgan = require('morgan');

// Custom Modules
const logger = require('./src/utils/logger');
const boardModel = require('./src/models/board.model');
const backupService = require('./src/services/backup.service');

const app = express();
const PORT = process.env.PORT || 3000;

// Environment Validation
if (!process.env.SESSION_SECRET) {
  logger.warn('⚠️ SESSION_SECRET is not set. Using insecure default. Please set it in .env file.');
}

// Data Directories
const DATA_DIR = path.join(__dirname, 'data');
const SESSIONS_DIR = path.join(DATA_DIR, 'sessions');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

if (!fs.existsSync(SESSIONS_DIR)) fs.mkdirSync(SESSIONS_DIR);

// Persistent session storage
const FileStore = require('session-file-store')(session);

// Security: Rate limiting for login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 login attempts per window
  message: { error: 'Слишком много попыток входа. Попробуйте через 15 минут.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disabled for simplicity with inline scripts/styles if any
}));
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

app.use(session({
  store: new FileStore({
    path: SESSIONS_DIR,
    ttl: 24 * 60 * 60, // 1 day
    retries: 0
  }),
  secret: process.env.SESSION_SECRET || 'kanban-fallback-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000,
    secure: process.env.USE_SECURE_COOKIES === 'true', // Set to 'true' only if using HTTPS
    httpOnly: true,
    sameSite: 'lax'
  }
}));

// Initialize config file if needed
if (!fs.existsSync(CONFIG_FILE)) {
  logger.warn('No config file found. Please run install.sh or set a password manually in data/config.json');
}

// Scheduled Tasks
// 1. Process recurring tasks daily at 00:05
cron.schedule('5 0 * * *', () => {
  try {
    processRecurringTasks();
  } catch (error) {
    logger.error('Error processing recurring tasks', { error: error.message });
  }
});

// 2. Schedule daily backup at midnight
cron.schedule('0 0 * * *', () => {
  backupService.createBackup();
});

// Run recurring check on startup
processRecurringTasks();


// Helper Helper: Process Recurring Tasks
function processRecurringTasks() {
  const board = boardModel.read();
  const today = new Date().toISOString().split('T')[0];
  let boardChanged = false;

  board.columns.forEach(column => {
    column.tasks.forEach(task => {
      if (task.recurring && task.recurring.frequency !== 'none') {
        const lastRun = task.recurring.lastRun || '1970-01-01';
        let shouldRun = false;

        const lastDate = new Date(lastRun);
        const currentDate = new Date(today);
        const diffTime = Math.abs(currentDate - lastDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (task.recurring.frequency === 'daily' && diffDays >= 1) {
          shouldRun = true;
        } else if (task.recurring.frequency === 'weekly' && diffDays >= 7) {
          shouldRun = true;
        }

        if (shouldRun) {
          const newTask = {
            ...task,
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            createdAt: new Date().toISOString(),
            history: [{
              type: 'create',
              columnTitle: board.columns[0].title,
              timestamp: new Date().toISOString(),
              note: 'Recurring task generated'
            }],
            startedAt: null,
            completedAt: null,
            archived: false,
            recurring: { ...task.recurring, lastRun: today }
          };

          // Update template lastRun
          task.recurring.lastRun = today;

          // New instance is regular task
          delete newTask.recurring;

          board.columns[0].tasks.push(newTask);
          boardChanged = true;
          logger.info(`Generated recurring task: ${task.title}`);
        }
      }
    });
  });

  if (boardChanged) {
    boardModel.save(board);
  }
}

function readConfig() {
  return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
}

// Authentication middleware
function requireAuth(req, res, next) {
  if (req.session.authenticated) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

// Routes - Authentication
app.post('/api/login', loginLimiter, (req, res) => {
  const { password } = req.body;

  try {
    const config = readConfig();
    if (bcrypt.compareSync(password, config.passwordHash)) {
      req.session.authenticated = true;
      logger.info('User logged in successfully');
      res.json({ success: true });
    } else {
      logger.warn('Failed login attempt');
      res.status(401).json({ error: 'Invalid password' });
    }
  } catch (error) {
    logger.error('Login error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.get('/api/check-auth', (req, res) => {
  res.json({ authenticated: !!req.session.authenticated });
});

// Routes - Board
app.get('/api/board', requireAuth, (req, res) => {
  const board = boardModel.read();
  // Filter out archived tasks
  board.columns.forEach(column => {
    column.tasks = column.tasks.filter(t => !t.archived);
  });
  res.json(board);
});

app.get('/api/tasks/archived', requireAuth, (req, res) => {
  const board = boardModel.read();
  const archivedTasks = [];
  board.columns.forEach(column => {
    column.tasks.forEach(task => {
      if (task.archived) archivedTasks.push({ ...task, columnTitle: column.title });
    });
  });
  res.json(archivedTasks);
});

app.get('/api/tasks/:taskId/history', requireAuth, (req, res) => {
  const { taskId } = req.params;
  const board = boardModel.read();
  for (const column of board.columns) {
    const task = column.tasks.find(t => t.id === taskId);
    if (task) return res.json(task.history || []);
  }
  res.status(404).json({ error: 'Task not found' });
});

app.post('/api/tasks/:taskId/archive', requireAuth, (req, res) => {
  const { taskId } = req.params;
  const { archived } = req.body;
  const board = boardModel.read();

  let found = false;
  for (const column of board.columns) {
    const task = column.tasks.find(t => t.id === taskId);
    if (task) {
      task.archived = !!archived;
      if (!task.history) task.history = [];
      task.history.push({
        type: archived ? 'archive' : 'restore',
        columnTitle: column.title,
        timestamp: new Date().toISOString()
      });
      found = true;
      break;
    }
  }

  if (found) {
    boardModel.save(board);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Task not found' });
  }
});

app.post('/api/columns', requireAuth, (req, res) => {
  const { title } = req.body;
  const board = boardModel.read();

  const newColumn = {
    id: Date.now().toString(),
    title,
    tasks: [],
    wipLimit: 0
  };

  board.columns.push(newColumn);
  boardModel.save(board);
  res.json(newColumn);
});

app.put('/api/columns/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const { title } = req.body;
  const board = boardModel.read();

  const column = board.columns.find(col => col.id === id);
  if (column) {
    column.title = title || column.title;
    if (req.body.wipLimit !== undefined) column.wipLimit = parseInt(req.body.wipLimit);
    boardModel.save(board);
    res.json(column);
  } else {
    res.status(404).json({ error: 'Column not found' });
  }
});

app.delete('/api/columns/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const board = boardModel.read();

  board.columns = board.columns.filter(col => col.id !== id);
  boardModel.save(board);
  res.json({ success: true });
});

app.post('/api/columns/:columnId/tasks', requireAuth, (req, res) => {
  const { columnId } = req.params;
  const { title, description, priority, tags, deadline, subtasks, recurring } = req.body;
  const board = boardModel.read();

  const column = board.columns.find(col => col.id === columnId);
  if (!column) {
    return res.status(404).json({ error: 'Column not found' });
  }

  const newTask = {
    id: Date.now().toString(),
    title,
    description: description || '',
    priority: priority || 'medium',
    tags: tags || [],
    deadline: deadline || null,
    subtasks: subtasks || [],
    recurring: recurring || { frequency: 'none', lastRun: null },
    createdAt: new Date().toISOString(),
    history: [{
      type: 'create',
      columnTitle: column.title,
      timestamp: new Date().toISOString()
    }]
  };

  column.tasks.push(newTask);
  boardModel.save(board);
  res.json(newTask);
});

app.put('/api/tasks/:taskId', requireAuth, (req, res) => {
  const { taskId } = req.params;
  const updates = req.body;
  const board = boardModel.read();

  let taskFound = false;
  for (const column of board.columns) {
    const task = column.tasks.find(t => t.id === taskId);
    if (task) {
      if (!task.history) task.history = [];

      if (updates.subtasks) {
        updates.subtasks.forEach(newSt => {
          const oldSt = task.subtasks.find(st => st.id === newSt.id);
          if (oldSt && oldSt.completed !== newSt.completed) {
            task.history.push({
              type: newSt.completed ? 'subtask_done' : 'subtask_undone',
              subtaskTitle: newSt.title,
              timestamp: new Date().toISOString()
            });
          }
        });
      }

      Object.assign(task, updates);
      taskFound = true;
      break;
    }
  }

  if (taskFound) {
    boardModel.save(board);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Task not found' });
  }
});

app.delete('/api/tasks/:taskId', requireAuth, (req, res) => {
  const { taskId } = req.params;
  const board = boardModel.read();

  for (const column of board.columns) {
    column.tasks = column.tasks.filter(t => t.id !== taskId);
  }

  boardModel.save(board);
  res.json({ success: true });
});

app.post('/api/tasks/:taskId/move', requireAuth, (req, res) => {
  const { taskId } = req.params;
  const { targetColumnId } = req.body;
  const board = boardModel.read();

  let task = null;
  let sourceColumnTitle = '';
  for (const column of board.columns) {
    const taskIndex = column.tasks.findIndex(t => t.id === taskId);
    if (taskIndex !== -1) {
      sourceColumnTitle = column.title;
      task = column.tasks.splice(taskIndex, 1)[0];
      break;
    }
  }

  const targetColumn = board.columns.find(col => col.id === targetColumnId);
  if (task && targetColumn) {
    if (!task.history) task.history = [];

    if (!task.startedAt && board.columns[0].id !== targetColumnId) {
      task.startedAt = new Date().toISOString();
    }

    if (targetColumn.title.toLowerCase().includes('done')) {
      task.completedAt = new Date().toISOString();
    } else {
      task.completedAt = null;
    }

    task.history.push({
      type: 'move',
      from: sourceColumnTitle,
      to: targetColumn.title,
      timestamp: new Date().toISOString()
    });

    targetColumn.tasks.push(task);
    boardModel.save(board);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Task or column not found' });
  }
});

app.post('/api/tasks/:taskId/subtasks', requireAuth, (req, res) => {
  const { taskId } = req.params;
  const { title } = req.body;
  const board = boardModel.read();

  for (const column of board.columns) {
    const task = column.tasks.find(t => t.id === taskId);
    if (task) {
      const newSubtask = {
        id: Date.now().toString(),
        title,
        completed: false
      };
      task.subtasks.push(newSubtask);
      boardModel.save(board);
      return res.json(newSubtask);
    }
  }

  res.status(404).json({ error: 'Task not found' });
});

app.put('/api/subtasks/:subtaskId', requireAuth, (req, res) => {
  const { subtaskId } = req.params;
  const updates = req.body;
  const board = boardModel.read();

  let found = false;
  let parentTask = null;
  let oldSubtaskTitle = '';
  let oldCompletedStatus = false;

  for (const column of board.columns) {
    for (const task of column.tasks) {
      const subtask = task.subtasks.find(st => st.id === subtaskId);
      if (subtask) {
        parentTask = task;
        oldSubtaskTitle = subtask.title;
        oldCompletedStatus = subtask.completed;
        Object.assign(subtask, updates);
        found = true;
        break;
      }
    }
    if (found) break;
  }

  if (found) {
    if (!parentTask.history) parentTask.history = [];

    if (updates.hasOwnProperty('completed') && updates.completed !== oldCompletedStatus) {
      parentTask.history.push({
        type: updates.completed ? 'subtask_done' : 'subtask_undone',
        subtaskTitle: oldSubtaskTitle,
        timestamp: new Date().toISOString()
      });
    }

    if (updates.title && updates.title !== oldSubtaskTitle) {
      parentTask.history.push({
        type: 'subtask_rename',
        from: oldSubtaskTitle,
        to: updates.title,
        timestamp: new Date().toISOString()
      });
    }

    boardModel.save(board);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Subtask not found' });
  }
});

app.get('/api/backup/export', requireAuth, (req, res) => {
  const board = boardModel.read();
  const date = new Date().toISOString().split('T')[0];
  res.setHeader('Content-disposition', `attachment; filename=kanbe-backup-${date}.json`);
  res.setHeader('Content-type', 'application/json');
  res.send(JSON.stringify(board, null, 2));
});

app.post('/api/backup/import', requireAuth, (req, res) => {
  try {
    const board = req.body;
    if (!board.columns || !Array.isArray(board.columns)) {
      return res.status(400).json({ error: 'Некорректный формат данных' });
    }
    backupService.createBackup();
    boardModel.save(board);
    res.json({ success: true });
  } catch (e) {
    logger.error('Import error', { error: e.message });
    res.status(500).json({ error: 'Ошибка при восстановлении' });
  }
});

app.delete('/api/subtasks/:subtaskId', requireAuth, (req, res) => {
  const { subtaskId } = req.params;
  const board = boardModel.read();

  for (const column of board.columns) {
    for (const task of column.tasks) {
      task.subtasks = task.subtasks.filter(st => st.id !== subtaskId);
    }
  }

  boardModel.save(board);
  res.json({ success: true });
});

// Start server
app.listen(PORT, () => {
  logger.info(`Kanban server running on http://localhost:${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
