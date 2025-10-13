#!/bin/bash

# Скрипт установки KanBe для Raspberry Pi 3 с Debian
# Этот скриппт установит все необходимые зависимости и настроит приложение

set -e  # Остановить выполнение при ошибке

echo "=== Установка KanBe для Raspberry Pi 3 ==="
echo ""

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

# Обновление системы
echo "Обновление системы..."
sudo apt update
sudo apt upgrade -y

# Установка необходимых пакетов
echo "Установка системных зависимостей..."
sudo apt install -y curl wget git build-essential python3-dev sqlite3 nginx

# Установка Node.js 18
echo "Установка Node.js 18..."

# Проверка существующей установки
if command -v node &> /dev/null && command -v npm &> /dev/null && node --version &> /dev/null && npm --version &> /dev/null; then
    echo "Node.js уже установлен и работает корректно:"
    echo "Node.js версия: $(node --version)"
    echo "NPM версия: $(npm --version)"
else
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
    sudo npm install -g pm2
else
    echo "Ошибка: npm не найден. Установка PM2 через apt..."
    sudo apt-get install -y pm2
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
    sudo useradd -m -s /bin/bash $APP_USER
    echo "Пользователь $APP_USER создан"
fi

# Клонирование или использование текущего проекта
if [ ! -d "package.json" ]; then
    echo "Клонирование репозитория..."
    # Здесь можно добавить git clone если нужно
    echo "Пожалуйста, убедитесь что файлы проекта находятся в текущей директории"
    exit 1
fi

# Установка зависимостей проекта
echo "Установка зависимостей проекта..."
npm install

# Сборка better-sqlite3 для ARM
echo "Сборка better-sqlite3 для ARM архитектуры..."
npm rebuild better-sqlite3

# Создание директории для базы данных
mkdir -p data

# Создание .env файла
echo "Создание файла конфигурации..."
cat > .env << EOF
NODE_ENV=production
PORT=$API_PORT
SESSION_SECRET=$SESSION_SECRET
DATABASE_URL=./data/kanbe.db
DEV_PORT=$DEV_PORT
EOF

echo "Файл .env создан"

# Применение миграций базы данных
echo "Настройка базы данных..."
npm run db:push

# Сборка приложения
echo "Сборка приложения..."
npm run build

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
cat > create_admin.js << 'EOF'
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './shared/schema.js';
import bcrypt from 'bcrypt';

const sqlite = new Database('./data/kanbe.db');
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

        console.log(`Пользователь ${email} создан успешно`);
        console.log(`ID пользователя: ${user.id}`);
    } catch (error) {
        console.error('Ошибка создания пользователя:', error);
    } finally {
        sqlite.close();
    }
}

createAdmin();
EOF

# Запуск скрипта создания пользователя
echo "Создание администратора..."
node create_admin.js "$ADMIN_EMAIL" "$ADMIN_PASSWORD"

# Очистка
rm create_admin.js

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