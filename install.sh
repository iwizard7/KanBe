#!/bin/bash

# Скрипт установки KanBe для Raspberry Pi 3 с Debian
# Этот скрипт установит все необходимые зависимости и настроит приложение

echo "=== Установка KanBe для Raspberry Pi 3 ==="
echo ""

# Сохранение текущей директории
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
PROJECT_DIR="$(pwd)"
echo "Директория скрипта: $SCRIPT_DIR"
echo "Проектная директория: $PROJECT_DIR"

# Функция для выполнения команд с sudo без потери директории
sudo_exec() {
    local cmd="$*"
    echo "Выполнение: sudo $cmd"
    sudo bash -c "cd '$PROJECT_DIR' && $cmd"
}

# Функция для безопасного выполнения команд
safe_exec() {
    local cmd="$*"
    echo "Выполнение: $cmd"
    if ! eval "$cmd"; then
        echo "Ошибка выполнения команды: $cmd"
        return 1
    fi
}

# Проверка ОС
if [[ "$OSTYPE" != "linux-gnu"* ]]; then
    echo "Этот скрипт предназначен для Linux (Debian на Raspberry Pi)"
    echo "Текущая ОС: $OSTYPE"
    exit 1
fi

# Проверка архитектуры
ARCH=$(uname -m)
if [[ "$ARCH" != "armv7l" && "$ARCH" != "aarch64" ]]; then
    echo "Предупреждение: Этот скрипт оптимизирован для ARM архитектуры (Raspberry Pi)"
    echo "Текущая архитектура: $ARCH"
fi

# Функция проверки свободного места
check_disk_space() {
    local min_space_mb=500  # Минимально необходимое место в МБ

    echo "Проверка свободного места на диске..."

    # Проверяем место в корневом разделе (постоянное хранилище)
    local root_space=$(df / | awk 'NR==2 {print int($4/1024)}')
    local root_device=$(df / | awk 'NR==2 {print $1}')
    echo "Основное хранилище ($root_device): ${root_space}MB свободно"

    # Проверяем место в /var/tmp (если существует)
    if [ -d "/var/tmp" ]; then
        local var_space=$(df /var/tmp | awk 'NR==2 {print int($4/1024)}')
        echo "Хранилище /var/tmp: ${var_space}MB свободно"
    fi

    # Проверяем место в домашней директории
    local home_space=$(df "$HOME" | awk 'NR==2 {print int($4/1024)}')
    echo "Домашняя директория: ${home_space}MB свободно"

    # Используем наибольшее значение среди постоянных хранилищ
    local available_space=$root_space
    if [ -d "/var/tmp" ] && [ "$var_space" -gt "$available_space" ]; then
        available_space=$var_space
    fi
    if [ "$home_space" -gt "$available_space" ]; then
        available_space=$home_space
    fi

    echo "Используется наибольшее значение: ${available_space}MB"

    if [ "$available_space" -lt "$min_space_mb" ]; then
        echo "⚠️  Недостаточно места в постоянном хранилище (${available_space}MB < ${min_space_mb}MB)"

        # Попытка очистки временных файлов в постоянном хранилище
        echo "🧹 Попытка очистки временных файлов..."

        # Очищаем /var/tmp если существует
        if [ -d "/var/tmp" ]; then
            sudo find /var/tmp -type f -mtime +1 -delete 2>/dev/null || true
            sudo find /var/tmp -type d -mtime +1 -exec rm -rf {} + 2>/dev/null || true
        fi

        # Очищаем кэш в домашней директории
        if [ -d "$HOME/.npm" ]; then
            npm cache clean --force 2>/dev/null || true
        fi

        # Очищаем системные кэши
        sudo apt-get clean 2>/dev/null || true
        sudo apt-get autoclean 2>/dev/null || true

        # Проверка после очистки
        root_space=$(df / | awk 'NR==2 {print int($4/1024)}')
        available_space=$root_space

        if [ -d "/var/tmp" ]; then
            var_space=$(df /var/tmp | awk 'NR==2 {print int($4/1024)}')
            if [ "$var_space" -gt "$available_space" ]; then
                available_space=$var_space
            fi
        fi

        echo "Свободное место после очистки: ${available_space}MB"

        if [ "$available_space" -lt "$min_space_mb" ]; then
            echo "❌ Критически недостаточно места в постоянном хранилище"
            echo ""
            echo "🔧 Рекомендации по освобождению места:"
            echo ""
            echo "1. Очистите кэш пакетного менеджера:"
            echo "   sudo apt-get clean && sudo apt-get autoclean"
            echo "   sudo apt-get autoremove"
            echo ""
            echo "2. Очистите npm кэш:"
            echo "   npm cache clean --force"
            echo ""
            echo "3. Удалите ненужные файлы из /var/tmp:"
            echo "   sudo find /var/tmp -type f -mtime +1 -delete"
            echo ""
            echo "4. Проверьте использование диска:"
            echo "   df -h"
            echo "   du -sh /var/* /home/* 2>/dev/null | sort -hr | head -10"
            echo ""
            echo "5. Увеличьте размер раздела (если возможно):"
            echo "   sudo raspi-config (Advanced Options -> Expand Filesystem)"
            echo ""
            echo "Требуется минимум ${min_space_mb}MB свободного места в постоянном хранилище"
            exit 1
        fi
    fi

    echo "✅ Дисковое пространство проверено (${available_space}MB доступно)"
}

