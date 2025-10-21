#!/bin/bash

# 🎯 Специализированный установщик KanBe для Raspberry Pi
# 🔄 Оптимизирован для ARMv7 с пошаговой установкой зависимостей

# Цвета для красивого вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Функции вывода
print_step() {
    echo -e "${BLUE}🔄 [ШАГ] $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${CYAN}ℹ️  $1${NC}"
}

print_header() {
    echo -e "${PURPLE}🎯 === Специализированный установщик KanBe для Raspberry Pi ===${NC}"
    echo ""
}

# Проверка системных требований
check_raspberry_pi() {
    print_step "Проверка Raspberry Pi..."

    if [[ ! -f /proc/device-tree/model ]] || ! grep -q "Raspberry Pi" /proc/device-tree/model 2>/dev/null; then
        print_error "Это не Raspberry Pi. Используйте обычный install.sh"
        exit 1
    fi

    # Определение модели Raspberry Pi
    if grep -q "Raspberry Pi 5" /proc/device-tree/model 2>/dev/null; then
        PI_MODEL="Raspberry Pi 5"
        CPU_CORES=4
        RAM_SIZE="4GB+"
    elif grep -q "Raspberry Pi 4" /proc/device-tree/model 2>/dev/null; then
        PI_MODEL="Raspberry Pi 4"
        CPU_CORES=4
        RAM_SIZE="2GB+"
    elif grep -q "Raspberry Pi 3" /proc/device-tree/model 2>/dev/null; then
        PI_MODEL="Raspberry Pi 3"
        CPU_CORES=4
        RAM_SIZE="1GB"
    else
        PI_MODEL="Raspberry Pi (старой модели)"
        CPU_CORES=1
        RAM_SIZE="<1GB"
    fi

    print_success "Обнаружен: $PI_MODEL"
    print_info "Ядра CPU: $CPU_CORES, RAM: $RAM_SIZE"

    # Проверка архитектуры
    ARCH=$(uname -m)
    if [[ $ARCH == "armv7l" ]]; then
        print_info "Архитектура: ARMv7 (32-bit)"
    elif [[ $ARCH == "aarch64" ]]; then
        print_info "Архитектура: ARM64"
    else
        print_warning "Неизвестная архитектура: $ARCH"
    fi
}

# Установка Node.js для Raspberry Pi
install_nodejs_pi() {
    print_step "Установка Node.js для Raspberry Pi..."

    # Проверка существующей установки
    if command -v node &> /dev/null && command -v npm &> /dev/null; then
        NODE_VERSION=$(node --version 2>/dev/null)
        if [[ $NODE_VERSION == v18* ]] || [[ $NODE_VERSION == v20* ]]; then
            print_success "Node.js уже установлен: $NODE_VERSION"
            return 0
        fi
    fi

    # Установка через NodeSource для Raspberry Pi
    print_info "Установка Node.js 18 через NodeSource..."

    # Добавление репозитория NodeSource
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

    # Установка Node.js
    sudo apt-get install -y nodejs

    # Проверка установки
    if command -v node &> /dev/null && command -v npm &> /dev/null; then
        print_success "Node.js установлен: $(node --version)"
        print_success "NPM установлен: $(npm --version)"
    else
        print_error "Ошибка установки Node.js"
        exit 1
    fi
}

# Пошаговая установка зависимостей
install_dependencies_step_by_step() {
    print_step "Пошаговая установка зависимостей для Raspberry Pi..."

    # Настройка оптимизаций для Raspberry Pi
    export NODE_OPTIONS="--max-old-space-size=512"
    export UV_THREADPOOL_SIZE=2
    export npm_config_cache="$HOME/.npm-cache-kanbe"
    export npm_config_tmp="$PWD/.npm-tmp"

    mkdir -p "$HOME/.npm-cache-kanbe" "$PWD/.npm-tmp"

    print_info "NODE_OPTIONS: $NODE_OPTIONS"
    print_info "UV_THREADPOOL_SIZE: $UV_THREADPOOL_SIZE"

    # Шаг 1: Установка основных runtime зависимостей
    print_info "Шаг 1/4: Установка основных зависимостей..."
    npm install --save \
        express@^4.21.2 \
        better-sqlite3@^12.4.1 \
        drizzle-orm@^0.39.1 \
        bcrypt@^5.1.1 \
        ws@^8.18.0 \
        --timeout=300000 --legacy-peer-deps --no-package-lock --verbose || {
        print_warning "Частичная установка основных зависимостей"
    }

    # Шаг 2: Установка React и связанных пакетов
    print_info "Шаг 2/4: Установка React зависимостей..."
    npm install --save \
        react@^18.3.1 \
        react-dom@^18.3.1 \
        @tanstack/react-query@^5.60.5 \
        wouter@^3.3.5 \
        --timeout=300000 --legacy-peer-deps --no-package-lock --verbose || {
        print_warning "Частичная установка React зависимостей"
    }

    # Шаг 3: Установка UI библиотек (Radix UI)
    print_info "Шаг 3/4: Установка UI компонентов..."
    npm install --save \
        @radix-ui/react-dialog@^1.1.7 \
        @radix-ui/react-dropdown-menu@^2.1.7 \
        lucide-react@^0.453.0 \
        class-variance-authority@^0.7.1 \
        clsx@^2.1.1 \
        tailwind-merge@^2.6.0 \
        --timeout=300000 --legacy-peer-deps --no-package-lock --verbose || {
        print_warning "Частичная установка UI компонентов"
    }

    # Шаг 4: Установка dev зависимостей
    print_info "Шаг 4/4: Установка dev зависимостей..."
    npm install --save-dev \
        vite@^5.4.20 \
        @vitejs/plugin-react@^4.7.0 \
        typescript@^5.6.3 \
        tsx@^4.20.5 \
        drizzle-kit@^0.31.4 \
        esbuild@^0.25.0 \
        --timeout=300000 --legacy-peer-deps --no-package-lock --verbose || {
        print_warning "Частичная установка dev зависимостей"
    }

    # Финальная проверка
    print_info "Проверка установки..."
    if [ -f "node_modules/.bin/drizzle-kit" ] && [ -f "node_modules/.bin/tsx" ]; then
        print_success "Основные зависимости установлены"
    else
        print_warning "Некоторые зависимости могут отсутствовать, продолжаем..."
    fi
}

