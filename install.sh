#!/bin/bash

# KanBe Installer v2.2
# Поддерживает Linux и macOS

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}       KanBe - Kanban Installer        ${NC}"
echo -e "${BLUE}=======================================${NC}"

# Проверка Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js не установлен.${NC}"
    
    # Пытаемся предложить авто-установку для Debian/Ubuntu систем
    if command -v apt-get &> /dev/null; then
        echo -e "${BLUE}Обнаружена система на базе Debian/Ubuntu.${NC}"
        read -p "Желаете установить Node.js автоматически? (y/n): " install_node < /dev/tty
        if [[ $install_node == "y" || $install_node == "Y" ]]; then
            echo -e "${BLUE}Установка Node.js...${NC}"
            sudo apt-get update
            sudo apt-get install -y ca-certificates curl gnupg
            sudo mkdir -p /etc/apt/keyrings
            curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | sudo gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
            
            NODE_MAJOR=20
            echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_$NODE_MAJOR.x nodistro main" | sudo tee /etc/apt/sources.list.d/nodesource.list
            
            sudo apt-get update
            sudo apt-get install nodejs -y
            echo -e "${GREEN}Node.js успешно установлен!${NC}"
        else
            echo "Пожалуйста, установите Node.js вручную и запустите скрипт снова."
            exit 1
        fi
    else
        echo "Пожалуйста, установите Node.js (https://nodejs.org/) и запустите скрипт снова."
        exit 1
    fi
fi

# 1. Выбор директории
default_dir=$(pwd)
echo -e "Путь по умолчанию: ${BLUE}$default_dir${NC}"
read -p "Введите путь для установки/обновления: " target_dir < /dev/tty
target_dir=${target_dir:-$default_dir}

# Проверяем, существует ли уже установка
is_update=false
if [ -f "$target_dir/data/config.json" ] || [ -f "$target_dir/.env" ]; then
    is_update=true
    echo -e "${GREEN}Обнаружена существующая установка. Режим обновления.${NC}"
    
    # Остановка сервиса перед обновлением (если PM2 установлен и процесс запущен)
    if command -v pm2 &> /dev/null && pm2 show kanbe &> /dev/null; then
        echo -e "${BLUE}Остановка текущего процесса kanbe для безопасного обновления...${NC}"
        pm2 stop kanbe &> /dev/null || true
    fi
fi

# 2. Запрос пароля (только для новой установки)
if [ "$is_update" = false ]; then
    while true; do
        read -s -p "Введите пароль для входа в приложение: " app_password < /dev/tty
        echo
        read -s -p "Повторите пароль: " app_password_confirm < /dev/tty
        echo
        if [ "$app_password" == "$app_password_confirm" ]; then
            break
        else
            echo -e "${RED}Пароли не совпадают. Попробуйте еще раз.${NC}"
        fi
    done
fi

# 2.5. Выбор порта
# 2.5. Выбор порта
APP_PORT=3000
if [ -f "$target_dir/.env" ]; then
    EXISTING_PORT=$(grep "^PORT=" "$target_dir/.env" | cut -d '=' -f2)
    if [ ! -z "$EXISTING_PORT" ]; then
        APP_PORT=$EXISTING_PORT
    fi
fi

while true; do
    echo -e "Порт приложения по умолчанию: ${BLUE}$APP_PORT${NC}"
    read -p "Введите порт (Enter для сохранения $APP_PORT): " input_port < /dev/tty
    
    if [ ! -z "$input_port" ]; then
        APP_PORT=$input_port
    fi

    # Проверка на число
    if ! [[ "$APP_PORT" =~ ^[0-9]+$ ]]; then
        echo -e "${RED}Ошибка: Порт должен быть числом.${NC}"
        continue
    fi

    # Проверка доступности порта через Node.js
    if node -e 'require("net").createServer().listen(process.argv[1], () => { process.exit(0); }).on("error", () => { process.exit(1); })' "$APP_PORT"; then
        break
    else
        echo -e "${RED}⚠️  Порт $APP_PORT занят другим приложением!${NC}"
        read -p "Вы уверены, что хотите использовать этот порт? (y/n): " confirm_port < /dev/tty
        if [[ $confirm_port == "y" || $confirm_port == "Y" ]]; then
            break
        fi
        echo -e "Пожалуйста, выберите другой порт."
    fi