# Запрос директории установки
echo ""
echo "=== Выбор директории установки ==="
echo "📁 Текущая директория: $(pwd)"
echo ""
read -p "Установить KanBe в текущую директорию? (y/n): " USE_CURRENT_DIR

if [[ $USE_CURRENT_DIR =~ ^[Nn]$ ]]; then
    read -p "Введите путь для установки KanBe: " INSTALL_DIR

    # Проверка существования директории
    if [ ! -d "$INSTALL_DIR" ]; then
        echo "Директория $INSTALL_DIR не существует."
        read -p "Создать директорию? (y/n): " CREATE_DIR
        if [[ $CREATE_DIR =~ ^[Yy]$ ]]; then
            if ! mkdir -p "$INSTALL_DIR"; then
                echo "Ошибка создания директории $INSTALL_DIR"
                exit 1
            fi
            echo "Директория $INSTALL_DIR создана"
        else
            echo "Установка отменена"
            exit 1
        fi
    fi

    # Проверка прав записи в директорию
    if [ ! -w "$INSTALL_DIR" ]; then
        echo "Ошибка: нет прав записи в директорию $INSTALL_DIR"
        exit 1
    fi

    # Переход в выбранную директорию
    if ! cd "$INSTALL_DIR"; then
        echo "Ошибка перехода в директорию $INSTALL_DIR"
        exit 1
    fi

    echo "✅ KanBe будет установлен в: $(pwd)"
else
    echo "✅ KanBe будет установлен в текущую директорию: $(pwd)"
fi

# Обновление переменных директорий
PROJECT_DIR="$(pwd)"

# Проверка дискового пространства перед установкой
check_disk_space

echo ""
echo "📋 Информация об установке:"
echo "   Директория установки: $PROJECT_DIR"
echo ""

# Обновление системы
echo "Обновление системы..."

# Предварительная очистка для освобождения места
echo "Подготовка места для обновления..."
sudo_exec "apt-get clean" || true
sudo_exec "apt-get autoclean" || true
sudo_exec "rm -rf /var/lib/apt/lists/*" || true

# Попытка обновления с обработкой ошибок места
if ! sudo_exec "apt-get update"; then
    echo "Ошибка обновления системы. Попытка очистки и повтор..."

    # Агрессивная очистка
    echo "Агрессивная очистка кэшей..."
    sudo_exec "find /var/cache -type f -delete" || true
    sudo_exec "find /var/log -name '*.log' -type f -exec truncate -s 0 {} +" || true

    # Удаление старых пакетов
    sudo_exec "apt-get autoremove -y" || true
    sudo_exec "apt-get clean" || true

    # Повторная попытка обновления
    if ! sudo_exec "apt-get update"; then
        echo "Критическая ошибка: не удается обновить систему из-за нехватки места"
        echo ""
        echo "🔧 Рекомендации по освобождению места:"
        echo ""
        echo "1. Очистите все кэши:"
        echo "   sudo apt-get clean && sudo apt-get autoclean"
        echo "   sudo rm -rf /var/lib/apt/lists/*"
        echo ""
        echo "2. Удалите ненужные пакеты:"
        echo "   sudo apt-get autoremove -y"
        echo ""
        echo "3. Очистите логи:"
        echo "   sudo find /var/log -name '*.log' -exec truncate -s 0 {} +"
        echo ""
        echo "4. Увеличьте размер раздела:"
        echo "   sudo raspi-config (Advanced Options -> Expand Filesystem)"
        echo ""
        echo "5. Если ничего не помогает, попробуйте без обновления:"
        echo "   sudo apt-get update --allow-unauthenticated"
        echo ""
        exit 1
    fi
