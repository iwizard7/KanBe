# KanBe - Канбан доска для Raspberry Pi

Легковесная Kanban-доска, оптимизированная для работы на Raspberry Pi 3 с Debian.

## Особенности

- ✅ Локальная аутентификация (email + пароль)
- ✅ SQLite база данных (низкое потребление ресурсов)
- ✅ Drag & drop интерфейс
- ✅ Цветные метки для задач
- ✅ Оптимизировано для ARM архитектуры

## Быстрая установка

1. **Скачайте проект:**
   ```bash
   git clone <repository-url>
   cd kanbe
   ```

2. **Запустите скрипт установки:**
   ```bash
   sudo ./install.sh
   ```

   Скрипт запросит:
   - Порт API сервера (по умолчанию 5000)
   - Порт фронтенда для разработки (по умолчанию 3000)
   - Секрет для сессий (автоматически генерируется)
   - Настройки nginx (опционально)
   - Данные первого пользователя (email + пароль)

3. **Готово!** Приложение будет доступно на `http://localhost`
  - API: `http://localhost:5000`
  - Фронтенд (разработка): `http://localhost:3000`

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

Базовый URL: `http://localhost:5000/api`

Все запросы требуют аутентификации через сессии.

#### Аутентификация
- `POST /api/auth/register` - Регистрация
- `POST /api/auth/login` - Вход
- `POST /api/auth/logout` - Выход

#### Задачи
- `GET /api/tasks` - Получить все задачи пользователя
- `POST /api/tasks` - Создать задачу
- `PATCH /api/tasks/:id` - Обновить задачу
- `DELETE /api/tasks/:id` - Удалить задачу
- `PATCH /api/tasks/:id/position` - Переместить задачу

## Управление

### PM2 команды
```bash
pm2 list                    # Список процессов
pm2 logs kanbe             # Логи приложения
pm2 restart kanbe          # Перезапуск
pm2 stop kanbe             # Остановка
```

### Systemd (если настроено)
```bash
sudo systemctl status kanbe
sudo systemctl restart kanbe
sudo systemctl stop kanbe
```

## Разработка

```bash
# Режим разработки (API + фронтенд одновременно)
npm run dev

# Только API сервер (порт 5000)
npm run dev

# Только фронтенд (порт 3000)
npm run dev:client

# Сборка для продакшена
npm run build

# Запуск собранного приложения
npm run start
```

## Системные требования

- **ОС:** Debian (Raspberry Pi OS)
- **Архитектура:** ARMv7 (Raspberry Pi 3/4)
- **Память:** Минимум 512MB RAM
- **Node.js:** 18+
- **База данных:** SQLite (включается автоматически)

## Структура проекта

```
kanbe/
├── client/                 # React фронтенд (порт 3000 в разработке)
├── server/                 # Express бэкенд (порт 5000)
├── shared/                 # Общие типы и схема БД
├── data/                   # База данных SQLite
├── dist/                   # Собранное приложение
├── install.sh             # Скрипт автоматической установки
├── README.md              # Документация
└── package.json
```

## Безопасность

- Пароли хэшируются с bcrypt
- Сессии защищены секретным ключом
- CORS настроен для локального доступа
- SQL-инъекции предотвращены через Drizzle ORM

## Производительность

Оптимизировано для Raspberry Pi 3:
- SQLite вместо PostgreSQL
- Минимальный набор зависимостей
- Легковесный фронтенд
- Эффективное кэширование

## Устранение неполадок

### Проблемы с better-sqlite3
```bash
npm rebuild better-sqlite3
# или
npm install better-sqlite3 --build-from-source
```

### Порт занят
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

### Nginx не работает
```bash
sudo nginx -t
sudo systemctl restart nginx
```

## Лицензия

MIT License