require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 3000;

// Security: Rate limiting for login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 login attempts per window
  message: { error: 'Слишком много попыток входа. Попробуйте через 15 минут.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
  secret: process.env.SESSION_SECRET || 'kanban-fallback-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000,
    secure: process.env.NODE_ENV === 'production' && false, // Set to true if using HTTPS
    httpOnly: true,
    sameSite: 'lax'
  }
}));

// Data directories
const DATA_DIR = path.join(__dirname, 'data');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
const BOARD_FILE = path.join(DATA_DIR, 'board.json');

// Initialize data directories
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR);

// Initialize config file
if (!fs.existsSync(CONFIG_FILE)) {
  console.log('Warning: No config file found. Please run install.sh or set a password manually in data/config.json');
}

// Initialize board file
if (!fs.existsSync(BOARD_FILE)) {
  const defaultBoard = {
    columns: [
      { id: '1', title: 'To Do', tasks: [] },
      { id: '2', title: 'In Progress', tasks: [] },
      { id: '3', title: 'Done', tasks: [] }
    ]
  };
  fs.writeFileSync(BOARD_FILE, JSON.stringify(defaultBoard, null, 2));
}

// Backup logic
function createBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(BACKUP_DIR, `board-backup-${timestamp}.json`);
  fs.copyFileSync(BOARD_FILE, backupPath);
  console.log(`Backup created: ${backupPath}`);

  // Clean old backups (keep last N days)
  const keepDays = parseInt(process.env.BACKUP_DAYS) || 7;
  const files = fs.readdirSync(BACKUP_DIR);
  const now = Date.now();

  files.forEach(file => {
    const filePath = path.join(BACKUP_DIR, file);
    const stats = fs.statSync(filePath);
    const ageInDays = (now - stats.mtimeMs) / (1000 * 60 * 60 * 24);

    if (ageInDays > keepDays) {
      fs.unlinkSync(filePath);
      console.log(`Deleted old backup: ${file}`);
    }
  });
}

// Helper to check and generate recurring tasks
function processRecurringTasks() {
  const board = readBoard();
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
          // Create copy in the first column
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
            recurring: { ...task.recurring, lastRun: today } // Don't let the copy be recurring source unless intended? 
            // Better: copy is NOT recurring, or source maintains the state.
          };

          // Actually, usually the source task itself is the "template".
          // We update the template's lastRun and add a new instance.
          task.recurring.lastRun = today;

          // Important: the new instance should NOT have a recurring setting to avoid cascading multiples, 
          // OR it stays as is and we just track the template. 
          // Let's make the NEW instance a regular task.
          delete newTask.recurring;

          board.columns[0].tasks.push(newTask);
          boardChanged = true;
          console.log(`Generated recurring task: ${task.title}`);
        }
      }
    });
  });

  if (boardChanged) {
    saveBoard(board);
  }
}

// Schedule daily check for recurring tasks at 00:05
cron.schedule('5 0 * * *', () => {
  processRecurringTasks();
});

// Also check on server start
processRecurringTasks();

// Schedule daily backup at midnight
cron.schedule('0 0 * * *', () => {
  createBackup();
});

// Helper functions (same as before but with backup on save)
function readConfig() {
  return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
}

function readBoard() {
  return JSON.parse(fs.readFileSync(BOARD_FILE, 'utf8'));
}

function saveBoard(board) {
  fs.writeFileSync(BOARD_FILE, JSON.stringify(board, null, 2));
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
  const config = readConfig();

  if (bcrypt.compareSync(password, config.passwordHash)) {
    req.session.authenticated = true;
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Invalid password' });
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
  const board = readBoard();
  // Filter out archived tasks for the main board view
  board.columns.forEach(column => {
    column.tasks = column.tasks.filter(t => !t.archived);
  });
  res.json(board);
});

// GET archived tasks
app.get('/api/tasks/archived', requireAuth, (req, res) => {
  const board = readBoard();
  const archivedTasks = [];
  board.columns.forEach(column => {
    column.tasks.forEach(task => {
      if (task.archived) archivedTasks.push({ ...task, columnTitle: column.title });
    });
  });
  res.json(archivedTasks);
});

// GET task history
app.get('/api/tasks/:taskId/history', requireAuth, (req, res) => {
  const { taskId } = req.params;
  const board = readBoard();
  for (const column of board.columns) {
    const task = column.tasks.find(t => t.id === taskId);
    if (task) return res.json(task.history || []);
  }
  res.status(404).json({ error: 'Task not found' });
});

// Archive/Unarchive task
app.post('/api/tasks/:taskId/archive', requireAuth, (req, res) => {
  const { taskId } = req.params;
  const { archived } = req.body;
  const board = readBoard();

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
    saveBoard(board);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Task not found' });
  }
});
app.post('/api/columns', requireAuth, (req, res) => {
  const { title } = req.body;
  const board = readBoard();

  const newColumn = {
    id: Date.now().toString(),
    title,
    tasks: [],
    wipLimit: 0 // 0 means no limit
  };

  board.columns.push(newColumn);
  saveBoard(board);
  res.json(newColumn);
});