fi

# Обновление пакетов (опционально)
read -p "Обновить все пакеты системы? (y/n): " UPDATE_PACKAGES
if [[ $UPDATE_PACKAGES =~ ^[Yy]$ ]]; then
    echo "Обновление пакетов..."
    if ! sudo_exec "apt-get upgrade -y"; then
        echo "Предупреждение: не удалось обновить некоторые пакеты"
    fi
else
    echo "Пропуск обновления пакетов"
fi

# Установка необходимых пакетов
echo "Установка системных зависимостей..."
if ! sudo_exec "apt install -y curl wget git build-essential python3-dev sqlite3 nginx"; then
    echo "Ошибка установки системных зависимостей"
    exit 1
fi

# Установка Node.js 18
echo "Установка Node.js 18..."

# Проверка существующей установки
if command -v node &> /dev/null && command -v npm &> /dev/null; then
    NODE_VERSION=$(node --version 2>/dev/null)
    NPM_VERSION=$(npm --version 2>/dev/null)
    if [[ -n "$NODE_VERSION" && -n "$NPM_VERSION" ]]; then
        echo "Node.js уже установлен и работает корректно:"
        echo "Node.js версия: $NODE_VERSION"
        echo "NPM версия: $NPM_VERSION"
        NODE_INSTALLED=true
    else
        NODE_INSTALLED=false
    fi
else
    NODE_INSTALLED=false
fi

if [ "$NODE_INSTALLED" = false ]; then
    echo "Node.js не найден. Начинаем установку..."

    # Попытка 1: Установка через nodesource
    echo "Попытка 1: Установка через NodeSource..."
    if curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -; then
        sudo apt-get update
        if sudo apt-get install -y nodejs; then
            echo "Node.js успешно установлен через NodeSource"
        fi
    fi

    # Проверка после первой попытки
    if command -v node &> /dev/null && command -v npm &> /dev/null && node --version &> /dev/null && npm --version &> /dev/null; then
        echo "Node.js версия: $(node --version)"
        echo "NPM версия: $(npm --version)"
    else
        # Попытка 2: Очистка и переустановка
        echo "Попытка 2: Очистка и переустановка..."
        sudo apt-get remove --purge -y nodejs npm node-* 2>/dev/null || true
        sudo apt-get autoremove -y
        sudo apt-get clean
        sudo apt-get update

        # Установка из официального репозитория Debian
        if sudo apt-get install -y nodejs npm; then
            echo "Node.js установлен из репозитория Debian"
        fi

        # Проверка после второй попытки
        if command -v node &> /dev/null && command -v npm &> /dev/null && node --version &> /dev/null && npm --version &> /dev/null; then
            echo "Node.js версия: $(node --version)"
            echo "NPM версия: $(npm --version)"
        else
            # Попытка 3: Ручная установка бинарных файлов
            echo "Попытка 3: Ручная установка Node.js..."
            NODE_VERSION="18.19.1"
            ARCH=$(uname -m)
            if [[ "$ARCH" == "aarch64" ]]; then
                NODE_ARCH="arm64"
            elif [[ "$ARCH" == "armv7l" ]]; then
                NODE_ARCH="armv7l"
            else
                echo "Неподдерживаемая архитектура: $ARCH"
                exit 1
            fi

            echo "Загрузка Node.js $NODE_VERSION для $NODE_ARCH..."
            if wget -q "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-${NODE_ARCH}.tar.xz"; then
                sudo mkdir -p /usr/local
                sudo tar -xf "node-v${NODE_VERSION}-linux-${NODE_ARCH}.tar.xz" -C /usr/local --strip-components=1
                rm "node-v${NODE_VERSION}-linux-${NODE_ARCH}.tar.xz"

                # Добавление в PATH если нужно
                if ! command -v node &> /dev/null; then
                    export PATH="/usr/local/bin:$PATH"
                    echo 'export PATH="/usr/local/bin:$PATH"' >> ~/.bashrc
                fi

                if command -v node &> /dev/null && command -v npm &> /dev/null && node --version &> /dev/null && npm --version &> /dev/null; then
                    echo "Node.js успешно установлен вручную"
                    echo "Node.js версия: $(node --version)"
                    echo "NPM версия: $(npm --version)"
                else
                    echo "Критическая ошибка: не удалось установить Node.js"
                    echo ""
                    echo "Попробуйте следующие команды вручную:"
                    echo "sudo apt-get remove --purge nodejs npm"
                    echo "curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -"
                    echo "sudo apt-get install -y nodejs"
                    echo ""
                    echo "Или установите Node.js вручную:"
                    echo "wget https://nodejs.org/dist/v18.19.1/node-v18.19.1-linux-arm64.tar.xz"
                    echo "sudo tar -xf node-v18.19.1-linux-arm64.tar.xz -C /usr/local --strip-components=1"
                    exit 1
                fi
            else
                echo "Ошибка загрузки Node.js"
                exit 1
            fi
        fi
    fi
