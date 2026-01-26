const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
  secret: 'kanban-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Data directories
const DATA_DIR = path.join(__dirname, 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
const BOARD_FILE = path.join(DATA_DIR, 'board.json');

// Initialize data directory
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}

// Initialize config file with default password "admin"
if (!fs.existsSync(CONFIG_FILE)) {
  const defaultPassword = bcrypt.hashSync('admin', 10);
  fs.writeFileSync(CONFIG_FILE, JSON.stringify({ passwordHash: defaultPassword }, null, 2));
  console.log('Default password set to: admin');
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

// Helper functions
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
app.post('/api/login', (req, res) => {
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
  res.json(board);
});

// Routes - Columns
app.post('/api/columns', requireAuth, (req, res) => {
  const { title } = req.body;
  const board = readBoard();
  
  const newColumn = {
    id: Date.now().toString(),
    title,
    tasks: []
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
    column.title = title;
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
    subtasks: [],
    createdAt: new Date().toISOString()
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
  console.log('Default password: admin');
});
