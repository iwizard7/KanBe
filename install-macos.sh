#!/bin/bash

# 🍎 Специализированный установщик KanBe для macOS (Apple Silicon)
# 🏗️ Оптимизирован для процессоров M-серии с автоматической сборкой нативных модулей

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
    echo -e "${PURPLE}🍎 === Установщик KanBe для macOS ===${NC}"
    echo ""
}

print_footer() {
    echo ""
    echo -e "${GREEN}🚀 Установка завершена! Добро пожаловать в KanBe на macOS!${NC}"
}

# Проверка macOS
detect_macos() {
    print_header

    print_step "Проверка macOS и архитектуры..."

    if [[ "$OSTYPE" != "darwin"* ]]; then
        print_error "Этот скрипт предназначен только для macOS"
        echo "Текущая ОС: $OSTYPE"
        exit 1
    fi

    ARCH=$(uname -m)
    case $ARCH in
        "arm64")
            print_info "Обнаружен Apple Silicon (ARM64)"
            CPU_ARCH="arm64"
            ;;
        "x86_64")
            print_info "Обнаружен Intel Mac (x86_64)"
            CPU_ARCH="x86_64"
            ;;
        *)
            print_warning "Неизвестная архитектура: $ARCH"
            CPU_ARCH="unknown"
            ;;
    esac

    print_success "macOS $CPU_ARCH подтверждена"
}

# Проверка и установка Xcode Command Line Tools
install_xcode_tools() {
    print_step "Проверка Xcode Command Line Tools..."

    if ! command -v clang &> /dev/null; then
        print_warning "Xcode Command Line Tools не найдены"
        echo -e "${YELLOW}🔧 Xcode Command Line Tools необходимы для сборки нативных модулей${NC}"
        read -p "Установить Xcode Command Line Tools автоматически? (y/n): " INSTALL_XCODE
        if [[ $INSTALL_XCODE =~ ^[Yy]$ ]]; then
            print_info "Установка Xcode Command Line Tools..."
            xcode-select --install

            # Ожидание завершения установки
            print_info "Ожидание завершения установки Xcode Command Line Tools..."
            until command -v clang &> /dev/null; do
                sleep 2
            done

            print_success "Xcode Command Line Tools установлены"
        else
            print_error "Установите Xcode Command Line Tools вручную: xcode-select --install"
            exit 1
        fi
    else
        print_success "Xcode Command Line Tools найдены"
    fi
}

# Проверка и установка Homebrew
install_homebrew() {
    print_step "Проверка Homebrew..."

    if ! command -v brew &> /dev/null; then
        print_warning "Homebrew не найден"
        echo -e "${CYAN}🍺 Рекомендуется установить Homebrew для лучшего управления пакетами${NC}"
        read -p "Установить Homebrew? (y/n): " INSTALL_BREW
        if [[ $INSTALL_BREW =~ ^[Yy]$ ]]; then
            print_info "Установка Homebrew..."
            /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

            # Проверка установки
            if command -v brew &> /dev/null; then
                print_success "Homebrew установлен"
                # Добавление Homebrew в PATH для текущей сессии
                eval "$(/opt/homebrew/bin/brew shellenv)"
            else
                print_error "Ошибка установки Homebrew"
                exit 1
            fi
        else
            print_warning "Пропуск установки Homebrew. Node.js будет установлен другими способами"
        fi
    else
        print_success "Homebrew найден"
        # Обновление Homebrew
        brew update
    fi
}

# Установка Node.js через Homebrew
install_nodejs_homebrew() {
    print_step "Установка Node.js через Homebrew..."

    if command -v brew &> /dev/null; then
        # Проверка существующей установки
        if command -v node &> /dev/null && command -v npm &> /dev/null; then
            NODE_VERSION=$(node --version 2>/dev/null)
            NPM_VERSION=$(npm --version 2>/dev/null)
            if [[ -n "$NODE_VERSION" && -n "$NPM_VERSION" ]]; then
                print_info "Node.js уже установлен: $NODE_VERSION"
                return 0
            fi
        fi

        print_info "Установка Node.js 18 (LTS)..."
        brew install node@18

        # Связывание версии Node.js
        brew link --overwrite node@18

        print_success "Node.js установлен через Homebrew"
    else
        print_error "Homebrew не доступен для установки Node.js"
        exit 1
    fi
}