fi

# Установка PM2
echo "Установка PM2..."
if command -v npm &> /dev/null; then
    if ! sudo_exec "npm install -g pm2"; then
        echo "Ошибка установки PM2 через npm. Попытка через apt..."
        if ! sudo_exec "apt-get install -y pm2"; then
            echo "Ошибка: не удалось установить PM2"
            exit 1
        fi
    fi
else
    echo "npm не найден. Установка PM2 через apt..."
    if ! sudo_exec "apt-get install -y pm2"; then
        echo "Ошибка: не удалось установить PM2"
        exit 1
    fi
fi

# Проверка наличия файлов проекта
echo "Проверка файлов проекта..."
if [ ! -f "package.json" ]; then
    echo "Файлы проекта не найдены. Клонирование репозитория..."
    if git clone https://github.com/iwizard7/KanBe.git temp_kanbe 2>/dev/null; then
        # Перемещение файлов из temp_kanbe в текущую директорию
        mv temp_kanbe/* . 2>/dev/null || true
        mv temp_kanbe/.* . 2>/dev/null || true
        rm -rf temp_kanbe
        echo "Репозиторий успешно клонирован"
    else
        echo "Ошибка клонирования репозитория"
        echo "Пожалуйста, вручную клонируйте репозиторий:"
        echo "git clone https://github.com/iwizard7/KanBe.git"
        exit 1
    fi
else
    echo "Файлы проекта найдены в текущей директории"
fi

# Проверка package.json после клонирования
if [ ! -f "package.json" ]; then
    echo "Ошибка: package.json не найден после клонирования"
    exit 1
fi

# Установка зависимостей проекта
echo "Установка зависимостей проекта..."
MAX_NPM_ATTEMPTS=4
for ((attempt=1; attempt<=MAX_NPM_ATTEMPTS; attempt++)); do
    echo "Попытка $attempt из $MAX_NPM_ATTEMPTS..."

    # Разные стратегии установки для разных попыток
    case $attempt in
        1)
            echo "Стратегия 1: Стандартная установка..."
            INSTALL_CMD="npm install --no-audit --no-fund --timeout=60000"
            ;;
        2)
            echo "Стратегия 2: С флагом legacy-peer-deps..."
            INSTALL_CMD="npm install --no-audit --no-fund --timeout=60000 --legacy-peer-deps"
            ;;
        3)
            echo "Стратегия 3: Принудительная установка проблемных пакетов..."
            INSTALL_CMD="npm install --no-audit --no-fund --timeout=60000 --force"
            ;;
        4)
            echo "Стратегия 4: Установка без проблемных пакетов сначала..."
            # Сначала устанавливаем все кроме bcrypt
            safe_exec "npm install --no-audit --no-fund --timeout=60000 --legacy-peer-deps" || true
            # Затем устанавливаем bcrypt отдельно
            INSTALL_CMD="npm install bcrypt --no-audit --no-fund --timeout=60000 --build-from-source"
            ;;
    esac

    if safe_exec "$INSTALL_CMD"; then
        echo "Зависимости успешно установлены"
        break
    else
        echo "Ошибка установки зависимостей на попытке $attempt (стратегия $attempt)"
        if [ $attempt -eq $MAX_NPM_ATTEMPTS ]; then
            echo ""
            echo "❌ Не удалось установить зависимости после $MAX_NPM_ATTEMPTS попыток"
            echo ""
            echo "🔧 Возможные решения проблемы с bcrypt:"
            echo ""
            echo "Вариант 1 - Обновить npm и node:"
            echo "  npm install -g npm@latest"
            echo "  sudo apt-get update && sudo apt-get upgrade nodejs"
            echo ""
            echo "Вариант 2 - Установить bcrypt отдельно:"
            echo "  npm uninstall bcrypt"
            echo "  npm install bcryptjs"
            echo ""
            echo "Вариант 3 - Использовать yarn вместо npm:"
            echo "  npm install -g yarn"
            echo "  yarn install"
            echo ""
            echo "Вариант 4 - Собрать нативные модули вручную:"
            echo "  sudo apt-get install build-essential python3-dev"
            echo "  npm install --build-from-source"
            echo ""
            echo "Вариант 5 - Использовать Docker контейнер:"
            echo "  docker run -it node:18 bash"
            echo ""
            echo "🚨 Рекомендуемая команда для ручного исправления:"
            echo "npm config set python python3"
            echo "npm install bcrypt --build-from-source --no-optional"
            exit 1
        fi

        # Специальная обработка для попытки 4
        if [ $attempt -eq 3 ]; then
            echo "⏳ Подготовка к финальной попытке..."
            echo "Очистка node_modules и package-lock.json..."
            rm -rf node_modules package-lock.json 2>/dev/null || true
            echo "Повторная попытка через 3 секунды..."
            sleep 3
        else
            echo "Повторная попытка через 5 секунд..."
            sleep 5
        fi

        # Очистка npm кэша перед следующей попыткой
        if [ $attempt -lt $MAX_NPM_ATTEMPTS ]; then
            echo "🧹 Очистка npm кэша..."
            npm cache clean --force 2>/dev/null || true
        fi
    fi
done

# Сборка better-sqlite3 для ARM
echo "Сборка better-sqlite3 для ARM архитектуры..."
if ! safe_exec "npm rebuild better-sqlite3"; then
    echo "Предупреждение: не удалось пересобрать better-sqlite3"
fi

# Создание директории для базы данных
echo "Создание директории для базы данных..."
if ! mkdir -p data; then
    echo "Ошибка создания директории data"
    exit 1
fi

# Запрос данных для настройки
echo ""
echo "=== Настройка приложения ==="

read -p "Введите порт для API сервера (по умолчанию 5000): " API_PORT
API_PORT=${API_PORT:-5000}

read -p "Введите порт для фронтенда в режиме разработки (по умолчанию 3000): " DEV_PORT
DEV_PORT=${DEV_PORT:-3000}

read -p "Введите секрет для сессий (оставьте пустым для генерации): " SESSION_SECRET
if [ -z "$SESSION_SECRET" ]; then
    SESSION_SECRET=$(openssl rand -hex 32)
    echo "Сгенерирован секрет сессии: $SESSION_SECRET"
fi

# Создание пользователя приложения (опционально)
read -p "Создать системного пользователя для приложения? (y/n): " CREATE_USER
if [[ $CREATE_USER =~ ^[Yy]$ ]]; then
    read -p "Имя пользователя: " APP_USER
    if [ -n "$APP_USER" ]; then
        if ! sudo_exec "useradd -m -s /bin/bash $APP_USER"; then
            echo "Предупреждение: не удалось создать пользователя $APP_USER"
            APP_USER=""
        else
            echo "Пользователь $APP_USER создан"
        fi
    fi
fi

# Создание .env файла
echo "Создание файла конфигурации..."
cat > .env << EOF
NODE_ENV=production
PORT=$API_PORT
SESSION_SECRET=$SESSION_SECRET
DATABASE_URL=./data/kanbe.db
DEV_PORT=$DEV_PORT
EOF

if [ ! -f ".env" ]; then
    echo "Ошибка создания файла .env"
    exit 1
fi
echo "Файл .env создан"

# Применение миграций базы данных
echo "Настройка базы данных..."
if ! safe_exec "npm run db:push"; then
    echo "Предупреждение: не удалось применить миграции базы данных"
fi

# Сборка приложения
echo "Сборка приложения..."
if ! safe_exec "npm run build"; then
    echo "Ошибка сборки приложения"
    exit 1
fi

# Настройка nginx (опционально)
read -p "Настроить nginx как reverse proxy? (y/n): " SETUP_NGINX
if [[ $SETUP_NGINX =~ ^[Yy]$ ]]; then
    echo "Настройка nginx..."

    # Создание конфигурации nginx
    sudo tee /etc/nginx/sites-available/kanbe > /dev/null <<EOF
server {
    listen 80;
    server_name localhost;

    # API прокси
    location /api {
        proxy_pass http://localhost:$API_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Фронтенд (статические файлы)
    location / {
        proxy_pass http://localhost:$DEV_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

    # Включение сайта
    sudo ln -sf /etc/nginx/sites-available/kanbe /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default

    # Тест конфигурации
    sudo nginx -t

    echo "nginx настроен. Перезапустите nginx: sudo systemctl restart nginx"
fi

# Создание первого пользователя
echo ""
echo "=== Создание первого пользователя ==="
read -p "Email для первого пользователя: " ADMIN_EMAIL
read -s -p "Пароль для первого пользователя: " ADMIN_PASSWORD
echo ""

# Создание временного скрипта для создания пользователя
cat > create_admin.js << EOF
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '${PROJECT_DIR}/shared/schema.js';
import bcrypt from 'bcrypt';

console.log('Рабочая директория:', process.cwd());
console.log('Путь к схеме:', '${PROJECT_DIR}/shared/schema.js');

const sqlite = new Database('${PROJECT_DIR}/data/kanbe.db');
const db = drizzle({ client: sqlite, schema });

async function createAdmin() {
    const email = process.argv[2];
    const password = process.argv[3];

    if (!email || !password) {
        console.error('Использование: node create_admin.js <email> <password>');
        process.exit(1);
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const [user] = await db
            .insert(schema.users)
            .values({
                email,
                password: hashedPassword,
                firstName: 'Admin',
                lastName: 'User',
            })
            .returning();

        console.log(\`Пользователь \${email} создан успешно\`);
        console.log(\`ID пользователя: \${user.id}\`);
    } catch (error) {
        console.error('Ошибка создания пользователя:', error);
        console.error('Проверьте путь к файлу схемы и базе данных');
    } finally {
        sqlite.close();
    }
}

createAdmin();
EOF

# Запуск скрипта создания пользователя
echo "Создание администратора..."
if [ -f "create_admin.js" ]; then
    node create_admin.js "$ADMIN_EMAIL" "$ADMIN_PASSWORD"
else
    echo "Ошибка: файл create_admin.js не создан"
fi

# Очистка
rm -f create_admin.js

# Настройка автозапуска
echo "Настройка автозапуска..."

if [[ $CREATE_USER =~ ^[Yy]$ && -n "$APP_USER" ]]; then
    # Изменение владельца файлов
    sudo chown -R $APP_USER:$APP_USER .

    # Создание сервиса systemd
    sudo tee /etc/systemd/system/kanbe.service > /dev/null <<EOF
[Unit]
Description=KanBe Application
After=network.target

[Service]
Type=simple
User=$APP_USER
WorkingDirectory=$(pwd)
ExecStart=$(which pm2) start dist/index.js --name kanbe
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

    sudo systemctl daemon-reload
    sudo systemctl enable kanbe
    echo "Сервис kanbe создан и включен"
    echo "Запуск: sudo systemctl start kanbe"
    echo "Статус: sudo systemctl status kanbe"
else
    echo "Для автозапуска используйте PM2:"
    echo "pm2 start dist/index.js --name kanbe"
    echo "pm2 save"
    echo "pm2 startup"
fi

echo ""
echo "=== Установка завершена! ==="
echo ""
echo "Приложение установлено и настроено."
echo "База данных: ./data/kanbe.db"
echo "API порт: $API_PORT"
echo "Фронтенд порт (разработка): $DEV_PORT"
echo "Админ: $ADMIN_EMAIL"
echo ""
echo "Для запуска в режиме разработки:"
echo "  API сервер: npm run dev (порт $API_PORT)"
echo "  Фронтенд: npm run dev:client (порт $DEV_PORT)"
echo ""
echo "Для запуска в продакшене: npm run start"
echo ""
echo "Если настроен nginx, приложение доступно на http://localhost"
echo "Иначе:"
echo "  API: http://localhost:$API_PORT"
echo "  Фронтенд: http://localhost:$DEV_PORT"
echo ""
echo "Для управления через PM2:"
echo "pm2 list"
echo "pm2 logs kanbe"
echo "pm2 restart kanbe"