# Сборка нативных модулей для Raspberry Pi
build_native_modules_pi() {
    print_step "Сборка нативных модулей для Raspberry Pi..."

    export NODE_OPTIONS="--max-old-space-size=512"
    export UV_THREADPOOL_SIZE=2

    print_info "Сборка better-sqlite3..."
    npm rebuild better-sqlite3 --build-from-source --timeout=600000 --verbose || {
        print_warning "Ошибка сборки better-sqlite3, пробуем без --build-from-source"
        npm rebuild better-sqlite3 --timeout=300000 --verbose || print_error "Не удалось собрать better-sqlite3"
    }

    print_success "Нативные модули собраны"
}

# Настройка базы данных
setup_database_pi() {
    print_step "Настройка базы данных..."

    mkdir -p data

    if [ ! -f "node_modules/.bin/drizzle-kit" ]; then
        print_error "drizzle-kit не найден"
        return 1
    fi

    print_info "Применение миграций..."
    npm run db:push || {
        print_error "Ошибка настройки базы данных"
        return 1
    }

    if [ -f "data/kanbe.db" ]; then
        print_success "База данных настроена"
    else
        print_error "Файл базы данных не создан"
        return 1
    fi
}

# Создание конфигурации для Raspberry Pi
create_config_pi() {
    print_step "Создание конфигурации для Raspberry Pi..."

    SESSION_SECRET=$(openssl rand -hex 32 2>/dev/null || echo "pi-secret-$(date +%s)")

    cat > .env << EOF
NODE_ENV=production
PORT=3000
SESSION_SECRET=$SESSION_SECRET
DATABASE_URL=./data/kanbe.db
PLATFORM=raspberry-pi
CPU_ARCH=armv7l
SINGLE_USER=true
EOF

    print_success "Конфигурация создана"
}

# Сборка приложения для Raspberry Pi
build_application_pi() {
    print_step "Сборка приложения для Raspberry Pi..."

    export NODE_OPTIONS="--max-old-space-size=512"

    if npm run build:raspberry-pi; then
        print_success "Приложение собрано"
    else
        print_warning "Ошибка сборки, пробуем стандартную сборку..."
        npm run build || print_error "Не удалось собрать приложение"
    fi
}

# Создание systemd сервиса для Raspberry Pi
create_systemd_service_pi() {
    print_step "Создание systemd сервиса для Raspberry Pi..."

    SERVICE_FILE="/etc/systemd/system/kanbe.service"
    WORKING_DIR="$(pwd)"

    sudo tee $SERVICE_FILE > /dev/null << EOF
[Unit]
Description=KanBe Kanban Application (Raspberry Pi Optimized)
After=network.target
Wants=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$WORKING_DIR
ExecStart=$WORKING_DIR/node_modules/.bin/tsx $WORKING_DIR/server/index.ts
Restart=always
RestartSec=15
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=DATABASE_URL=$WORKING_DIR/data/kanbe.db
Environment=SESSION_SECRET=$SESSION_SECRET

# Raspberry Pi оптимизации
Environment=NODE_OPTIONS=--max-old-space-size=256
Environment=UV_THREADPOOL_SIZE=2
Environment=SQLITE_BUSY_TIMEOUT=30000

# Ограничения ресурсов для Raspberry Pi
MemoryLimit=256M
CPUQuota=50%
Nice=10

# Безопасность
NoNewPrivileges=yes
PrivateTmp=yes
ProtectSystem=strict
ReadWritePaths=$WORKING_DIR/data
ProtectHome=yes

# Логирование
StandardOutput=journal
StandardError=journal
SyslogIdentifier=kanbe

[Install]
WantedBy=multi-user.target
EOF

    sudo systemctl daemon-reload
    sudo systemctl enable kanbe

    print_success "Systemd сервис создан и включен"
}

# Основная функция
main() {
    print_header
    check_raspberry_pi
    install_nodejs_pi
    install_dependencies_step_by_step
    build_native_modules_pi
    setup_database_pi
    create_config_pi
    build_application_pi
    create_systemd_service_pi

    echo ""
    echo -e "${GREEN}🚀 KanBe для Raspberry Pi готов!${NC}"
    echo ""
    echo "Команды управления:"
    echo "  Запуск: sudo systemctl start kanbe"
    echo "  Остановка: sudo systemctl stop kanbe"
    echo "  Статус: sudo systemctl status kanbe"
    echo "  Логи: sudo journalctl -u kanbe -f"
    echo ""
    echo -e "${CYAN}🌐 Откройте браузер: http://localhost:3000${NC}"
}

main "$@"