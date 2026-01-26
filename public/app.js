// Global state
let boardData = null;
let currentEditingTask = null;
let currentEditingColumn = null;
let draggedTask = null;
let draggedFromColumn = null;

// Theme management
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const btn = document.getElementById('theme-toggle-btn');
    if (btn) {
        btn.textContent = theme === 'light' ? '🌙' : '☀️';
    }
}

// Initialize app
async function init() {
    initTheme();
    const authCheck = await fetch('/api/check-auth');
    const { authenticated } = await authCheck.json();

    if (authenticated) {
        showApp();
        loadBoard();
    } else {
        showLogin();
    }

    setupEventListeners();
}

function setupEventListeners() {
    // Login form
    document.getElementById('login-form').addEventListener('submit', handleLogin);

    // Logout
    document.getElementById('logout-btn').addEventListener('click', handleLogout);

    // Theme toggle
    document.getElementById('theme-toggle-btn').addEventListener('click', toggleTheme);

    // Add column
    document.getElementById('add-column-btn').addEventListener('click', openAddColumnModal);

    // Column form
    document.getElementById('column-form').addEventListener('submit', handleColumnSubmit);

    // Task form
    document.getElementById('task-form').addEventListener('submit', handleTaskSubmit);

    // Close modals on background click
    document.getElementById('task-modal').addEventListener('click', (e) => {
        if (e.target.id === 'task-modal') closeTaskModal();
    });

    document.getElementById('column-modal').addEventListener('click', (e) => {
        if (e.target.id === 'column-modal') closeColumnModal();
    });
}

// Authentication
async function handleLogin(e) {
    e.preventDefault();
    const password = document.getElementById('password').value;
    const errorEl = document.getElementById('login-error');

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });

        if (response.ok) {
            showApp();
            loadBoard();
        } else {
            errorEl.textContent = 'Неверный пароль';
            errorEl.classList.add('show');
        }
    } catch (error) {
        errorEl.textContent = 'Ошибка подключения';
        errorEl.classList.add('show');
    }
}

async function handleLogout() {
    await fetch('/api/logout', { method: 'POST' });
    showLogin();
    boardData = null;
}

function showApp() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
}

function showLogin() {
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('app').classList.add('hidden');
    document.getElementById('password').value = '';
    document.getElementById('login-error').classList.remove('show');
}

// Board management
async function loadBoard() {
    try {
        const response = await fetch('/api/board');
        boardData = await response.json();
        renderBoard();
    } catch (error) {
        console.error('Failed to load board:', error);
    }
}

function renderBoard() {
    const boardEl = document.getElementById('board');
    boardEl.innerHTML = '';

    boardData.columns.forEach(column => {
        const columnEl = createColumnElement(column);
        boardEl.appendChild(columnEl);
    });
}

function createColumnElement(column) {
    const columnEl = document.createElement('div');
    columnEl.className = 'column';
    columnEl.dataset.columnId = column.id;

    columnEl.innerHTML = `
    <div class="column-header">
      <div class="column-title" onclick="openEditColumnModal('${column.id}')">
        ${escapeHtml(column.title)}
        <span class="task-count">${column.tasks.length}</span>
      </div>
    </div>
    <div class="column-tasks" id="tasks-${column.id}"></div>
    <button class="add-task-btn" onclick="openAddTaskModal('${column.id}')">
      + Добавить задачу
    </button>
  `;

    const tasksContainer = columnEl.querySelector('.column-tasks');
    column.tasks.forEach(task => {
        const taskEl = createTaskElement(task, column.id);
        tasksContainer.appendChild(taskEl);
    });

    // Drag and drop for column
    tasksContainer.addEventListener('dragover', handleDragOver);
    tasksContainer.addEventListener('drop', (e) => handleDrop(e, column.id));
    tasksContainer.addEventListener('dragleave', handleDragLeave);

    return columnEl;
}

