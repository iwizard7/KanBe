# Канбан Доска - Приложение для Управления Задачами

## Обзор
Современное веб-приложение для управления задачами с использованием канбан-методологии. Поддерживает авторизацию пользователей, создание/редактирование задач, drag-and-drop перемещение карточек и цветные метки.

## Технический Стек

### Frontend
- **React** с TypeScript
- **Wouter** для роутинга
- **TanStack Query** для управления состоянием и кэширования
- **Tailwind CSS** + **Shadcn UI** для стилизации
- **Lucide React** для иконок
- **date-fns** для форматирования дат

### Backend
- **Express.js** сервер
- **PostgreSQL** база данных (Neon)
- **Drizzle ORM** для работы с БД
- **Replit Auth** (OpenID Connect) для авторизации
- **Passport.js** для сессий

## Архитектура Данных

### Таблицы БД
1. **users** - пользователи (из Replit Auth)
   - id, email, firstName, lastName, profileImageUrl
   
2. **tasks** - задачи канбан доски
   - id, userId, title, description, status, position, tags[]
   - status: 'todo' | 'in-progress' | 'done'
   - tags: массив строк в формате "colorName:labelText"

3. **sessions** - сессии пользователей (для Replit Auth)

### Цветовая схема тегов
8 предустановленных цветов: red, orange, yellow, green, blue, purple, pink, gray

## Функциональность

### Реализовано

#### Phase 1 - Frontend ✅
✅ Авторизация через Replit Auth (UI готов)
✅ Landing page для неавторизованных пользователей
✅ Kanban board с тремя колонками
✅ Карточки задач с названием, описанием, тегами
✅ Модальные окна создания/редактирования задач
✅ Выбор цветных меток для задач (8 цветов)
✅ Responsive дизайн
✅ Navbar с user menu
✅ Beautiful loading и empty states

#### Phase 2 - Backend ✅
✅ API endpoints для CRUD операций с задачами
✅ Реализация Replit Auth на сервере
✅ PostgreSQL Database storage
✅ Миграция базы данных выполнена
✅ Защищенные маршруты с isAuthenticated middleware
✅ Валидация данных с Zod

#### Phase 3 - Integration ✅
✅ Подключение frontend к backend API
✅ Drag-and-drop перемещение карточек между колонками
✅ Error handling и unauthorized error handling
✅ Оптимистичные обновления UI с TanStack Query
✅ Все CRUD операции работают

### Известные ограничения MVP
- Drag-and-drop работает только для перемещения между колонками (не для переупорядочивания внутри колонки)
- Это упрощение позволяет избежать сложной логики переиндексации позиций

### API Endpoints

#### Авторизация
- `GET /api/login` - Начать авторизацию
- `GET /api/logout` - Выйти из аккаунта
- `GET /api/callback` - OAuth callback
- `GET /api/auth/user` - Получить текущего пользователя

#### Задачи (требуют авторизации)
- `GET /api/tasks` - Получить все задачи пользователя
- `GET /api/tasks/:id` - Получить одну задачу
- `POST /api/tasks` - Создать задачу
- `PATCH /api/tasks/:id` - Обновить задачу
- `DELETE /api/tasks/:id` - Удалить задачу
- `PATCH /api/tasks/:id/position` - Обновить позицию задачи (drag & drop)

## Дизайн

Следует принципам из `design_guidelines.md`:
- **Стиль**: Modern productivity tool (Linear + Trello)
- **Цвета**: Темная тема по умолчанию, blue primary accent
- **Типографика**: Inter font family
- **Компоненты**: Shadcn UI с кастомизацией
- **Интерактивность**: Плавные анимации, hover/active states
- **Адаптивность**: Mobile-first подход

## Команды для разработки

```bash
# Установка зависимостей
npm install

# Запуск dev сервера
npm run dev

# Database миграция
npm run db:push

# Production build
npm run build
```

## Структура Проекта

```
/client              # Frontend (React)
  /src
    /components      # UI компоненты
    /pages          # Страницы
    /hooks          # React хуки
    /lib            # Утилиты
/server             # Backend (Express)
  routes.ts         # API маршруты
  storage.ts        # Database storage
  db.ts            # DB подключение
  replitAuth.ts    # Аутентификация
/shared             # Общие типы и схемы
  schema.ts         # Drizzle схемы
```

## Особенности для Raspberry Pi 3

- Легковесный Express сервер
- Оптимизированные запросы к БД
- Минимальные анимации для производительности
- Эффективное использование памяти
- PostgreSQL вместо тяжелых in-memory решений

## Автор
Создано с использованием Replit Agent
