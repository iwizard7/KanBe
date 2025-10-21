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
            # Установка Node.js на Linux с повторными попытками
            if command -v apt-get &> /dev/null; then
                print_info "Установка Node.js через apt..."

                # Попытка 1: Через nodesource репозиторий
                local max_attempts=3
                local attempt=1
                local node_installed=false

                while [ $attempt -le $max_attempts ] && [ "$node_installed" = false ]; do
                    print_info "Попытка $attempt из $max_attempts..."

                    # Настройка репозитория nodesource
                    if curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - 2>/dev/null; then
                        print_info "Репозиторий nodesource настроен"

                        # Попытка установки с таймаутом
                        if timeout 300 sudo apt-get install -y nodejs 2>/dev/null; then
                            node_installed=true
                            print_success "Node.js установлен через nodesource"
                            break
                        else
                            print_warning "Установка через nodesource не удалась (попытка $attempt)"
                        fi
                    else
                        print_warning "Не удалось настроить репозиторий nodesource (попытка $attempt)"
                    fi

                    if [ $attempt -lt $max_attempts ]; then
                        print_info "Повторная попытка через 5 секунд..."
                        sleep 5
                    fi
                    ((attempt++))
                done

                # Попытка 2: Через официальный репозиторий Debian/Ubuntu
                if [ "$node_installed" = false ]; then
                    print_info "Пробуем установить через официальный репозиторий Debian..."

                    # Обновление пакетов
                    sudo apt-get update

                    # Попытка установить nodejs из официального репозитория
                    if sudo apt-get install -y nodejs npm 2>/dev/null; then
                        node_installed=true
                        print_success "Node.js установлен через официальный репозиторий"
                    else
                        print_warning "Установка через официальный репозиторий не удалась"
                    fi
                fi

                # Попытка 3: Ручная загрузка и установка
                if [ "$node_installed" = false ]; then
                    print_info "Пробуем ручную загрузку Node.js..."

                    # Определение архитектуры для загрузки
                    local arch="x64"
                    if [[ $(uname -m) == "aarch64" ]]; then
                        arch="arm64"
                    elif [[ $(uname -m) == "armv7l" ]]; then
                        arch="armv7l"
                    fi

                    local node_url="https://nodejs.org/dist/v18.20.8/node-v18.20.8-linux-${arch}.tar.xz"

                    if curl -L -o node.tar.xz "$node_url" 2>/dev/null && [ -f node.tar.xz ]; then
                        print_info "Node.js загружен, распаковка..."
                        sudo mkdir -p /usr/local/lib/nodejs
                        sudo tar -xf node.tar.xz -C /usr/local/lib/nodejs --strip-components=1
                        sudo ln -sf /usr/local/lib/nodejs/bin/node /usr/local/bin/node
                        sudo ln -sf /usr/local/lib/nodejs/bin/npm /usr/local/bin/npm
                        sudo ln -sf /usr/local/lib/nodejs/bin/npx /usr/local/bin/npx
                        rm node.tar.xz

                        if command -v node &> /dev/null; then
                            node_installed=true
                            print_success "Node.js установлен вручную"
                        fi
                    else
                        print_warning "Ручная загрузка Node.js не удалась"
                    fi
                fi

                if [ "$node_installed" = false ]; then
                    print_error "Все методы установки Node.js не удались"
                    print_info "Возможные решения:"
                    print_info "1. Проверьте подключение к интернету"
                    print_info "2. Попробуйте установить Node.js вручную: https://nodejs.org/"
                    print_info "3. Используйте другой метод установки"
                    exit 1
                fi
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
                npm install --no-audit --no-fund --timeout=60000
            else
                npm install --no-audit --no-fund --timeout=60000
            fi
            ;;
        "raspberry-pi")
            print_info "Установка зависимостей для Raspberry Pi (оптимизировано для ARMv7)..."
            # Оптимизации для Raspberry Pi 3
            export NODE_OPTIONS="--max-old-space-size=256"  # Ограничение памяти до 256MB
            npm install --no-audit --no-fund --timeout=120000 --legacy-peer-deps --production=false
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

    # Проверка наличия drizzle-kit
    if [ ! -f "node_modules/.bin/drizzle-kit" ]; then
        print_error "drizzle-kit не найден. Убедитесь, что зависимости установлены корректно."
        return 1
    fi

    # Применение миграций с повторными попытками
    if command -v npm &> /dev/null; then
        print_info "Применение миграций базы данных..."
        local max_attempts=3
        local attempt=1

        while [ $attempt -le $max_attempts ]; do
            print_info "Попытка $attempt из $max_attempts..."

            if npm run db:push 2>&1; then
                print_success "База данных настроена успешно"
                return 0
            else
                print_warning "Попытка $attempt не удалась"
                if [ $attempt -lt $max_attempts ]; then
                    print_info "Повторная попытка через 3 секунды..."
                    sleep 3
                fi
            fi
            ((attempt++))
        done

        print_error "Не удалось настроить базу данных после $max_attempts попыток"
        print_info "Попробуйте выполнить 'npm run db:push' вручную"
        return 1
    else
        print_warning "NPM не найден, пропуск настройки базы данных"
        return 1
    fi
}

