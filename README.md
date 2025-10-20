# <img src="client/src/assets/logo.png" alt="KanBe Logo" width="150" height="150" />
KanBe - Кроссплатформенная Канбан доска

Современная Kanban-доска с полной поддержкой macOS (Apple Silicon), Linux и Raspberry Pi. **Оптимизирована для высокой производительности** даже на устройствах с ограниченными ресурсами.

## 🌟 Особенности

### 🎯 Основные возможности
- ✅ **Полная поддержка macOS** с процессорами M-серии (Apple Silicon)
- ✅ **Оптимизировано для Raspberry Pi** 3/4/5 с ARM архитектурой
- ✅ **Тёмная тема** с автоматическим переключением
- ✅ **Расширенные возможности задач**: приоритеты, дедлайны, подзадачи, зависимости
- ✅ **Системные сервисы**: systemd (Linux) и launchd (macOS)
- ✅ **Локальная аутентификация** (email + пароль)
- ✅ **SQLite база данных** с оптимизациями для SD-карт

### 🚀 Производительность
- ✅ **React.memo** для тяжелых компонентов (предотвращает лишние ререндеры)
- ✅ **Виртуализация списков** (react-window) для больших досок
- ✅ **Умное кеширование** React Query (5 мин stale, 10 мин cache)
- ✅ **Пагинация API** с фильтрами и поиском
- ✅ **Оптимизированная база данных** (WAL, memory-mapped I/O)
- ✅ **Автоматическое определение платформы** и применение оптимизаций

### 🎨 Интерфейс
- ✅ **Drag & drop интерфейс** с поддержкой межколонкового перемещения
- ✅ **Цветные метки и приоритеты** для задач
- ✅ **Календарь дедлайнов** с визуальной индикацией
- ✅ **Подзадачи** для декомпозиции сложных задач
- ✅ **Зависимости задач** для управления последовательностью
- ✅ **Адаптивный дизайн** для всех устройств
- ✅ **Виртуальная прокрутка** для списков с 1000+ элементов

## 🚀 Быстрая установка

### Автоматическая установка (рекомендуется)

#### Универсальный установщик (автоматически определяет платформу)
```bash
# Скачайте и запустите универсальный скрипт
curl -fsSL https://raw.githubusercontent.com/iwizard7/KanBe/main/install.sh -o install.sh
chmod +x install.sh
./install.sh
```

#### Для Raspberry Pi (специальная оптимизация)
```bash
# Полностью автоматическая установка с оптимизациями для Raspberry Pi
npm run setup:raspberry-pi
```

#### Для macOS / Linux (альтернативный способ)
```bash
# Полностью автоматическая установка без скачивания файла
curl -fsSL https://raw.githubusercontent.com/iwizard7/KanBe/main/install.sh | bash
```

### Ручная установка

#### Для всех платформ (macOS, Linux, Raspberry Pi)

1. **Скачайте проект:**
   ```bash
   git clone https://github.com/iwizard7/KanBe.git
   cd KanBe
   ```

2. **Запустите универсальный скрипт установки:**
   ```bash
   chmod +x install.sh
   ./install.sh
   ```

   Универсальный скрипт автоматически:
   - Определит вашу платформу и архитектуру процессора
   - **Для Raspberry Pi:** Применит специальные оптимизации памяти и производительности
   - Проверит и установит системные зависимости
   - Установит Node.js 18 LTS оптимальным способом для вашей системы
   - Соберет нативные модули для вашей архитектуры
   - Настроит базу данных с оптимизациями для SD-карт (Raspberry Pi)
   - Создаст конфигурацию
   - Создаст первого пользователя

3. **Готово!** Приложение будет доступно на `http://localhost:3000`
  - API и Фронтенд: `http://localhost:3000`
  - **Raspberry Pi:** Автоматически оптимизировано для 256MB RAM

## Ручная установка

Если скрипт не подходит:

```bash
# Установка системных зависимостей
sudo apt update
sudo apt install -y build-essential python3-dev sqlite3 nginx

# Установка Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Установка PM2
sudo npm install -g pm2

# Установка зависимостей проекта
npm install
npm rebuild better-sqlite3

# Настройка базы данных
npm run db:push

# Сборка
npm run build

# Запуск
npm run start
```

## Использование

