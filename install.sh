#!/bin/bash

# KanBe Installer v2.1
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
# По умолчанию используем текущую рабочую директорию
default_dir=$(pwd)
echo -e "Путь по умолчанию: ${BLUE}$default_dir${NC}"
read -p "Введите путь для установки (Enter для текущей папки): " target_dir < /dev/tty
target_dir=${target_dir:-$default_dir}

# 2. Запрос пароля
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

# 3. Подготовка и получение файлов
echo -e "${BLUE}Подготовка директории: $target_dir...${NC}"
if [ ! -d "$target_dir" ]; then
    mkdir -p "$target_dir" || sudo mkdir -p "$target_dir"
fi

# Проверяем, есть ли файлы проекта локально или нужно их скачать
SOURCE_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
if [ -f "$SOURCE_DIR/package.json" ]; then
    # Локальная установка (файлы уже есть)
    if [ "$target_dir" != "$SOURCE_DIR" ]; then
        echo -e "${BLUE}Копирование файлов из $SOURCE_DIR...${NC}"
        cp -r "$SOURCE_DIR/public" "$target_dir/"
        cp "$SOURCE_DIR/package.json" "$target_dir/"
        cp "$SOURCE_DIR/server.js" "$target_dir/"
        cp "$SOURCE_DIR/README.md" "$target_dir/"
    fi
else
    # Удаленная установка (запуск через curl)
    echo -e "${BLUE}Файлы проекта не найдены локально. Загрузка из GitHub...${NC}"
    if ! command -v git &> /dev/null; then
        echo -e "${BLUE}Установка git...${NC}"
        sudo apt-get update && sudo apt-get install -y git
    fi
    
    # Клонируем в временную папку, а потом переносим содержимое в target_dir
    # Или клонируем прямо в неё, если она пуста
    if [ -z "$(ls -A "$target_dir")" ]; then
        git clone https://github.com/iwizard7/KanBe.git "$target_dir"
    else
        temp_clone_dir=$(mktemp -d)
        git clone https://github.com/iwizard7/KanBe.git "$temp_clone_dir"
        cp -r "$temp_clone_dir/." "$target_dir/"
        rm -rf "$temp_clone_dir"
    fi
fi

cd "$target_dir"

# 4. Создание .env файла
if [ ! -f ".env" ]; then
    echo -e "${BLUE}Создание .env файла...${NC}"
    echo "PORT=3000" > ".env"
    # Генерация секрета через node (кроссплатформенно)
    SESSION_SECRET=$(node -e "printf(require('crypto').randomBytes(16).toString('hex'))" 2>/dev/null || echo "kanbe-secret-$(date +%s)")
    echo "SESSION_SECRET=$SESSION_SECRET" >> ".env"
    echo "NODE_ENV=production" >> ".env"
    echo "BACKUP_DAYS=7" >> ".env"
fi

# 5. Установка зависимостей
echo -e "${BLUE}Установка зависимостей...${NC}"
npm install --production

# 6. Настройка пароля
echo -e "${BLUE}Настройка пароля...${NC}"
mkdir -p data
# Используем временный node-скрипт для хеширования пароля
node -e "
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const password = process.argv[1];
const hash = bcrypt.hashSync(password, 10);
const config = { passwordHash: hash };
fs.writeFileSync(path.join('data', 'config.json'), JSON.stringify(config, null, 2));
" "$app_password"

# 7. Определение IP адреса
if [[ "$OSTYPE" == "darwin"* ]]; then
    IP_ADDR=$(ipconfig getifaddr en0 || echo "localhost")
else
    IP_ADDR=$(hostname -I | awk '{print $1}' || echo "localhost")
fi

echo -e "${GREEN}=======================================${NC}"
echo -e "${GREEN}      Установка успешно завершена!      ${NC}"
echo -e "${GREEN}=======================================${NC}"
echo -e "Приложение установлено в: ${BLUE}$target_dir${NC}"
echo
echo -e "Чтобы запустить приложение:"
echo -e "  cd $target_dir"
echo -e "  npm start"
echo
echo -e "Приложение будет доступно по адресу: ${BLUE}http://$IP_ADDR:3000${NC}"
echo -e "======================================="