# Настройка типа установки (только один пользователь)
select_installation_type() {
    SINGLE_USER=true
}

# Проверка доступности порта
check_port_availability() {
    local port=$1
    local service_name=$2

    if command -v lsof &> /dev/null; then
        local process_info=$(lsof -i :$port 2>/dev/null)
        if [ $? -eq 0 ] && [ -n "$process_info" ]; then
            print_warning "Порт $port уже используется:"
            echo "$process_info" | head -n 2
            read -p "Убить процесс, использующий порт $port? (y/n): " KILL_PROCESS
            if [[ $KILL_PROCESS =~ ^[Yy]$ ]]; then
                local pid=$(echo "$process_info" | awk 'NR==2 {print $2}')
                if kill -9 $pid 2>/dev/null; then
                    print_success "Процесс убит (PID: $pid)"
                    sleep 2
                else
                    print_error "Не удалось убить процесс"
                    return 1
                fi
            else
                print_info "Продолжаем с текущим портом"
            fi
        fi
    elif command -v netstat &> /dev/null; then
        if netstat -tuln 2>/dev/null | grep -q ":$port "; then
            print_warning "Порт $port уже используется"
            read -p "Продолжить с этим портом? (y/n): " CONTINUE_ANYWAY
            if [[ ! $CONTINUE_ANYWAY =~ ^[Yy]$ ]]; then
                return 1
            fi
        fi
    else
        print_warning "Не удалось проверить доступность порта $port (lsof/netstat не найдены)"
    fi

    return 0
}

# Создание файла конфигурации
create_config() {
    print_step "Создание файла конфигурации..."

    # Генерация секрета для сессий (автоматически)
    if command -v openssl &> /dev/null; then
        SESSION_SECRET=$(openssl rand -hex 32)
    else
        SESSION_SECRET="default-secret-$(date +%s)"
    fi
    print_info "Сгенерирован секрет сессии"

    # Создание .env файла с фиксированными портами
    cat > .env << EOF
NODE_ENV=production
PORT=3000
SESSION_SECRET=$SESSION_SECRET
DATABASE_URL=./data/kanbe.db
DEV_PORT=3000
PLATFORM=$PLATFORM
CPU_ARCH=$CPU_ARCH
SINGLE_USER=$SINGLE_USER
EOF

    print_success "Файл конфигурации создан"
}

# Сборка приложения
build_application() {
    print_step "Сборка приложения..."

    if command -v npm &> /dev/null; then
        # Проверяем наличие vite локально
        if [ -f "node_modules/.bin/vite" ]; then
            print_info "Используем локальный vite для сборки..."
            npm run build
        else
            print_warning "Локальный vite не найден, пытаемся использовать глобальный..."
            if command -v vite &> /dev/null; then
                npm run build
            else
                print_warning "Vite не найден глобально, устанавливаем локально..."
                npm install --save-dev vite
                npm run build
            fi
        fi
        print_success "Приложение собрано"
    else
        print_warning "NPM не найден, пропуск сборки"
    fi
}