### Веб-интерфейс

1. Откройте браузер и перейдите на `http://localhost:3000` (режим разработки)
2. Зарегистрируйтесь или войдите с помощью email и пароля
3. Создавайте и управляйте задачами на канбан-доске
4. Используйте drag & drop для перемещения задач между колонками

### API

Базовый URL: `http://localhost:5010/api`

Все запросы требуют аутентификации через сессии.

#### Аутентификация
- `POST /api/auth/register` - Регистрация
- `POST /api/auth/login` - Вход
- `POST /api/auth/logout` - Выход

#### Задачи
- `GET /api/tasks` - Получить все задачи пользователя
- `POST /api/tasks` - Создать задачу (с поддержкой приоритетов, дедлайнов, подзадач)
- `PATCH /api/tasks/:id` - Обновить задачу
- `DELETE /api/tasks/:id` - Удалить задачу
- `PATCH /api/tasks/:id/position` - Переместить задачу

## Управление

### Системные сервисы (рекомендуется)

#### Linux / Raspberry Pi (systemd)
```bash
sudo systemctl start kanbe      # Запуск
sudo systemctl stop kanbe       # Остановка
sudo systemctl restart kanbe    # Перезапуск
sudo systemctl status kanbe     # Статус
sudo journalctl -u kanbe -f     # Логи
sudo systemctl enable kanbe     # Автозапуск при загрузке
```

#### macOS (launchd)
```bash
launchctl start com.kanbe.app     # Запуск
launchctl stop com.kanbe.app      # Остановка
launchctl list | grep kanbe       # Статус
tail -f kanbe.log                 # Логи
```

### Универсальные команды (работают на всех платформах)
```bash
npm run status    # Статус сервиса
npm run logs      # Просмотр логов
npm run restart   # Перезапуск
npm run stop      # Остановка
```

### PM2 команды (альтернативный способ)
```bash
pm2 list                    # Список процессов
pm2 logs kanbe             # Логи приложения
pm2 restart kanbe          # Перезапуск
pm2 stop kanbe             # Остановка
```

## 📦 Скрипты npm

### Основные команды
```bash
npm run dev              # Режим разработки (API + фронтенд)
npm run dev:client       # Только фронтенд (порт 3000)
npm run build            # Сборка для продакшена
npm run start            # Запуск собранного приложения
npm run check            # TypeScript проверка
```

### Специфические для платформ
```bash
# Raspberry Pi оптимизации
npm run setup:raspberry-pi     # Установка с оптимизациями для RPi
npm run build:raspberry-pi     # Сборка с ограничением памяти
npm run start:raspberry-pi     # Запуск с оптимизациями для RPi
npm run pi:config              # Проверка и применение конфигурации RPi
npm run pi:monitor             # Мониторинг производительности
npm run pi:info                # Информация о системе

# macOS сборки
npm run build:macos            # Сборка для macOS
npm run build:macos:client     # Только клиент для macOS
npm run build:macos:server     # Только сервер для macOS

# Linux сборки
npm run build:linux            # Сборка для Linux
npm run build:linux:client     # Только клиент для Linux
npm run build:linux:server     # Только сервер для Linux
```

### Управление и отладка
```bash
npm run status           # Статус сервиса
npm run logs             # Просмотр логов
npm run restart          # Перезапуск
npm run stop             # Остановка

# База данных
npm run db:push          # Применить миграции
npm run db:migrate       # Миграция базы данных
npm run db:generate      # Генерация миграций
```

## 🚀 Производительность

### Оптимизации для всех платформ

#### React оптимизации
- **React.memo** для тяжелых компонентов (TaskCard, KanbanColumn, EditTaskDialog)
- **Виртуализация списков** с react-window для больших досок (1000+ задач)
- **Ленивая загрузка** компонентов с React.lazy
- **Оптимизированные ререндеры** с правильным использованием useMemo/useCallback

#### API оптимизации
- **Пагинация** с фильтрами (статус, приоритет, поиск)
- **Умное кеширование** React Query (staleTime: 5min, gcTime: 10min)
- **Background refetch** для актуальности данных
- **Optimistic updates** для мгновенной обратной связи

#### База данных
- **SQLite WAL режим** для лучшей производительности
- **Memory-mapped I/O** для эффективного чтения
- **Оптимизированные индексы** для быстрого поиска
- **Connection pooling** и prepared statements

