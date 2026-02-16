// Global state
let boardData = null;
let currentEditingTask = null;
let currentEditingTaskData = null;
let currentEditingColumn = null;
let currentTaskLinks = []; // IDs of tasks that this task blocks
let sortables = {
    tasks: [],
    columns: null
};
let searchText = '';

// Sound Manager (Auditory UI)
const SoundManager = {
    audioContext: null,
    init() {
        if (this.audioContext) return;
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    },
    playMove() {
        this.init();
        if (this.audioContext.state === 'suspended') this.audioContext.resume();
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        osc.connect(gain);
        gain.connect(this.audioContext.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, this.audioContext.currentTime);
        osc.frequency.exponentialRampToValueAtTime(200, this.audioContext.currentTime + 0.1);
        gain.gain.setValueAtTime(0.2, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
        osc.start();
        osc.stop(this.audioContext.currentTime + 0.1);
    },
    playComplete() {
        this.init();
        if (this.audioContext.state === 'suspended') this.audioContext.resume();
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        osc.connect(gain);
        gain.connect(this.audioContext.destination);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600, this.audioContext.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1000, this.audioContext.currentTime + 0.1);
        gain.gain.setValueAtTime(0.2, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
        osc.start();
        osc.stop(this.audioContext.currentTime + 0.3);
    }
};

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

    document.addEventListener('click', () => {
    });

    // Logout
    document.getElementById('logout-btn').addEventListener('click', handleLogout);

    // Theme toggle
    document.getElementById('theme-toggle-btn').addEventListener('click', toggleTheme);

    // Add Column
    document.getElementById('add-column-btn').addEventListener('click', openAddColumnModal);

    // Settings
    document.getElementById('show-settings-btn').addEventListener('click', openSettingsModal);

    // Search
    document.getElementById('search-input').addEventListener('input', (e) => {
        searchText = e.target.value.toLowerCase();
        renderBoard();
    });

    // Archive
    document.getElementById('show-archive-btn').addEventListener('click', openArchiveModal);

    // Hotkeys
    document.addEventListener('keydown', (e) => {
        // Only trigger if not typing in an input/textarea
        const isInput = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT';

        if (!isInput) {
            if (e.key.toLowerCase() === 'n') {
                e.preventDefault();
                openAddTaskModal(boardData.columns[0]?.id);
            }
        } else {
            // Hotkeys while editing
            if (e.key === 'Enter' && e.ctrlKey) {
                if (!document.getElementById('task-modal').classList.contains('hidden')) {
                    handleTaskSubmit(new Event('submit'));
                } else if (!document.getElementById('column-modal').classList.contains('hidden')) {
                    handleColumnSubmit(new Event('submit'));
                }
            }
        }

        if (e.key === 'Escape') {
            closeTaskModal();
            closeColumnModal();
            closeArchiveModal();
        }
    });

    // Column form
    document.getElementById('column-form').addEventListener('submit', handleColumnSubmit);
    document.getElementById('delete-column-btn').addEventListener('click', deleteColumn);

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
    renderSwimlanesIfNeeded();
    initSortable();
}

function renderBoardNormal() {
    const boardEl = document.getElementById('board');
    boardData.columns.forEach(column => {
        const query = searchText.toLowerCase().replace('#priority', '').trim();
        const filteredTasks = column.tasks.filter(task => {
            const matchesTitle = task.title.toLowerCase().includes(query);
            const matchesTags = task.tags.some(tag => tag.toLowerCase().includes(query));
            const matchesDescription = task.description.toLowerCase().includes(query);
            return matchesTitle || matchesTags || matchesDescription;
        });

        const columnEl = createColumnElement({ ...column, tasks: filteredTasks });
        if (column.wipLimit > 0 && filteredTasks.length > column.wipLimit) {
            columnEl.classList.add('wip-warning');
        }
        boardEl.appendChild(columnEl);
    });
}

