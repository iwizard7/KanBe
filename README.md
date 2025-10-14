# KanBe - Кроссплатформенная Канбан доска

Современная Kanban-доска с полной поддержкой macOS (Apple Silicon) и Raspberry Pi.

## 🌟 Особенности

- ✅ Полная поддержка macOS с процессорами M-серии (Apple Silicon)
- ✅ Оптимизировано для Raspberry Pi 3/4/5 с ARM архитектурой
- ✅ Локальная аутентификация (email + пароль)
- ✅ SQLite база данных (низкое потребление ресурсов)
- ✅ Drag & drop интерфейс
- ✅ Цветные метки для задач
- ✅ Адаптивный дизайн для всех устройств
- ✅ Автоматическое определение платформы и архитектуры

## 🚀 Быстрая установка

### Автоматическая установка (рекомендуется)

#### Универсальный установщик (автоматически определяет платформу)
```bash
# Скачайте и запустите универсальный скрипт
curl -fsSL https://raw.githubusercontent.com/iwizard7/KanBe/main/install.sh -o install.sh
chmod +x install.sh
./install.sh
```

#### Для Raspberry Pi / Linux (альтернативный способ)
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
   - Проверит и установит системные зависимости
   - Установит Node.js 18 LTS оптимальным способом для вашей системы
   - Соберет нативные модули для вашей архитектуры
   - Настроит базу данных
   - Создаст конфигурацию
   - Создаст первого пользователя

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