# Загрузка кода проекта
download_code() {
    print_step "Проверка кода проекта..."

    # Проверяем, находимся ли мы уже в репозитории KanBe
    if [ -d ".git" ] && [ -f "package.json" ]; then
        print_info "Обнаружен существующий репозиторий KanBe"

        # Проверяем remote URL
        if git remote get-url origin 2>/dev/null | grep -q "iwizard7/KanBe"; then
            print_info "Обновление существующего репозитория..."

            # Останавливаем сервис перед обновлением
            print_info "Остановка KanBe сервиса перед обновлением..."
            case $PLATFORM in
                "macos")
                    if launchctl list | grep -q kanbe 2>/dev/null; then
                        launchctl stop com.kanbe.app 2>/dev/null || true
                        launchctl unload ~/Library/LaunchAgents/com.kanbe.app.plist 2>/dev/null || true
                        print_info "Launchd сервис остановлен"
                    fi
                    ;;
                "linux"|"raspberry-pi")
                    if command -v systemctl &> /dev/null && sudo systemctl is-active --quiet kanbe 2>/dev/null; then
                        sudo systemctl stop kanbe 2>/dev/null || true
                        print_info "Systemd сервис остановлен"
                    fi
                    ;;
            esac

            # Сохраняем базу данных перед обновлением
            if [ -f "data/kanbe.db" ]; then
                print_info "Сохранение базы данных перед обновлением..."
                cp data/kanbe.db data/kanbe.db.backup.$(date +%Y%m%d_%H%M%S)
            fi

            # Сохраняем локальные изменения перед обновлением
            if git status --porcelain | grep -q .; then
                print_info "Сохранение локальных изменений..."
                git stash push -m "Auto-stash before update $(date)"
                STASHED=true
            fi

            # Пытаемся обновить с разных веток
            if git pull origin main; then
                print_success "Репозиторий обновлен с ветки main"
            elif git pull origin master; then
                print_success "Репозиторий обновлен с ветки master"
            else
                print_warning "Не удалось обновить репозиторий, продолжаем с текущей версией"
                print_info "Проверьте статус git: git status"
                print_info "Возможно есть конфликты или detached HEAD. Попробуйте: git checkout main && git pull"
            fi

            # Восстанавливаем локальные изменения, если они были сохранены
            if [ "$STASHED" = true ]; then
                print_info "Восстановление локальных изменений..."
                if git stash pop 2>/dev/null; then
                    print_success "Локальные изменения восстановлены"
                else
                    print_warning "Не удалось восстановить локальные изменения. Возможно конфликты."
                    print_info "Рабочая директория может находиться в состоянии конфликта слияния."
                    print_info "Используйте 'git status' для проверки и 'git stash drop' для удаления сохраненных изменений."
                fi
            fi
        else
            print_info "Репозиторий найден, но remote URL отличается"
            print_info "Продолжаем с текущей версией кода"
        fi
        return 0
    fi

    # Если package.json существует, но нет .git, считаем код уже присутствующим
    if [ -f "package.json" ]; then
        print_info "Код проекта уже присутствует (без git репозитория)"
        return 0
    fi

    print_step "Загрузка кода проекта..."

    if command -v git &> /dev/null; then
        # Проверяем, есть ли только install.sh (что нормально для первого запуска)
        FILES=$(ls -A . 2>/dev/null | grep -v '^\.DS_Store$')
        if [ -z "$FILES" ] || [ "$FILES" = "install.sh" ]; then
            if [ -f "install.sh" ]; then
                print_info "Найден только файл install.sh, начинаем загрузку проекта..."
                # Удаляем install.sh перед клонированием
                rm -f install.sh
            fi
            git clone https://github.com/iwizard7/KanBe.git .
            if [ $? -eq 0 ]; then
                print_success "Код проекта загружен"
            else
                print_error "Ошибка загрузки кода проекта"
                exit 1
            fi
        else
            print_error "Директория не пустая. Найдены файлы:"
            ls -la . | grep -v '^\.DS_Store$'
            print_error "Очистите директорию или выберите другую для установки"
            exit 1
        fi
    else
        print_error "Git не найден. Установите git для загрузки кода"
        exit 1
    fi
}