### Специфические оптимизации для Raspberry Pi 3

#### Node.js оптимизации
```javascript
// Ограничение памяти heap до 256MB
--max-old-space-size=256

// Оптимизация для размера кода
--optimize-for-size

// Уменьшение thread pool до 2 потоков
UV_THREADPOOL_SIZE=2
```

#### Systemd сервис
```ini
[Service]
MemoryLimit=256M          # Ограничение памяти
CPUQuota=50%              # 50% от одного ядра
Nice=10                   # Пониженный приоритет
RestartSec=15             # Увеличенное время перезапуска
```

#### SQLite для SD-карт
```sql
PRAGMA journal_mode = WAL;        -- WAL режим
PRAGMA busy_timeout = 30000;      -- Таймаут 30 сек
PRAGMA cache_size = -2000;        -- Кеш 2MB
PRAGMA synchronous = NORMAL;      -- Оптимизированная синхронизация
```

### Метрики производительности

#### На мощных устройствах (macOS M1/M2, Linux x64)
- **Время запуска:** 3-8 секунд
- **Потребление памяти:** 100-200MB
- **Одновременные пользователи:** 10-50
- **Запросы/сек:** 200-1000

#### На Raspberry Pi 3 (1GB RAM)
- **Время запуска:** 15-30 секунд
- **Потребление памяти:** 150-250MB
- **Одновременные пользователи:** 2-5
- **Запросы/сек:** 50-100

#### На Raspberry Pi 4/5 (4GB+ RAM)
- **Время запуска:** 5-15 секунд
- **Потребление памяти:** 200-400MB
- **Одновременные пользователи:** 5-15
- **Запросы/сек:** 100-300

## 🔧 Конфигурация

### Переменные окружения

Создайте файл `.env` в корне проекта:

```env
# Основные настройки
NODE_ENV=production
PORT=3000
SESSION_SECRET=your-secret-key

# База данных
DATABASE_URL=./data/kanbe.db

# Платформа (автоматически определяется)
PLATFORM=raspberry-pi  # macos | linux | raspberry-pi
CPU_ARCH=armv7         # x86_64 | arm64 | armv7

# Оптимизации для Raspberry Pi
NODE_OPTIONS=--max-old-space-size=256
UV_THREADPOOL_SIZE=2
SQLITE_BUSY_TIMEOUT=30000
```

### Дополнительная документация

- 📖 **[Полное руководство по Raspberry Pi](RASPBERRY-PI-README.md)** - детальные инструкции по оптимизации для Raspberry Pi 3/4/5
- 🔧 **[API документация](API.md)** - подробное описание всех эндпоинтов
- 🐛 **[Устранение неисправностей](TROUBLESHOOTING.md)** - решения распространенных проблем

## Системные требования

### Для macOS
- **ОС:** macOS 10.15+ (Catalina или новее)
- **Архитектура:** Apple Silicon (M1/M2/M3) или Intel x64
- **Память:** Минимум 1GB RAM (рекомендуется 2GB+)
- **Node.js:** 18+ (устанавливается автоматически)
- **Дополнительно:** Xcode Command Line Tools (устанавливается автоматически)
- **База данных:** SQLite (включается автоматически)

### Для Raspberry Pi
- **ОС:** Raspberry Pi OS (Debian-based)
- **Архитектура:** ARMv7 (Pi 3/4) или ARM64 (Pi 5)
- **Память:** Минимум 512MB RAM (рекомендуется 1GB+)
- **Node.js:** 18+ (устанавливается автоматически)
- **Дополнительно:** build-essential, python3-dev (устанавливается автоматически)
- **База данных:** SQLite (включается автоматически)

## Структура проекта

```
kanbe/
├── client/                 # React фронтенд (порт 3000 в разработке)
│   ├── src/
│   │   ├── components/     # UI компоненты (диалоги, карточки, навбар)
│   │   ├── pages/         # Страницы приложения
│   │   ├── hooks/         # React хуки
│   │   └── lib/           # Утилиты и конфигурация
├── server/                 # Express бэкенд (порт 5010)
│   ├── index.ts           # Главный серверный файл
│   ├── routes.ts          # API маршруты
│   ├── auth.ts            # Аутентификация
│   └── db.ts              # Конфигурация базы данных
├── shared/                 # Общие типы и схема БД
│   └── schema.ts          # Drizzle схема, типы, константы
├── data/                   # База данных SQLite
├── dist/                   # Собранное приложение
├── install.sh             # Универсальный установщик
├── README.md              # Документация
└── package.json           # Зависимости и скрипты
```