function createTaskElement(task, columnId) {
    const taskEl = document.createElement('div');
    taskEl.className = 'task-card';
    taskEl.draggable = true;
    taskEl.dataset.taskId = task.id;

    // Calculate subtask progress
    const totalSubtasks = task.subtasks.length;
    const completedSubtasks = task.subtasks.filter(st => st.completed).length;

    // Check if deadline is overdue
    const isOverdue = task.deadline && new Date(task.deadline) < new Date();

    taskEl.innerHTML = `
    <div class="task-header">
      <div class="task-title">${escapeHtml(task.title)}</div>
      <span class="priority-badge priority-${task.priority}">${getPriorityText(task.priority)}</span>
    </div>
    ${task.description ? `<div class="task-description">${escapeHtml(task.description)}</div>` : ''}
    ${task.tags && task.tags.length > 0 ? `
      <div class="task-tags">
        ${task.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
      </div>
    ` : ''}
    <div class="task-footer">
      ${task.deadline ? `
        <div class="task-deadline ${isOverdue ? 'overdue' : ''}">
          📅 ${formatDate(task.deadline)}
        </div>
      ` : '<div></div>'}
      ${totalSubtasks > 0 ? `
        <div class="subtasks-progress">
          ✓ ${completedSubtasks}/${totalSubtasks}
        </div>
      ` : ''}
    </div>
  `;

    taskEl.addEventListener('click', () => openEditTaskModal(task.id, columnId));
    taskEl.addEventListener('dragstart', (e) => handleDragStart(e, task.id, columnId));
    taskEl.addEventListener('dragend', handleDragEnd);

    return taskEl;
}

// Column CRUD
function openAddColumnModal() {
    currentEditingColumn = null;
    document.getElementById('column-modal-title').textContent = 'Новая колонка';
    document.getElementById('column-title').value = '';
    document.getElementById('delete-column-btn').classList.add('hidden');
    document.getElementById('column-modal').classList.remove('hidden');
}

function openEditColumnModal(columnId) {
    const column = boardData.columns.find(c => c.id === columnId);
    if (!column) return;

    currentEditingColumn = columnId;
    document.getElementById('column-modal-title').textContent = 'Редактировать колонку';
    document.getElementById('column-title').value = column.title;
    document.getElementById('delete-column-btn').classList.remove('hidden');
    document.getElementById('column-modal').classList.remove('hidden');
}

function closeColumnModal() {
    document.getElementById('column-modal').classList.add('hidden');
    currentEditingColumn = null;
}

async function handleColumnSubmit(e) {
    e.preventDefault();
    const title = document.getElementById('column-title').value;

    if (currentEditingColumn) {
        // Edit existing column
        await fetch(`/api/columns/${currentEditingColumn}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title })
        });
    } else {
        // Create new column
        await fetch('/api/columns', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title })
        });
    }

    closeColumnModal();
    loadBoard();
}

async function deleteColumn() {
    if (!currentEditingColumn) return;

    if (confirm('Удалить колонку и все ее задачи?')) {
        await fetch(`/api/columns/${currentEditingColumn}`, {
            method: 'DELETE'
        });
        closeColumnModal();
        loadBoard();
    }
}

// Task CRUD
function openAddTaskModal(columnId) {
    currentEditingTask = null;
    currentEditingColumn = columnId;

    document.getElementById('modal-title').textContent = 'Создать задачу';
    document.getElementById('task-title').value = '';
    document.getElementById('task-description').value = '';
    document.getElementById('task-priority').value = 'medium';
    document.getElementById('task-tags').value = '';
    document.getElementById('task-deadline').value = '';
    document.getElementById('subtasks-container').innerHTML = '';
    document.getElementById('delete-task-btn').classList.add('hidden');
    document.getElementById('task-modal').classList.remove('hidden');
}

function openEditTaskModal(taskId, columnId) {
    const column = boardData.columns.find(c => c.id === columnId);
    const task = column.tasks.find(t => t.id === taskId);
    if (!task) return;

    currentEditingTask = taskId;
    currentEditingColumn = columnId;

    document.getElementById('modal-title').textContent = 'Редактировать задачу';
    document.getElementById('task-title').value = task.title;
    document.getElementById('task-description').value = task.description || '';
    document.getElementById('task-priority').value = task.priority;
    document.getElementById('task-tags').value = task.tags ? task.tags.join(', ') : '';
    document.getElementById('task-deadline').value = task.deadline || '';

    // Render subtasks
    const subtasksContainer = document.getElementById('subtasks-container');
    subtasksContainer.innerHTML = '';
    task.subtasks.forEach(subtask => {
        addSubtaskField(subtask);
    });

    document.getElementById('delete-task-btn').classList.remove('hidden');
    document.getElementById('task-modal').classList.remove('hidden');
}

function closeTaskModal() {
    document.getElementById('task-modal').classList.add('hidden');
    currentEditingTask = null;
    currentEditingColumn = null;
}

async function handleTaskSubmit(e) {
    e.preventDefault();

    const title = document.getElementById('task-title').value;
    const description = document.getElementById('task-description').value;
    const priority = document.getElementById('task-priority').value;
    const tagsString = document.getElementById('task-tags').value;
    const tags = tagsString ? tagsString.split(',').map(t => t.trim()).filter(t => t) : [];
    const deadline = document.getElementById('task-deadline').value;

    // Get subtasks from form
    const subtaskInputs = document.querySelectorAll('.subtask-item');
    const subtasks = Array.from(subtaskInputs).map(item => {
        const checkbox = item.querySelector('input[type="checkbox"]');
        const textInput = item.querySelector('input[type="text"]');
        const subtaskId = item.dataset.subtaskId;

        return {
            id: subtaskId || Date.now().toString() + Math.random(),
            title: textInput.value,
            completed: checkbox.checked
        };
    }).filter(st => st.title);

    const taskData = {
        title,
        description,
        priority,
        tags,
        deadline: deadline || null,
        subtasks
    };

    if (currentEditingTask) {
        // Edit existing task
        await fetch(`/api/tasks/${currentEditingTask}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(taskData)
        });
    } else {
        // Create new task
        await fetch(`/api/columns/${currentEditingColumn}/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(taskData)
        });
    }

    closeTaskModal();
    loadBoard();
}

async function deleteTask() {
    if (!currentEditingTask) return;

    if (confirm('Удалить задачу?')) {
        await fetch(`/api/tasks/${currentEditingTask}`, {
            method: 'DELETE'
        });
        closeTaskModal();
        loadBoard();
    }
}

// Subtasks
function addSubtaskField(subtask = null) {
    const container = document.getElementById('subtasks-container');
    const subtaskEl = document.createElement('div');
    subtaskEl.className = 'subtask-item';
    if (subtask) {
        subtaskEl.dataset.subtaskId = subtask.id;
    }

    subtaskEl.innerHTML = `
    <input type="checkbox" ${subtask && subtask.completed ? 'checked' : ''}>
    <input type="text" placeholder="Название подзадачи" value="${subtask ? escapeHtml(subtask.title) : ''}" required>
    <button type="button" onclick="this.parentElement.remove()">×</button>
  `;

    container.appendChild(subtaskEl);
}

// Drag and Drop
function handleDragStart(e, taskId, columnId) {
    draggedTask = taskId;
    draggedFromColumn = columnId;
    e.target.classList.add('dragging');
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
    draggedTask = null;
    draggedFromColumn = null;
}

function handleDragOver(e) {
    e.preventDefault();
    const column = e.currentTarget.closest('.column');
    column.classList.add('drag-over');
}

function handleDragLeave(e) {
    const column = e.currentTarget.closest('.column');
    column.classList.remove('drag-over');
}

async function handleDrop(e, targetColumnId) {
    e.preventDefault();
    const column = e.currentTarget.closest('.column');
    column.classList.remove('drag-over');

    if (!draggedTask || draggedFromColumn === targetColumnId) {
        return;
    }

    // Move task to new column
    await fetch(`/api/tasks/${draggedTask}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetColumnId })
    });

    loadBoard();
}

// Utility functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getPriorityText(priority) {
    const map = {
        low: 'Низкий',
        medium: 'Средний',
        high: 'Высокий'
    };
    return map[priority] || priority;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
        return 'Сегодня';
    } else if (date.toDateString() === tomorrow.toDateString()) {
        return 'Завтра';
    }

    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

// Initialize on load
document.addEventListener('DOMContentLoaded', init);