app.put('/api/columns/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const { title } = req.body;
  const board = readBoard();

  const column = board.columns.find(col => col.id === id);
  if (column) {
    column.title = title || column.title;
    if (req.body.wipLimit !== undefined) column.wipLimit = parseInt(req.body.wipLimit);
    saveBoard(board);
    res.json(column);
  } else {
    res.status(404).json({ error: 'Column not found' });
  }
});

app.delete('/api/columns/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const board = readBoard();

  board.columns = board.columns.filter(col => col.id !== id);
  saveBoard(board);
  res.json({ success: true });
});

// Routes - Tasks
app.post('/api/columns/:columnId/tasks', requireAuth, (req, res) => {
  const { columnId } = req.params;
  const { title, description, priority, tags, deadline } = req.body;
  const board = readBoard();

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
    deadline: deadline || null,
    subtasks: [],
    createdAt: new Date().toISOString(),
    history: [{
      type: 'create',
      columnTitle: column.title,
      timestamp: new Date().toISOString()
    }]
  };

  column.tasks.push(newTask);
  saveBoard(board);
  res.json(newTask);
});

app.put('/api/tasks/:taskId', requireAuth, (req, res) => {
  const { taskId } = req.params;
  const updates = req.body;
  const board = readBoard();

  let taskFound = false;
  for (const column of board.columns) {
    const task = column.tasks.find(t => t.id === taskId);
    if (task) {
      Object.assign(task, updates);
      taskFound = true;
      break;
    }
  }

  if (taskFound) {
    saveBoard(board);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Task not found' });
  }
});

app.delete('/api/tasks/:taskId', requireAuth, (req, res) => {
  const { taskId } = req.params;
  const board = readBoard();

  for (const column of board.columns) {
    column.tasks = column.tasks.filter(t => t.id !== taskId);
  }

  saveBoard(board);
  res.json({ success: true });
});

// Move task between columns
app.post('/api/tasks/:taskId/move', requireAuth, (req, res) => {
  const { taskId } = req.params;
  const { targetColumnId } = req.body;
  const board = readBoard();

  let task = null;
  for (const column of board.columns) {
    const taskIndex = column.tasks.findIndex(t => t.id === taskId);
    if (taskIndex !== -1) {
      task = column.tasks.splice(taskIndex, 1)[0];
      break;
    }
  }

  const targetColumn = board.columns.find(col => col.id === targetColumnId);
  if (task && targetColumn) {
    if (!task.history) task.history = [];

    // Track StartedAt (first move from first column)
    if (!task.startedAt && board.columns[0].id !== targetColumnId) {
      task.startedAt = new Date().toISOString();
    }

    // Track CompletedAt (move to Done column)
    if (targetColumn.title.toLowerCase().includes('done')) {
      task.completedAt = new Date().toISOString();
    } else {
      task.completedAt = null;
    }

    task.history.push({
      type: 'move',
      from: task.lastColumnTitle || 'Unknown',
      to: targetColumn.title,
      timestamp: new Date().toISOString()
    });

    task.lastColumnTitle = targetColumn.title;
    targetColumn.tasks.push(task);
    saveBoard(board);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Task or column not found' });
  }
});

// Routes - Subtasks
app.post('/api/tasks/:taskId/subtasks', requireAuth, (req, res) => {
  const { taskId } = req.params;
  const { title } = req.body;
  const board = readBoard();

  for (const column of board.columns) {
    const task = column.tasks.find(t => t.id === taskId);
    if (task) {
      const newSubtask = {
        id: Date.now().toString(),
        title,
        completed: false
      };
      task.subtasks.push(newSubtask);
      saveBoard(board);
      return res.json(newSubtask);
    }
  }

  res.status(404).json({ error: 'Task not found' });
});

app.put('/api/subtasks/:subtaskId', requireAuth, (req, res) => {
  const { subtaskId } = req.params;
  const updates = req.body;
  const board = readBoard();

  let found = false;
  for (const column of board.columns) {
    for (const task of column.tasks) {
      const subtask = task.subtasks.find(st => st.id === subtaskId);
      if (subtask) {
        Object.assign(subtask, updates);
        found = true;
        break;
      }
    }
    if (found) break;
  }

  if (found) {
    saveBoard(board);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Subtask not found' });
  }
});

app.delete('/api/subtasks/:subtaskId', requireAuth, (req, res) => {
  const { subtaskId } = req.params;
  const board = readBoard();

  for (const column of board.columns) {
    for (const task of column.tasks) {
      task.subtasks = task.subtasks.filter(st => st.id !== subtaskId);
    }
  }

  saveBoard(board);
  res.json({ success: true });
});

// Start server
app.listen(PORT, () => {
  console.log(`Kanban server running on http://localhost:${PORT}`);
});