# Проверка системных требований
check_requirements() {
    print_step "Проверка системных требований..."

    case $PLATFORM in
        "macos")
            # Проверка Xcode Command Line Tools для macOS
            if ! command -v clang &> /dev/null; then
                print_warning "Xcode Command Line Tools не найдены"
                read -p "Установить Xcode Command Line Tools? (y/n): " INSTALL_XCODE
                if [[ $INSTALL_XCODE =~ ^[Yy]$ ]]; then
                    print_info "Установка Xcode Command Line Tools..."
                    xcode-select --install
                    print_success "Xcode Command Line Tools установлены"
                else
                    print_error "Xcode Command Line Tools необходимы для сборки нативных модулей"
                    exit 1
                fi
            else
                print_success "Xcode Command Line Tools найдены"
            fi
            ;;
        "linux"|"raspberry-pi")
            # Проверка build-essential для Linux
            if ! dpkg -l | grep -q build-essential; then
                print_warning "build-essential не установлен"
                if command -v apt-get &> /dev/null; then
                    print_info "Установка build-essential..."
                    sudo apt-get update
                    sudo apt-get install -y build-essential
                    print_success "build-essential установлен"
                else
                    print_error "Не найден apt-get. Установите build-essential вручную"
                    exit 1
                fi
            else
                print_success "build-essential найден"
            fi
            ;;
    esac
}



# Запрос директории установки
select_installation_directory() {
    print_step "Выбор директории установки..."

    echo ""
    echo "=== Директория установки ==="
    echo "📁 Текущая директория: $(pwd)"
    echo ""

    # Запрос с y по умолчанию (просто Enter)
    read -p "Установить KanBe в текущую директорию? (Y/n): " USE_CURRENT_DIR
    USE_CURRENT_DIR=${USE_CURRENT_DIR:-y}  # По умолчанию y если пустой ввод

    # Приводим к нижнему регистру и проверяем только y или n
    USE_CURRENT_DIR=$(echo "$USE_CURRENT_DIR" | tr '[:upper:]' '[:lower:]')

    while [[ "$USE_CURRENT_DIR" != "y" && "$USE_CURRENT_DIR" != "n" ]]; do
        print_warning "Пожалуйста, введите только 'y' (да) или 'n' (нет)"
        read -p "Установить KanBe в текущую директорию? (Y/n): " USE_CURRENT_DIR
        USE_CURRENT_DIR=${USE_CURRENT_DIR:-y}
        USE_CURRENT_DIR=$(echo "$USE_CURRENT_DIR" | tr '[:upper:]' '[:lower:]')
    done

    if [[ $USE_CURRENT_DIR == "n" ]]; then
        read -p "Введите путь для установки KanBe: " INSTALL_DIR

        # Проверка существования директории
        if [ ! -d "$INSTALL_DIR" ]; then
            echo "Директория $INSTALL_DIR не существует."
            read -p "Создать директорию? (y/n): " CREATE_DIR
            CREATE_DIR=${CREATE_DIR:-y}
            CREATE_DIR=$(echo "$CREATE_DIR" | tr '[:upper:]' '[:lower:]')

            while [[ "$CREATE_DIR" != "y" && "$CREATE_DIR" != "n" ]]; do
                print_warning "Пожалуйста, введите только 'y' (да) или 'n' (нет)"
                read -p "Создать директорию? (y/n): " CREATE_DIR
                CREATE_DIR=${CREATE_DIR:-y}
                CREATE_DIR=$(echo "$CREATE_DIR" | tr '[:upper:]' '[:lower:]')
            done

            if [[ $CREATE_DIR == "y" ]]; then
                if ! mkdir -p "$INSTALL_DIR"; then
                    print_error "Ошибка создания директории $INSTALL_DIR"
                    exit 1
                fi
                print_success "Директория $INSTALL_DIR создана"
            else
                print_error "Установка отменена"
                exit 1
            fi
        fi

        # Проверка прав записи в директорию
        if [ ! -w "$INSTALL_DIR" ]; then
            print_error "Ошибка: нет прав записи в директорию $INSTALL_DIR"
            exit 1
        fi

        # Переход в выбранную директорию
        if ! cd "$INSTALL_DIR"; then
            print_error "Ошибка перехода в директорию $INSTALL_DIR"
            exit 1
        fi

        print_success "KanBe будет установлен в: $(pwd)"
    else
        print_success "KanBe будет установлен в текущую директорию: $(pwd)"
    fi
}