done

# 3. Подготовка и получение файлов
if [ ! -d "$target_dir" ]; then
    echo -e "${BLUE}Создание директории: $target_dir...${NC}"
    mkdir -p "$target_dir" || sudo mkdir -p "$target_dir"
fi

SOURCE_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

if [ -d "$target_dir/.git" ] && command -v git &> /dev/null; then
    # Если это git репозиторий - обновляем через pull
    echo -e "${BLUE}Обновление через git pull...${NC}"
    cd "$target_dir"
    git pull
else
    # Если файлов нет локально или обновление не через git
    if [ ! -f "$SOURCE_DIR/package.json" ] || [ "$is_update" = true ]; then
        echo -e "${BLUE}Загрузка актуальных файлов из GitHub...${NC}"
        if ! command -v git &> /dev/null; then
            echo -e "${BLUE}Установка git...${NC}"
            sudo apt-get update && sudo apt-get install -y git
        fi
        
        temp_clone_dir=$(mktemp -d)
        git clone --depth 1 https://github.com/iwizard7/KanBe.git "$temp_clone_dir"
        
        # Принудительно копируем (перезаписываем) всё кроме папок с данными
        echo -e "${BLUE}Синхронизация файлов...${NC}"

        # Функция для умного копирования с логами
        copy_file_verbose() {
            local src=$1
            local dest=$2
            local name=$3
            if [ ! -f "$dest" ]; then
                echo -e "  ✨ Новый файл: $name"
                cp -f "$src" "$dest"
            elif ! cmp -s "$src" "$dest"; then
                echo -e "  📝 Обновлен: $name"
                cp -f "$src" "$dest"
            fi
        }

        # Sync directories
        echo -e "  📂 Обновление ресурсов (public/)..."
        cp -rf "$temp_clone_dir/public/"* "$target_dir/public/"
        
        echo -e "  📂 Обновление исходного кода (src/)..."
        rm -rf "$target_dir/src"
        cp -rf "$temp_clone_dir/src" "$target_dir/"

        # Check individual files
        copy_file_verbose "$temp_clone_dir/package.json" "$target_dir/package.json" "package.json"
        copy_file_verbose "$temp_clone_dir/server.js" "$target_dir/server.js" "server.js"
        copy_file_verbose "$temp_clone_dir/reset-password.js" "$target_dir/reset-password.js" "reset-password.js"
        copy_file_verbose "$temp_clone_dir/README.md" "$target_dir/README.md" "README.md"

        chmod +x "$target_dir/reset-password.js"
        rm -rf "$temp_clone_dir"
    else
        # Локальное копирование (если запускаем из папки с исходниками вручную)
        if [ "$target_dir" != "$SOURCE_DIR" ]; then
            echo -e "${BLUE}Копирование файлов...${NC}"
            cp -rf "$SOURCE_DIR/public" "$target_dir/"
            rm -rf "$target_dir/src" # Clean old src
            cp -rf "$SOURCE_DIR/src" "$target_dir/"
            cp -f "$SOURCE_DIR/package.json" "$target_dir/"
            cp -f "$SOURCE_DIR/server.js" "$target_dir/"
            cp -f "$SOURCE_DIR/reset-password.js" "$target_dir/"
            cp -f "$SOURCE_DIR/README.md" "$target_dir/"
            chmod +x "$target_dir/reset-password.js"
        fi
    fi
fi

cd "$target_dir"

# 4. Создание .env файла (только если его нет)
# 4. Настройка .env (или обновление порта)
if [ ! -f ".env" ]; then
    echo -e "${BLUE}Создание .env файла...${NC}"
    echo "PORT=$APP_PORT" > ".env"
    SESSION_SECRET=$(node -e "process.stdout.write(require('crypto').randomBytes(16).toString('hex'))" 2>/dev/null || echo "kanbe-secret-$(date +%s)")
    echo "SESSION_SECRET=$SESSION_SECRET" >> ".env"
    echo "NODE_ENV=production" >> ".env"
    echo "BACKUP_DAYS=7" >> ".env"
