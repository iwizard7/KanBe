#!/bin/bash

# 🎯 Универсальный установщик KanBe для всех платформ
# 🔄 Автоматически определяет ОС, архитектуру и настраивает приложение

# Цвета для красивого вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Функция для красивого вывода
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
    echo -e "${PURPLE}🎯 === Универсальный установщик KanBe ===${NC}"
    echo ""
}

print_footer() {
    echo ""
    echo -e "${GREEN}🚀 Установка завершена! Добро пожаловать в KanBe!${NC}"
}



# Определение платформы и архитектуры
detect_platform() {
    print_header

    print_step "Определение платформы и архитектуры..."

    OS=$(uname -s)
    ARCH=$(uname -m)

    case $OS in
        "Darwin")
            PLATFORM="macos"
            print_info "Обнаружена macOS"
            ;;
        "Linux")
            PLATFORM="linux"
            print_info "Обнаружена Linux"

            # Проверка на Raspberry Pi
            if [[ -f /proc/device-tree/model ]] && grep -q "Raspberry Pi" /proc/device-tree/model 2>/dev/null; then
                PLATFORM="raspberry-pi"
                print_info "Обнаружен Raspberry Pi"
            fi
            ;;
        *)
            print_error "Неподдерживаемая операционная система: $OS"
            exit 1
            ;;
    esac

    case $ARCH in
        "arm64"|"aarch64")
            CPU_ARCH="arm64"
            print_info "Архитектура процессора: ARM64"
            ;;
        "x86_64"|"amd64")
            CPU_ARCH="x86_64"
            print_info "Архитектура процессора: x86_64"
            ;;
        "armv7l")
            CPU_ARCH="armv7l"
            print_info "Архитектура процессора: ARMv7 (32-bit)"
            ;;
        *)
            print_warning "Неизвестная архитектура: $ARCH"
            CPU_ARCH="unknown"
            ;;
    esac

    print_success "Платформа определена: $PLATFORM ($CPU_ARCH)"
}

# Установка Node.js
install_nodejs() {
    print_step "Установка Node.js..."

    # Проверка существующей установки
    if command -v node &> /dev/null && command -v npm &> /dev/null; then
        NODE_VERSION=$(node --version 2>/dev/null)
        NPM_VERSION=$(npm --version 2>/dev/null)
        if [[ -n "$NODE_VERSION" && -n "$NPM_VERSION" ]]; then
            print_info "Node.js уже установлен: $NODE_VERSION"
            return 0
        fi
    fi

    case $PLATFORM in
        "macos")
            # Установка Node.js на macOS через Homebrew (рекомендуется)
            if command -v brew &> /dev/null; then
                print_info "Установка Node.js через Homebrew..."
                brew install node@18
                print_success "Node.js установлен через Homebrew"
            else
                print_warning "Homebrew не найден. Рекомендуется установить Homebrew для лучшей совместимости"
                read -p "Установить Homebrew? (y/n): " INSTALL_BREW
                if [[ $INSTALL_BREW =~ ^[Yy]$ ]]; then
                    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
                    brew install node@18
                    print_success "Homebrew и Node.js установлены"
                else
                    print_error "Установите Node.js вручную: https://nodejs.org/"
                    exit 1
                fi
            fi
            ;;
        "linux"|"raspberry-pi")
            # Установка Node.js на Linux
            if command -v apt-get &> /dev/null; then
                print_info "Установка Node.js через apt..."
                curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
                sudo apt-get install -y nodejs
                print_success "Node.js установлен"
            else
                print_error "Не найден apt-get. Установите Node.js вручную"
                exit 1
            fi
            ;;
    esac

    # Проверка установки
    if command -v node &> /dev/null && command -v npm &> /dev/null; then
        print_success "Node.js версия: $(node --version)"
        print_success "NPM версия: $(npm --version)"
    else
        print_error "Ошибка установки Node.js"
        exit 1
    fi
}