# Функция валидации email
validate_email() {
    local email=$1
    # Простая регулярка для проверки email формата
    if [[ $email =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
        return 0
    else
        return 1
    fi
}

# Создание первого пользователя (только для single user установки)
create_first_user() {
    # Пропускаем создание пользователя если не single user режим
    if [ "$SINGLE_USER" != "true" ]; then
        print_info "Пропуск создания пользователя (single user режим)"
        return 0
    fi

    print_step "Создание первого пользователя..."

    echo ""
    echo "=== Создание администратора ==="

    # Запрос email с валидацией
    while true; do
        read -p "Email для администратора: " ADMIN_EMAIL
        if [ -z "$ADMIN_EMAIL" ]; then
            print_error "Email не может быть пустым"
            continue
        fi
        if validate_email "$ADMIN_EMAIL"; then
            break
        else
            print_error "Некорректный формат email. Пример: admin@example.com"
        fi
    done

    # Запрос пароля
    while true; do
        read -s -p "Пароль для администратора: " ADMIN_PASSWORD
        echo ""
        if [ -z "$ADMIN_PASSWORD" ]; then
            print_error "Пароль не может быть пустым"
            continue
        fi
        if [ ${#ADMIN_PASSWORD} -lt 6 ]; then
            print_error "Пароль должен содержать минимум 6 символов"
            continue
        fi
        break
    done

    print_success "Email и пароль приняты"

    # Проверяем, что база данных существует и таблицы созданы
    if [ ! -f "data/kanbe.db" ]; then
        print_error "База данных не найдена. Убедитесь, что настройка БД выполнена."
        return 1
    fi

    # Создание временного скрипта для создания пользователя
    cat > create_admin.js << 'EOF'
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './shared/schema.js';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

console.log('Создание администратора...');

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
        // Проверяем существование таблицы users
        const tables = sqlite.pragma('table_list');
        const usersTableExists = tables.some(table => table.name === 'users');

        if (!usersTableExists) {
            console.error('❌ Таблица users не существует. Сначала настройте базу данных командой: npm run db:push');
            process.exit(1);
        }

        // Проверяем, существует ли уже пользователь с таким email
        const existingUsers = await db
            .select()
            .from(schema.users)
            .where(eq(schema.users.email, email))
            .limit(1);

        const hashedPassword = await bcrypt.hash(password, 10);

        if (existingUsers.length > 0) {
            await db.update(schema.users).set({ password: hashedPassword }).where(eq(schema.users.email, email));
            console.log('ℹ️  Пользователь с таким email уже существует, пароль обновлен');
            console.log('📧 Email:', email);
            console.log('🆔 ID пользователя:', existingUsers[0].id);
            return;
        }

        const [user] = await db
            .insert(schema.users)
            .values({
                email,
                password: hashedPassword,
                firstName: 'Admin',
                lastName: 'User',
            })
            .returning();

        console.log('✅ Пользователь создан успешно');
        console.log('📧 Email:', email);
        console.log('🆔 ID пользователя:', user.id);
    } catch (error) {
        console.error('❌ Ошибка создания пользователя:', error.message);
        process.exit(1);
    } finally {
        sqlite.close();
    }
}

createAdmin();
EOF

    # Запуск скрипта создания пользователя с правильным путем к node_modules
    if [ -f "create_admin.js" ]; then
        # Используем локальный tsx из node_modules вместо глобального
        ./node_modules/.bin/tsx create_admin.js "$ADMIN_EMAIL" "$ADMIN_PASSWORD"
        rm -f create_admin.js
        print_success "Администратор создан: $ADMIN_EMAIL"
    else
        print_error "Ошибка: файл create_admin.js не создан"
        return 1
    fi
}

# Создание systemd service файла
create_systemd_service() {
    print_step "Создание systemd service файла..."

    # Проверяем, что мы на Linux с systemd
    if [ "$PLATFORM" != "linux" ] && [ "$PLATFORM" != "raspberry-pi" ]; then
        print_info "Systemd service не поддерживается на $PLATFORM"
        return 0
    fi

    if ! command -v systemctl &> /dev/null; then
        print_warning "systemctl не найден, пропуск создания systemd service"
        return 0
    fi

    # Создание service файла
    SERVICE_FILE="/etc/systemd/system/kanbe.service"
    WORKING_DIR="$(pwd)"
    EXEC_START="$WORKING_DIR/node_modules/.bin/tsx $WORKING_DIR/server/index.ts"

    # Специальные оптимизации для Raspberry Pi
    if [ "$PLATFORM" = "raspberry-pi" ]; then
        sudo tee $SERVICE_FILE > /dev/null << EOF
[Unit]
Description=KanBe Kanban Application (Raspberry Pi Optimized)
After=network.target
Wants=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$WORKING_DIR
ExecStart=$EXEC_START
Restart=always
RestartSec=15
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=DATABASE_URL=$WORKING_DIR/data/kanbe.db
Environment=SESSION_SECRET=$SESSION_SECRET

# Raspberry Pi оптимизации
Environment=NODE_OPTIONS=--max-old-space-size=256 --optimize-for-size
Environment=UV_THREADPOOL_SIZE=2
Environment=SQLITE_BUSY_TIMEOUT=30000

# Ограничения ресурсов для Raspberry Pi 3
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
    else
        sudo tee $SERVICE_FILE > /dev/null << EOF
[Unit]
Description=KanBe Kanban Application
After=network.target
Wants=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$WORKING_DIR
ExecStart=$EXEC_START
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=DATABASE_URL=$WORKING_DIR/data/kanbe.db
Environment=SESSION_SECRET=$SESSION_SECRET

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
    fi

    # Перезагрузка systemd и включение сервиса
    sudo systemctl daemon-reload
    sudo systemctl enable kanbe

    print_success "Systemd service создан: $SERVICE_FILE"
    print_info "Сервис включен для автозапуска"
}

# Создание launchd service файла для macOS
create_launchd_service() {
    print_step "Создание launchd service файла..."

    # Проверяем, что мы на macOS
    if [ "$PLATFORM" != "macos" ]; then
        print_info "Launchd service не поддерживается на $PLATFORM"
        return 0
    fi

    # Создание plist файла
    PLIST_FILE="$HOME/Library/LaunchAgents/com.kanbe.app.plist"
    WORKING_DIR="$(pwd)"
    NODE_PATH="/usr/local/bin/node"
    SCRIPT_PATH="$WORKING_DIR/dist/index.js"

    # Проверяем путь к node
    if ! command -v node &> /dev/null; then
        print_error "Node.js не найден в PATH"
        return 1
    fi
    NODE_PATH=$(which node)

    mkdir -p "$HOME/Library/LaunchAgents"

    cat > "$PLIST_FILE" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.kanbe.app</string>
    <key>ProgramArguments</key>
    <array>
        <string>$NODE_PATH</string>
        <string>$SCRIPT_PATH</string>
    </array>
    <key>WorkingDirectory</key>
    <string>$WORKING_DIR</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>NODE_ENV</key>
        <string>production</string>
        <key>PORT</key>
        <string>3000</string>
        <key>DATABASE_URL</key>
        <string>$WORKING_DIR/data/kanbe.db</string>
        <key>SESSION_SECRET</key>
        <string>$SESSION_SECRET</string>
    </dict>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <dict>
        <key>SuccessfulExit</key>
        <false/>
    </dict>
    <key>StandardOutPath</key>
    <string>$WORKING_DIR/kanbe.log</string>
    <key>StandardErrorPath</key>
    <string>$WORKING_DIR/kanbe-error.log</string>
</dict>
</plist>
EOF

    # Загрузка сервиса
    if launchctl bootstrap gui/$(id -u) "$PLIST_FILE"; then
        print_success "Launchd service создан и загружен: $PLIST_FILE"
        print_info "Сервис запущен"
    else
        print_warning "Не удалось загрузить launchd сервис, попробуйте вручную: launchctl bootstrap gui/$(id -u) $PLIST_FILE"
    fi
}

# Основная функция установки
main() {
    # Определение платформы
    detect_platform

    # Выбор директории установки
    select_installation_directory

    # Загрузка кода проекта
    download_code

    # Обновление переменных директорий
    PROJECT_DIR="$(pwd)"

    # Проверка требований
    check_requirements

    # Настройка типа установки (только один пользователь)
    select_installation_type

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

    # Создание первого пользователя (если single user режим)
    create_first_user

    # Проверка успешности настройки базы данных перед сборкой
    if [ ! -f "data/kanbe.db" ]; then
        print_error "База данных не создана. Установка не может быть завершена."
        exit 1
    fi

    # Проверка наличия таблиц в базе данных
    if command -v sqlite3 &> /dev/null; then
        TABLES_COUNT=$(sqlite3 data/kanbe.db "SELECT COUNT(*) FROM sqlite_master WHERE type='table';" 2>/dev/null || echo "0")
        if [ "$TABLES_COUNT" -eq 0 ]; then
            print_error "Таблицы базы данных не созданы. Установка не может быть завершена."
            print_info "Попробуйте выполнить 'npm run db:push' вручную"
            exit 1
        fi
    else
        print_warning "sqlite3 не найден, пропуск проверки таблиц"
    fi

    # Сборка приложения
    build_application

    # Создание системного сервиса
    case $PLATFORM in
        "linux"|"raspberry-pi")
            create_systemd_service
            ;;
        "macos")
            create_launchd_service
            ;;
    esac

    print_footer

    echo ""
    echo -e "${CYAN}📋 Информация об установке:${NC}"
    echo "   Платформа: $PLATFORM"
    echo "   Архитектура: $CPU_ARCH"
    echo "   Директория: $(pwd)"
    echo "   Тип установки: $([ "$SINGLE_USER" = "true" ] && echo "Один пользователь" || echo "Несколько пользователей")"
    echo "   База данных: $(pwd)/data/kanbe.db"
    echo ""
    echo -e "${GREEN}🚀 KanBe готов к использованию!${NC}"
    echo ""

    # Информация о управлении сервисом
    case $PLATFORM in
        "linux"|"raspberry-pi")
            echo "Команды для управления systemd сервисом:"
            echo "  Запуск: sudo systemctl start kanbe"
            echo "  Остановка: sudo systemctl stop kanbe"
            echo "  Перезапуск: sudo systemctl restart kanbe"
            echo "  Статус: sudo systemctl status kanbe"
            echo "  Логи: sudo journalctl -u kanbe -f"
            echo "  Автозапуск: sudo systemctl enable kanbe"
            ;;
        "macos")
            echo "Команды для управления launchd сервисом:"
            echo "  Запуск: launchctl start com.kanbe.app"
            echo "  Остановка: launchctl stop com.kanbe.app && launchctl unload ~/Library/LaunchAgents/com.kanbe.app.plist"
            echo "  Статус: launchctl list | grep kanbe"
            echo "  Логи: tail -f kanbe.log"
            echo "  Ручной запуск: node dist/index.js"
            ;;
        *)
            echo "Команды для управления (PM2/nohup):"
            echo "  Статус сервера: npm run status"
            echo "  Перезапуск: npm run restart"
            echo "  Остановка: npm run stop"
            echo "  Логи: npm run logs"
            ;;
    esac

    echo ""
    echo "Порты:"
    echo "  API и Фронтенд: 3000"
    if [ "$SINGLE_USER" = "true" ] && [ -n "$ADMIN_EMAIL" ]; then
        echo "  Администратор: $ADMIN_EMAIL"
    fi
    echo ""
    echo -e "${YELLOW}💡 Полезные команды:${NC}"
    echo "  Резервное копирование БД: cp data/kanbe.db data/backup_$(date +%Y%m%d_%H%M%S).db"
    echo "  Просмотр размера БД: du -h data/kanbe.db"

    # Запуск сервиса
    echo ""
    echo -e "${BLUE}🔄 Запуск KanBe сервиса...${NC}"
    case $PLATFORM in
        "linux"|"raspberry-pi")
            if command -v systemctl &> /dev/null; then
                sudo systemctl start kanbe
                sleep 3
                if sudo systemctl is-active --quiet kanbe; then
                    print_success "KanBe запущен как systemd сервис"
                    echo -e "${CYAN}🌐 Откройте браузер: http://localhost:3000${NC}"
                else
                    print_warning "Ошибка запуска systemd сервиса, пробуем PM2..."
                    if command -v pm2 &> /dev/null; then
                        npm run start:pm2
                        print_success "KanBe запущен с PM2"
                    else
                        nohup npm run start > kanbe.log 2>&1 &
                        print_success "KanBe запущен в фоне"
                    fi
                fi
            fi
            ;;
        "macos")
            # Проверяем статус сервиса после запуска
            sleep 3
            if launchctl list | grep -q kanbe; then
                print_success "KanBe запущен как launchd сервис"
                echo -e "${CYAN}🌐 Откройте браузер: http://localhost:3000${NC}"
            else
                print_warning "Ошибка запуска launchd сервиса, пробуем PM2..."
                if command -v pm2 &> /dev/null; then
                    npm run start:pm2
                    print_success "KanBe запущен с PM2"
                else
                    nohup npm run start > kanbe.log 2>&1 &
                    print_success "KanBe запущен в фоне"
                fi
            fi
            ;;
        *)
            # Запуск приложения после установки
            if command -v npm &> /dev/null; then
                echo -e "${CYAN}🌐 После запуска откройте браузер и перейдите по адресу:${NC}"
                echo -e "${CYAN}   http://localhost:3000${NC}"
                echo ""
                echo -e "${YELLOW}💡 Для управления сервером используйте команды:${NC}"
                echo -e "${YELLOW}   Остановить: npm run stop${NC}"
                echo -e "${YELLOW}   Перезапустить: npm run restart${NC}"
                echo -e "${YELLOW}   Проверить статус: npm run status${NC}"
                echo ""
                echo -e "${PURPLE}🎉 Установка завершена! KanBe запущен в фоне.${NC}"
                echo ""

                # Запуск сервера в фоне с помощью PM2
                if command -v pm2 &> /dev/null; then
                    print_info "Запуск с PM2 (рекомендуется)..."
                    npm run start:pm2
                    print_success "KanBe запущен с PM2"
                else
                    print_warning "PM2 не найден, запускаем в фоне с nohup..."
                    nohup npm run start > kanbe.log 2>&1 &
                    SERVER_PID=$!
                    echo $SERVER_PID > kanbe.pid
                    sleep 3
                    if kill -0 $SERVER_PID 2>/dev/null; then
                        print_success "KanBe запущен в фоне (PID: $SERVER_PID)"
                    else
                        print_error "Ошибка запуска сервера"
                        cat kanbe.log
                    fi
                fi
            else
                echo -e "${YELLOW}⚠️  NPM не найден. Запустите приложение вручную командой: npm run start${NC}"
            fi
            ;;
    esac
}

# Запуск основной функции
main "$@"