# Альтернативная установка Node.js
install_nodejs_alternative() {
    print_step "Альтернативная установка Node.js..."

    # Проверка существующей установки
    if command -v node &> /dev/null && command -v npm &> /dev/null; then
        NODE_VERSION=$(node --version 2>/dev/null)
        NPM_VERSION=$(npm --version 2>/dev/null)
        if [[ -n "$NODE_VERSION" && -n "$NPM_VERSION" ]]; then
            print_info "Node.js уже установлен: $NODE_VERSION"
            return 0
        fi
    fi

    print_warning "Установка Node.js без Homebrew..."

    # Создание временной директории
    TEMP_DIR=$(mktemp -d)
    cd "$TEMP_DIR"

    # Загрузка официального установщика Node.js
    NODE_VERSION="18.19.1"
    ARCH=$(uname -m)

    if [[ "$ARCH" == "arm64" ]]; then
        NODE_ARCH="arm64"
    else
        NODE_ARCH="x64"
    fi

    print_info "Загрузка Node.js $NODE_VERSION для $NODE_ARCH..."

    if curl -fsSL -o "node-$NODE_VERSION-darwin-$NODE_ARCH.tar.gz" "https://nodejs.org/dist/v$NODE_VERSION/node-v$NODE_VERSION-darwin-$NODE_ARCH.tar.gz"; then
        print_info "Распаковка Node.js..."
        sudo mkdir -p /usr/local/lib/nodejs
        sudo tar -xf "node-$NODE_VERSION-darwin-$NODE_ARCH.tar.gz" -C /usr/local/lib/nodejs

        # Создание символических ссылок
        sudo ln -sf /usr/local/lib/nodejs/node-v$NODE_VERSION-darwin-$NODE_ARCH/bin/node /usr/local/bin/node
        sudo ln -sf /usr/local/lib/nodejs/node-v$NODE_VERSION-darwin-$NODE_ARCH/bin/npm /usr/local/bin/npm
        sudo ln -sf /usr/local/lib/nodejs/node-v$NODE_VERSION-darwin-$NODE_ARCH/bin/npx /usr/local/bin/npx

        print_success "Node.js установлен вручную"
    else
        print_error "Ошибка загрузки Node.js"
        print_info "Установите Node.js вручную: https://nodejs.org/"
        exit 1
    fi

    # Очистка
    cd - > /dev/null
    rm -rf "$TEMP_DIR"
}

# Установка Node.js (основная функция)
install_nodejs() {
    print_step "Установка Node.js..."

    # Попытка 1: Через Homebrew
    if command -v brew &> /dev/null; then
        install_nodejs_homebrew
    else
        # Попытка 2: Альтернативная установка
        install_nodejs_alternative
    fi

    # Проверка установки
    if command -v node &> /dev/null && command -v npm &> /dev/null; then
        print_success "Node.js версия: $(node --version)"
        print_success "NPM версия: $(npm --version)"

        # Настройка npm для Apple Silicon
        if [[ "$CPU_ARCH" == "arm64" ]]; then
            print_info "Настройка npm для Apple Silicon..."
            npm config set python python3
            npm config set build-from-source true
        fi
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

    print_info "Установка зависимостей для macOS..."

    # Специальная обработка для Apple Silicon
    if [[ "$CPU_ARCH" == "arm64" ]]; then
        print_info "Оптимизация для Apple Silicon..."

        # Установка с флагом build-from-source для нативных модулей
        npm install --no-audit --no-fund --timeout=60000

        print_success "Зависимости установлены для Apple Silicon"
    else
        npm install --no-audit --no-fund --timeout=60000
        print_success "Зависимости установлены"
    fi
}

# Специальная сборка нативных модулей для Apple Silicon
build_native_modules() {
    print_step "Сборка нативных модулей для Apple Silicon..."

    if [[ "$CPU_ARCH" == "arm64" ]]; then
        print_info "Сборка better-sqlite3 для Apple Silicon..."

        # Специальная сборка для Apple Silicon
        npm rebuild better-sqlite3 --build-from-source

        # Дополнительная проверка сборки
        if npm list better-sqlite3 &> /dev/null; then
            print_success "better-sqlite3 успешно собран для Apple Silicon"
        else
            print_warning "Проблемы со сборкой better-sqlite3"
            print_info "Попробуйте собрать вручную: npm rebuild better-sqlite3 --build-from-source"
        fi
    else
        npm rebuild
        print_success "Нативные модули собраны"
    fi
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
            SESSION_SECRET="macos-secret-$(date +%s)"
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
PLATFORM=macos
CPU_ARCH=$CPU_ARCH
BUILD_DATE=$(date)
MACOS_VERSION=$(sw_vers -productVersion 2>/dev/null || echo "unknown")
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
    detect_macos

    # Проверка Xcode Command Line Tools
    install_xcode_tools

    # Проверка Homebrew
    install_homebrew

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
    echo "   Платформа: macOS"
    echo "   Архитектура: $CPU_ARCH"
    echo "   Директория: $(pwd)"
    echo ""
    echo -e "${GREEN}🚀 KanBe готов к запуску на macOS!${NC}"
    echo ""
    echo "Команды для запуска:"
    echo "  Разработка: npm run dev (API) + npm run dev:client (фронтенд)"
    echo "  Продакшн: npm run start"
    echo ""
    echo "Порты:"
    echo "  API: $API_PORT"
    echo "  Фронтенд: $DEV_PORT"
    echo ""
    echo -e "${YELLOW}💡 Для Apple Silicon:${NC}"
    echo "  Все нативные модули собраны с оптимизацией для ARM64"
    echo "  Используйте Terminal или iTerm2 для лучших результатов"
}

# Запуск основной функции
main "$@"