function renderSwimlanesIfNeeded() {
    if (!searchText.includes('#priority')) {
        renderBoardNormal();
        return;
    }


    const boardEl = document.getElementById('board');
    const priorities = ['high', 'medium', 'low'];

    priorities.forEach(priority => {
        // Add Divider
        const divider = document.createElement('div');
        divider.className = 'swimlane-divider';
        divider.innerHTML = `<span class="swimlane-label">${getPriorityText(priority)}</span>`;
        boardEl.appendChild(divider);

        // Add Row of columns for this priority
        const row = document.createElement('div');
        row.className = 'swimlane-row';
        row.style.display = 'flex';
        row.style.gap = '24px';
        row.style.marginBottom = '40px';

        boardData.columns.forEach(column => {
            const tasks = column.tasks.filter(t => t.priority === priority);
            const columnEl = createColumnElement({ ...column, tasks });
            // Disable task adding in swimlane view for simplicity
            const addTaskBtn = columnEl.querySelector('.add-task-btn');
            if (addTaskBtn) {
                addTaskBtn.style.display = 'none';
            }
            row.appendChild(columnEl);
        });
        boardEl.appendChild(row);
    });
}

function initSortable() {
    // Destroy previous instances
    sortables.tasks.forEach(s => s.destroy());
    sortables.tasks = [];
    if (sortables.columns) sortables.columns.destroy();

    // Column sorting
    const boardEl = document.getElementById('board');
    sortables.columns = new Sortable(boardEl, {
        animation: 150,
        handle: '.column-header',
        ghostClass: 'sortable-ghost',
        onEnd: async (evt) => {
            const columnIds = Array.from(boardEl.querySelectorAll('.column')).map(el => el.dataset.columnId);
            // Optional: Implement column reordering API
            console.log('New column order:', columnIds);
        }
    });

    // Task sorting across columns
    document.querySelectorAll('.column-tasks').forEach(el => {
        const columnId = el.closest('.column').dataset.columnId;
        const sortable = new Sortable(el, {
            group: 'tasks',
            animation: 150,
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            dragClass: 'sortable-drag',
            onEnd: async (evt) => {
                const taskId = evt.item.dataset.taskId;
                const targetColumnId = evt.to.closest('.column').dataset.columnId;

                await fetch(`/api/tasks/${taskId}/move`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ targetColumnId })
                });

                // Sound Effect
                SoundManager.playMove();

                // Reload board to sync clean state
                await loadBoard();

                // Celebration if moved to Done
                const targetColumn = boardData.columns.find(c => c.id === targetColumnId);
                if (targetColumn && targetColumn.title.toLowerCase().includes('done')) {
                    SoundManager.playComplete();
                    celebrateConfetti();
                }
            }
        });
        sortables.tasks.push(sortable);
    });
}

function celebrateConfetti() {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min, max) {
        return Math.random() * (max - min) + min;
    }

    const interval = setInterval(function () {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
            return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);
}

// Background management (REMOVED)

function createColumnElement(column) {
    const columnEl = document.createElement('div');
    columnEl.className = 'column';
    columnEl.dataset.columnId = column.id;

    columnEl.innerHTML = `
    <div class="column-header">
      <div class="column-title" onclick="openEditColumnModal('${column.id}')">
        ${escapeHtml(column.title)}
        <span class="task-count">${column.tasks.length}${column.wipLimit > 0 ? '/' + column.wipLimit : ''}</span>
      </div>
    </div>
    <div class="column-tasks" id="tasks-${column.id}"></div>
    <div class="quick-add-container">
      <form class="quick-add-form" onsubmit="handleQuickTaskSubmit(event, '${column.id}')">
        <input type="text" class="quick-add-input" placeholder="+ Добавить задачу..." onfocus="this.parentElement.classList.add('active')" onblur="setTimeout(() => !this.value && this.parentElement.classList.remove('active'), 200)">
        <div class="quick-add-actions">
          <button type="submit" class="btn-primary" style="padding: 6px 12px; font-size: 12px; width: auto;">Добавить</button>
          <button type="button" class="btn-text" style="padding: 6px 12px; font-size: 12px;" onclick="this.closest('.quick-add-form').classList.remove('active')">Отмена</button>
        </div>
      </form>
    </div>
  `;

    const tasksContainer = columnEl.querySelector('.column-tasks');
    column.tasks.forEach(task => {
        const taskEl = createTaskElement(task, column.id);
        tasksContainer.appendChild(taskEl);
    });

    return columnEl;
}