else
    # Обновляем порт в существующем файле
    # Используем временный файл для безопасной замены
    grep -v "^PORT=" ".env" > ".env.tmp" || true
    echo "PORT=$APP_PORT" >> ".env.tmp"
    
    # Сохраняем остальные переменные, если они пропали (на всякий случай, хотя grep -v их оставит)
    # Но проверим, не удалили ли мы чего лишнего. grep -v просто убирает строку.
    
    mv ".env.tmp" ".env"
fi

# 5. Установка зависимостей
echo -e "${BLUE}Установка зависимостей...${NC}"
if [ "$is_update" = true ]; then
    echo -e "  🧹 Очистка старых зависимостей..."
    rm -rf node_modules
fi
npm install --omit=dev

# 6. Настройка пароля (только для новой установки)
if [ "$is_update" = false ]; then
    echo -e "${BLUE}Настройка пароля...${NC}"
    mkdir -p data
    node -e "
    const bcrypt = require('bcryptjs');
    const fs = require('fs');
    const path = require('path');
    const password = process.argv[1];
    const hash = bcrypt.hashSync(password, 10);
    const config = { passwordHash: hash };
    fs.writeFileSync(path.join('data', 'config.json'), JSON.stringify(config, null, 2));
    " "$app_password"
fi

# 6.5. Маркировка версии (для отображения даты обновления в PM2)
if [ -f "package.json" ]; then
    node -e "
    const fs = require('fs');
    try {
        const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        const now = new Date();
        // Format: YYYYMMDD-HHmm (e.g. 20260216-1755)
        const dateStr = now.toISOString().replace(/T/, '-').replace(/:/g, '').slice(0, 13);
        
        // Remove old build tag if exists and append new one
        const baseVer = pkg.version.split('-')[0];
        pkg.version = \`\${baseVer}-\${dateStr}\`;
        
        fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
        console.log('\x1b[34m  🏷️  Версия сборки: ' + pkg.version + '\x1b[0m');
    } catch (e) {}"
fi

# 7. Запуск приложения в фоне через PM2
echo -e "${BLUE}Настройка автозапуска в фоне...${NC}"

# Проверяем наличие PM2
if ! command -v pm2 &> /dev/null; then
    echo -e "${BLUE}Установка PM2 для управления фоновыми процессами...${NC}"
    sudo npm install -g pm2 || npm install -g pm2
fi

# Запуск или перезапуск приложения
# Запуск или перезапуск приложения
if pm2 show kanbe &> /dev/null; then
    echo -e "${BLUE}Перезапуск существующего процесса kanbe...${NC}"
    # Удаляем и создаем заново, чтобы подхватить новые пути и переменные
    pm2 delete kanbe
    pm2 start server.js --name kanbe
else
    echo -e "${BLUE}Запуск нового процесса kanbe...${NC}"
    pm2 start server.js --name kanbe
fi

# Сохраняем список процессов для автозапуска после перезагрузки сервера
pm2 save &> /dev/null || true

# 8. Определение IP адреса
if [[ "$OSTYPE" == "darwin"* ]]; then
    IP_ADDR=$(ipconfig getifaddr en0 || echo "localhost")
else
    IP_ADDR=$(hostname -I | awk '{print $1}' || echo "localhost")
fi

echo -e "${GREEN}=======================================${NC}"
if [ "$is_update" = true ]; then
    echo -e "${GREEN}      Приложение успешно обновлено!     ${NC}"
else
    echo -e "${GREEN}      Установка успешно завершена!      ${NC}"
fi
echo -e "${GREEN}=======================================${NC}"
echo -e "Директория: ${BLUE}$target_dir${NC}"
echo -e "Статус: ${BLUE}Приложение запущено в фоне (PM2)${NC}"
echo
echo -e "Полезные команды PM2:"
echo -e "  pm2 logs kanbe    - Просмотр логов"
echo -e "  pm2 status        - Статус процессов"
echo -e "  pm2 restart kanbe - Ручной перезапуск"
echo
echo -e "Адрес приложения: ${BLUE}http://$IP_ADDR:$APP_PORT${NC}"
echo -e "======================================="