# Установка зависимостей проекта
install_dependencies() {
    print_step "Установка зависимостей проекта..."

    # Проверка наличия package.json
    if [ ! -f "package.json" ]; then
        print_error "Файл package.json не найден"
        exit 1
    fi

    # Установка зависимостей с оптимизацией для платформы
    case $PLATFORM in
        "macos")
            print_info "Установка зависимостей для macOS..."
            if [ "$CPU_ARCH" = "arm64" ]; then
                print_info "Оптимизация для Apple Silicon (ARM64)..."
                npm config set python python3
                npm install --no-audit --no-fund --timeout=60000
            else
                npm install --no-audit --no-fund --timeout=60000
            fi
            ;;
        "raspberry-pi")
            print_info "Установка зависимостей для Raspberry Pi..."
            npm install --no-audit --no-fund --timeout=60000 --legacy-peer-deps
            ;;
        "linux")
            print_info "Установка зависимостей для Linux..."
            npm install --no-audit --no-fund --timeout=60000
            ;;
    esac

    print_success "Зависимости установлены"
}

# Сборка нативных модулей
build_native_modules() {
    print_step "Сборка нативных модулей..."

    case $PLATFORM in
        "macos")
            if [ "$CPU_ARCH" = "arm64" ]; then
                print_info "Сборка для Apple Silicon (ARM64)..."
                # Специальная обработка для better-sqlite3 на Apple Silicon
                npm rebuild better-sqlite3 --build-from-source
                print_success "Нативные модули собраны для Apple Silicon"
            else
                npm rebuild
                print_success "Нативные модули собраны"
            fi
            ;;
        "raspberry-pi"|"linux")
            print_info "Сборка для ARM архитектуры..."
            npm rebuild better-sqlite3
            print_success "Нативные модули собраны"
            ;;
    esac
}

# Настройка базы данных
setup_database() {
    print_step "Настройка базы данных..."

    # Создание директории для базы данных
    mkdir -p data

    # Применение миграций
    if command -v npm &> /dev/null; then
        npm run db:push
        print_success "База данных настроена"
    else
        print_warning "NPM не найден, пропуск настройки базы данных"
    fi
}

# Создание файла конфигурации
create_config() {
    print_step "Создание файла конфигурации..."

    # Запрос параметров
    read -p "Введите порт для API сервера (по умолчанию 5000): " API_PORT
    API_PORT=${API_PORT:-5000}

    read -p "Введите порт для фронтенда (по умолчанию 3000): " DEV_PORT
    DEV_PORT=${DEV_PORT:-3000}

    read -p "Введите секрет для сессий (оставьте пустым для генерации): " SESSION_SECRET
    if [ -z "$SESSION_SECRET" ]; then
        if command -v openssl &> /dev/null; then
            SESSION_SECRET=$(openssl rand -hex 32)
        else
            SESSION_SECRET="default-secret-$(date +%s)"
        fi
        print_info "Сгенерирован секрет сессии: $SESSION_SECRET"
    fi

    # Создание .env файла
    cat > .env << EOF
NODE_ENV=production
PORT=$API_PORT
SESSION_SECRET=$SESSION_SECRET
DATABASE_URL=./data/kanbe.db
DEV_PORT=$DEV_PORT
PLATFORM=$PLATFORM
CPU_ARCH=$CPU_ARCH
EOF

    print_success "Файл конфигурации создан"
}

# Сборка приложения
build_application() {
    print_step "Сборка приложения..."

    if command -v npm &> /dev/null; then
        npm run build
        print_success "Приложение собрано"
    else
        print_warning "NPM не найден, пропуск сборки"
    fi
}

# Основная функция установки
main() {
    # Определение платформы
    detect_platform

    # Проверка требований
    check_requirements

    # Установка Node.js
    install_nodejs

    # Установка зависимостей
    install_dependencies

    # Сборка нативных модулей
    build_native_modules

    # Настройка базы данных
    setup_database

    # Создание конфигурации
    create_config

    # Сборка приложения
    build_application

    print_footer

    echo ""
    echo -e "${CYAN}📋 Информация об установке:${NC}"
    echo "   Платформа: $PLATFORM"
    echo "   Архитектура: $CPU_ARCH"
    echo "   Директория: $(pwd)"
    echo ""
    echo -e "${GREEN}🚀 KanBe готов к запуску!${NC}"
    echo ""
    echo "Команды для запуска:"
    echo "  Разработка: npm run dev (API) + npm run dev:client (фронтенд)"
    echo "  Продакшн: npm run start"
    echo ""
    echo "Порты:"
    echo "  API: $API_PORT"
    echo "  Фронтенд: $DEV_PORT"
}

# Запуск основной функции
main "$@"