function createTaskElement(task, columnId) {
    const taskEl = document.createElement('div');
    taskEl.className = 'task-card';
    taskEl.dataset.taskId = task.id;
    taskEl.dataset.priority = task.priority;

    // Cycle Time Calculation
    let cycleTimeHtml = '';
    if (task.startedAt) {
        const start = new Date(task.startedAt);
        const end = task.completedAt ? new Date(task.completedAt) : new Date();
        const diffDays = Math.floor((end - start) / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor((end - start) / (1000 * 60 * 60));

        const timeText = diffDays > 0 ? `${diffDays}д` : `${diffHours}ч`;
        cycleTimeHtml = `<span class="cycle-time" title="Время в работе">⏱️ ${timeText}</span>`;
    }

    // Calculate subtask progress
    const totalSubtasks = task.subtasks.length;
    const completedSubtasks = task.subtasks.filter(st => st.completed).length;
    const progressPercent = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;

    // Check if deadline is urgent (today or tomorrow)
    const deadlineDate = task.deadline ? new Date(task.deadline) : null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let isUrgent = false;
    if (deadlineDate) {
        const d = new Date(deadlineDate);
        d.setHours(0, 0, 0, 0);
        isUrgent = d <= tomorrow;
    }

    const isOverdue = task.deadline && new Date(task.deadline) < new Date();

    // Render markdown description
    const descriptionHtml = task.description ? marked.parse(task.description) : '';

    const column = boardData.columns.find(c => c.id === columnId);
    const isDoneColumn = column && column.title.toLowerCase().includes('done');

    if (isUrgent && !isOverdue && !isDoneColumn) {
        taskEl.classList.add('urgent');
    }

    // Calculate dependencies
    let depHtml = '<div class="dep-badges">';
    if (task.links && task.links.blockedBy && task.links.blockedBy.length > 0) {
        depHtml += `<span class="dep-badge is-blocked" title="Блокируется другими задачами">🔗 Блокирован</span>`;
    }
    const blockingCount = boardData.columns.reduce((count, col) => {
        return count + col.tasks.filter(t => t.links && t.links.blockedBy && t.links.blockedBy.includes(task.id)).length;
    }, 0);
    if (blockingCount > 0) {
        depHtml += `<span class="dep-badge is-blocking" title="Блокирует другие задачи">⛓️ Блокирует (${blockingCount})</span>`;
    }
    depHtml += '</div>';

    taskEl.innerHTML = `
    <div class="task-header">
      <div class="task-title" onclick="openEditTaskModal('${task.id}', '${columnId}')">${escapeHtml(task.title)}</div>
      <div style="flex-shrink: 0; display: flex; gap: 8px; align-items: center;">
        ${task.recurring && task.recurring.frequency !== 'none' ? `<span class="recurring-icon" title="Повторяющаяся: ${task.recurring.frequency}">🔁</span>` : ''}
        ${cycleTimeHtml}
        <button class="btn-icon-small" onclick="event.stopPropagation(); openHistoryModal('${task.id}')" title="История действий">🕒</button>
      </div>
    </div>
    ${task.description ? `<div class="task-description-preview">${descriptionHtml}</div>` : ''}
    ${depHtml}
    ${totalSubtasks > 0 ? `
      <div class="progress-container">
        <div class="progress-bar" style="width: ${progressPercent}%"></div>
      </div>
    ` : ''}
    ${task.tags && task.tags.length > 0 ? `
      <div class="task-tags" style="margin-top: 10px;">
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

    taskEl.addEventListener('click', (e) => {
        if (e.target.closest('.btn-icon-small') || e.target.closest('.recurring-icon')) return;
        openEditTaskModal(task.id, columnId);
    });
    return taskEl;
}

async function handleQuickTaskSubmit(e, columnId) {
    e.preventDefault();
    const input = e.target.querySelector('.quick-add-input');
    const title = input.value.trim();
    if (!title) return;

    try {
        const response = await fetch(`/api/columns/${columnId}/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title,
                description: '',
                priority: 'medium',
                tags: [],
                subtasks: []
            })
        });

        if (response.ok) {
            input.value = '';
            e.target.classList.remove('active');
            loadBoard();
        }
    } catch (error) {
        console.error('Quick add failed:', error);
    }
}

// Maintenance (Backup/Restore)
function openSettingsModal() {
    document.getElementById('settings-modal').classList.remove('hidden');
}

function closeSettingsModal() {
    document.getElementById('settings-modal').classList.add('hidden');
}

async function exportBoard() {
    window.location.href = '/api/backup/export';
}

async function importBoard(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!confirm('Внимание! Все текущие данные доски будут заменены данными из файла. Продолжить?')) {
        e.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const board = JSON.parse(event.target.result);
            const response = await fetch('/api/backup/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(board)
            });

            if (response.ok) {
                alert('Данные успешно восстановлены!');
                location.reload();
            } else {
                const err = await response.json();
                alert('Ошибка: ' + err.error);
            }
        } catch (err) {
            alert('Не удалось прочитать файл. Убедитесь, что это корректный JSON.');
        }
    };
    reader.readAsText(file);
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
    document.getElementById('column-wip').value = column.wipLimit || 0;
    document.getElementById('delete-column-btn').classList.remove('hidden');
    document.getElementById('column-modal').classList.remove('hidden');
}

function closeColumnModal() {
    document.getElementById('column-modal').classList.add('hidden');
}

async function handleColumnSubmit(e) {
    e.preventDefault();
    const title = document.getElementById('column-title').value;
    const wipLimit = document.getElementById('column-wip').value;

    if (currentEditingColumn) {
        // Edit existing column
        await fetch(`/api/columns/${currentEditingColumn}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, wipLimit })
        });
    } else {
        // Create new column
        await fetch('/api/columns', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, wipLimit })
        });
    }

    closeColumnModal();
    loadBoard();
}

