#!/bin/bash

# KanBe Installer
# This script installs the KanBe Kanban board on a Linux server.

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}       KanBe - Kanban Installer        ${NC}"
echo -e "${BLUE}=======================================${NC}"

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed.${NC}"
    echo "Please install Node.js first (e.g., sudo apt install nodejs)"
    exit 1
fi

# Check for npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed.${NC}"
    echo "Please install npm first (e.g., sudo apt install npm)"
    exit 1
fi

# 1. Ask for installation directory
default_dir="/opt/kanbe"
read -p "Введите путь для установки [$default_dir]: " target_dir
target_dir=${target_dir:-$default_dir}

# 2. Ask for password
while true; do
    read -s -p "Введите пароль для входа в приложение: " app_password
    echo
    read -s -p "Повторите пароль: " app_password_confirm
    echo
    if [ "$app_password" == "$app_password_confirm" ]; then
        break
    else
        echo -e "${RED}Пароли не совпадают. Попробуйте еще раз.${NC}"
    fi
done

# 3. Create directory
echo -e "${BLUE}Создание директории: $target_dir...${NC}"
sudo mkdir -p "$target_dir"
sudo chown "$USER:$USER" "$target_dir"

# 4. Copy files
echo -e "${BLUE}Копирование файлов...${NC}"
# Get the directory where the script is located
SOURCE_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

cp -r "$SOURCE_DIR/public" "$target_dir/"
cp "$SOURCE_DIR/package.json" "$target_dir/"
cp "$SOURCE_DIR/server.js" "$target_dir/"
cp "$SOURCE_DIR/README.md" "$target_dir/"

# Create .env file if it doesn't exist
if [ ! -f "$target_dir/.env" ]; then
    echo -e "${BLUE}Создание .env файла...${NC}"
    echo "PORT=3000" > "$target_dir/.env"
    echo "SESSION_SECRET=$(LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 32)" >> "$target_dir/.env"
    echo "NODE_ENV=production" >> "$target_dir/.env"
    echo "BACKUP_DAYS=7" >> "$target_dir/.env"
fi

cd "$target_dir"

# 5. Install dependencies
echo -e "${BLUE}Установка зависимостей (это может занять время)...${NC}"
npm install --production

# 6. Set up the password
echo -e "${BLUE}Настройка пароля...${NC}"
mkdir -p data
# Use a temporary node script to hash the password and create config.json
node -e "
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const password = '$app_password';
const hash = bcrypt.hashSync(password, 10);
const config = { passwordHash: hash };
fs.writeFileSync(path.join('data', 'config.json'), JSON.stringify(config, null, 2));
"

echo -e "${GREEN}=======================================${NC}"
echo -e "${GREEN}      Установка успешно завершена!      ${NC}"
echo -e "${GREEN}=======================================${NC}"
echo -e "Приложение установлено в: ${BLUE}$target_dir${NC}"
echo
echo -e "Чтобы запустить приложение:"
echo -e "  cd $target_dir"
echo -e "  node server.js"
echo
echo -e "Рекомендуется использовать PM2 для постоянной работы:"
echo -e "  sudo npm install -g pm2"
echo -e "  pm2 start server.js --name kanbe"
echo -e "  pm2 save"
echo
echo -e "Приложение будет доступно по адресу: ${BLUE}http://$(hostname -I | awk '{print $1}'):3000${NC}"
echo -e "======================================="