## Безопасность

- Пароли хэшируются с bcrypt
- Сессии защищены секретным ключом
- CORS настроен для локального доступа
- SQL-инъекции предотвращены через Drizzle ORM

## 🏗️ Архитектура

### Технологии
- **Frontend:** React 18, TypeScript, Tailwind CSS, Radix UI
- **Backend:** Node.js 18, Express, Drizzle ORM
- **Database:** SQLite с оптимизациями для SD-карт
- **Build:** Vite, esbuild
- **Deployment:** systemd, launchd, PM2

### Ключевые компоненты
- **TaskCard:** Оптимизированная карточка задачи с React.memo
- **VirtualizedTaskList:** Виртуализация больших списков (react-window)
- **KanbanColumn:** Колонка доски с drag & drop
- **EditTaskDialog:** Диалог редактирования с валидацией
- **API Routes:** REST API с пагинацией и кешированием

### Безопасность
- **Аутентификация:** bcrypt хеширование паролей
- **Сессии:** Безопасное управление сессиями
- **Валидация:** Zod схемы для всех входных данных
- **CORS:** Настроен для локального доступа
- **SQL Injection:** Предотвращено через Drizzle ORM
- **Rate Limiting:** Защита от brute force (5 попыток входа/15 мин) и DDoS (100 запросов/15 мин)

## Устранение неполадок

### Проблемы с better-sqlite3

#### Для Apple Silicon (macOS)
```bash
# Специальная сборка для ARM64
npm rebuild better-sqlite3 --build-from-source

# Если проблемы продолжаются
npm config set python python3
npm install better-sqlite3 --build-from-source
```

#### Для Raspberry Pi / Linux
```bash
npm rebuild better-sqlite3
# или
npm install better-sqlite3 --build-from-source
```

### Проблемы с установкой на macOS

#### Xcode Command Line Tools не устанавливаются
```bash
# Ручная установка
xcode-select --install

# Если команда недоступна, установите Xcode из App Store
# Или скачайте инструменты разработчика с сайта Apple
```

#### Homebrew не устанавливается
```bash
# Убедитесь что у вас macOS 10.15+
# Проверьте подключение к интернету
# Попробуйте альтернативную установку:
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

#### Node.js не устанавливается через Homebrew
```bash
# Альтернативная установка Node.js
curl -fsSL https://nodejs.org/dist/v18.19.1/node-v18.19.1-darwin-arm64.tar.gz -o node.tar.gz
sudo mkdir -p /usr/local/lib/nodejs
sudo tar -xf node.tar.gz -C /usr/local/lib/nodejs
sudo ln -sf /usr/local/lib/nodejs/node-v18.19.1-darwin-arm64/bin/* /usr/local/bin/
```

### Порт занят

#### macOS
```bash
# Проверить занятые порты
lsof -i :5000
lsof -i :3000

# Убить процесс
kill -9 <PID>
```

#### Linux/Raspberry Pi
```bash
# Проверить занятые порты
sudo netstat -tulpn | grep :5000
sudo netstat -tulpn | grep :3000
# Изменить порты в .env файле
```

### Проблемы с портами в разработке
```bash
# Если порт 3000 занят другим процессом
npm run dev:client -- --port 3001

# Или изменить в vite.config.ts
```

### Nginx не работает (только Linux)
```bash
sudo nginx -t
sudo systemctl restart nginx
```

### Проблемы с производительностью на Apple Silicon
```bash
# Включить Rosetta для лучшей совместимости (если нужно)
# Некоторые старые приложения могут требовать Rosetta 2

# Проверить архитектуру процессов
arch
file $(which node)
```

### Проблемы с памятью на Raspberry Pi
```bash
# Проверить использование памяти
free -h

# Очистить кэш
sudo apt-get clean
sudo apt-get autoclean

# Отключить ненужные сервисы
sudo systemctl disable <service-name>
```

## Лицензия

MIT License