// History Modal
async function openHistoryModal(taskId) {
    const response = await fetch(`/api/tasks/${taskId}/history`);
    const history = await response.json();

    document.getElementById('history-list').innerHTML = history.map(item => `
        <div class="history-item">
            <div class="history-time">${new Date(item.timestamp).toLocaleString('ru-RU')}</div>
            <div class="history-text">${getHistoryText(item)}</div>
        </div>
    `).join('') || '<p class="hint">Истории пока нет</p>';

    document.getElementById('history-modal').classList.remove('hidden');
}

function getHistoryText(item) {
    switch (item.type) {
        case 'create': return `Задача создана в колонке <b>${item.columnTitle}</b>`;
        case 'move': return `Перемещена из <b>${item.from}</b> в <b>${item.to}</b>`;
        case 'archive': return `Архивирована`;
        case 'restore': return `Восстановлена`;
        case 'subtask_done': return `Подзадача <b>"${item.subtaskTitle}"</b> выполнена`;
        case 'subtask_undone': return `Подзадача <b>"${item.subtaskTitle}"</b> возвращена в работу`;
        case 'subtask_rename': return `Подзадача переименована из <b>"${item.from}"</b> в <b>"${item.to}"</b>`;
        default: return 'Действие выполнено';
    }
}

function closeHistoryModal() {
    document.getElementById('history-modal').classList.add('hidden');
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
    currentTaskLinks = [];

    document.getElementById('modal-title').textContent = 'Создать задачу';
    document.getElementById('task-title').value = '';
    document.getElementById('task-description').value = '';
    document.getElementById('task-priority').value = 'medium';
    document.getElementById('task-tags').value = '';
    document.getElementById('task-deadline').value = '';
    document.getElementById('task-recurring').value = 'none';
    document.getElementById('subtasks-container').innerHTML = '';
    document.getElementById('task-links-container').innerHTML = '';
    populateLinkSelector(null);
    document.getElementById('archive-task-btn').classList.add('hidden');
    document.getElementById('delete-task-btn').classList.add('hidden');
    document.getElementById('modal-history-btn').classList.add('hidden');
    document.getElementById('task-modal').classList.remove('hidden');
}

function openEditTaskModal(taskId, columnId) {
    const column = boardData.columns.find(c => c.id === columnId);
    const task = column.tasks.find(t => t.id === taskId);
    if (!task) return;

    currentEditingTask = taskId;
    currentEditingColumn = columnId;
    currentEditingTaskData = task;
    currentTaskLinks = task.links ? [...task.links.blockedBy] : [];

    document.getElementById('modal-title').textContent = 'Редактировать задачу';
    document.getElementById('task-title').value = task.title;
    document.getElementById('task-description').value = task.description || '';
    document.getElementById('task-priority').value = task.priority;
    document.getElementById('task-tags').value = task.tags ? task.tags.join(', ') : '';
    document.getElementById('task-deadline').value = task.deadline || '';
    document.getElementById('task-recurring').value = (task.recurring && task.recurring.frequency) || 'none';

    renderTaskLinks();
    populateLinkSelector(taskId);

    // Render subtasks
    const subtasksContainer = document.getElementById('subtasks-container');
    subtasksContainer.innerHTML = '';
    task.subtasks.forEach(subtask => {
        addSubtaskField(subtask);
    });

    document.getElementById('archive-task-btn').classList.remove('hidden');
    document.getElementById('delete-task-btn').classList.remove('hidden');
    document.getElementById('modal-history-btn').classList.remove('hidden');
    document.getElementById('task-modal').classList.remove('hidden');
}

function closeTaskModal() {
    document.getElementById('task-modal').classList.add('hidden');
    currentEditingTask = null;
    currentEditingTaskData = null;
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
        subtasks,
        recurring: {
            frequency: document.getElementById('task-recurring').value,
            lastRun: currentEditingTask ? (currentEditingTaskData?.recurring?.lastRun || null) : null
        },
        links: {
            blockedBy: currentTaskLinks
        }
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

// Archive CRUD
async function openArchiveModal() {
    const response = await fetch('/api/tasks/archived');
    const archivedTasks = await response.json();

    const archiveList = document.getElementById('archive-list');
    archiveList.innerHTML = '';

    if (archivedTasks.length === 0) {
        archiveList.innerHTML = '<p class="hint">В архиве пока пусто</p>';
    }

    archivedTasks.forEach(task => {
        const item = document.createElement('div');
        item.className = 'archive-item';
        item.innerHTML = `
            <div class="archive-info">
                <h4>${escapeHtml(task.title)}</h4>
                <p>Был в колонке: ${escapeHtml(task.columnTitle)}</p>
            </div>
            <div class="archive-actions">
                <button class="btn-text" onclick="restoreTask('${task.id}')">Вернуть</button>
                <button class="btn-icon" style="color: var(--priority-high)" onclick="deleteArchivedTask('${task.id}')">🗑️</button>
            </div>
        `;
        archiveList.appendChild(item);
    });

    document.getElementById('archive-modal').classList.remove('hidden');
}

function closeArchiveModal() {
    document.getElementById('archive-modal').classList.add('hidden');
}

async function archiveTask() {
    if (!currentEditingTask) return;

    try {
        const response = await fetch(`/api/tasks/${currentEditingTask}/archive`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ archived: true })
        });

        if (!response.ok) throw new Error('Failed to archive task');

        closeTaskModal();
        await loadBoard();
    } catch (err) {
        console.error('Archive error:', err);
        alert('Ошибка при архивации задачи');
    }
}

async function restoreTask(taskId) {
    try {
        const response = await fetch(`/api/tasks/${taskId}/archive`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ archived: false })
        });

        if (!response.ok) throw new Error('Failed to restore task');

        openArchiveModal(); // Refresh archive view
        await loadBoard();   // Refresh main board
    } catch (err) {
        console.error('Restore error:', err);
        alert('Ошибка при восстановлении задачи');
    }
}

async function deleteArchivedTask(taskId) {
    if (confirm('Удалить задачу навсегда?')) {
        await fetch(`/api/tasks/${taskId}`, {
            method: 'DELETE'
        });
        openArchiveModal();
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

// Task Links Management
function populateLinkSelector(excludeTaskId) {
    const select = document.getElementById('link-task-id');
    if (!select) return;
    select.innerHTML = '<option value="">Выберите задачу для связи...</option>';

    boardData.columns.forEach(column => {
        column.tasks.forEach(task => {
            if (task.id !== excludeTaskId && !currentTaskLinks.includes(task.id)) {
                const option = document.createElement('option');
                option.value = task.id;
                option.textContent = `[${column.title}] ${task.title}`;
                select.appendChild(option);
            }
        });
    });
}

function addTaskLink() {
    const select = document.getElementById('link-task-id');
    const taskId = select.value;
    if (!taskId) return;

    currentTaskLinks.push(taskId);
    renderTaskLinks();
    populateLinkSelector(currentEditingTask);
}

function removeTaskLink(taskId) {
    currentTaskLinks = currentTaskLinks.filter(id => id !== taskId);
    renderTaskLinks();
    populateLinkSelector(currentEditingTask);
}

function renderTaskLinks() {
    const container = document.getElementById('task-links-container');
    if (!container) return;
    container.innerHTML = '';

    currentTaskLinks.forEach(linkId => {
        // Find task title
        let taskTitle = 'Неизвестная задача';
        boardData.columns.forEach(col => {
            const t = col.tasks.find(tk => tk.id === linkId);
            if (t) taskTitle = t.title;
        });

        const item = document.createElement('div');
        item.className = 'task-link-item';
        item.innerHTML = `
            <span>⛓️ ${escapeHtml(taskTitle)}</span>
            <span class="remove-link" onclick="removeTaskLink('${linkId}')">×</span>
        `;
        container.appendChild(item);
    });
}

// Initialize on load
document.addEventListener('DOMContentLoaded', init);
