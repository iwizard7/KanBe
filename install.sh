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

# Запрос типа установки (один пользователь или несколько)
select_installation_type() {
    print_step "Выбор типа установки..."

    echo ""
    echo "=== Тип установки ==="
    echo "Выберите тип установки:"
    echo "1) Для одного пользователя (отключить регистрацию в UI)"
    echo "2) Для нескольких пользователей (включить регистрацию в UI)"
    echo ""
    read -p "Выберите тип (1 или 2): " INSTALL_TYPE

    case $INSTALL_TYPE in
        "1")
            SINGLE_USER=true
            print_info "Выбрана установка для одного пользователя"
            print_info "Регистрация в UI будет отключена"
            ;;
        "2")
            SINGLE_USER=false
            print_info "Выбрана установка для нескольких пользователей"
            print_info "Регистрация в UI будет включена"
            ;;
        *)
            print_warning "Неверный выбор, используется установка для нескольких пользователей"
            SINGLE_USER=false
            ;;
    esac
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

    # Генерация секрета для сессий
    read -p "Введите секрет для сессий (оставьте пустым для генерации): " SESSION_SECRET
    if [ -z "$SESSION_SECRET" ]; then
        if command -v openssl &> /dev/null; then
            SESSION_SECRET=$(openssl rand -hex 32)
        else
            SESSION_SECRET="default-secret-$(date +%s)"
        fi
        print_info "Сгенерирован секрет сессии: $SESSION_SECRET"
    fi

    # Создание .env файла с фиксированными портами
    cat > .env << EOF
NODE_ENV=production
PORT=5010
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
        npm run build
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
            git pull origin main || git pull origin master
            if [ $? -eq 0 ]; then
                print_success "Репозиторий обновлен"
            else
                print_warning "Не удалось обновить репозиторий, продолжаем с текущей версией"
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
    read -p "Установить KanBe в текущую директорию? (y/n): " USE_CURRENT_DIR

    if [[ $USE_CURRENT_DIR =~ ^[Nn]$ ]]; then
        read -p "Введите путь для установки KanBe: " INSTALL_DIR

        # Проверка существования директории
        if [ ! -d "$INSTALL_DIR" ]; then
            echo "Директория $INSTALL_DIR не существует."
            read -p "Создать директорию? (y/n): " CREATE_DIR
            if [[ $CREATE_DIR =~ ^[Yy]$ ]]; then
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

# Создание первого пользователя (только для single user установки)
create_first_user() {
    # Пропускаем создание пользователя если не single user режим
    if [ "$SINGLE_USER" != "true" ]; then
        print_info "Пропуск создания пользователя (режим нескольких пользователей)"
        return 0
    fi

    print_step "Создание первого пользователя..."

    echo ""
    echo "=== Создание администратора ==="
    read -p "Email для администратора: " ADMIN_EMAIL
    read -s -p "Пароль для администратора: " ADMIN_PASSWORD
    echo ""

    if [ -z "$ADMIN_EMAIL" ] || [ -z "$ADMIN_PASSWORD" ]; then
        print_warning "Email и пароль обязательны для single user режима"
        return 1
    fi

    # Проверяем, что база данных существует и таблицы созданы
    if [ ! -f "kanbe.db" ]; then
        print_error "База данных не найдена. Убедитесь, что настройка БД выполнена."
        return 1
    fi

    # Создание временного скрипта для создания пользователя
    cat > create_admin.js << 'EOF'
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './shared/schema.js';
import bcrypt from 'bcrypt';

console.log('Создание администратора...');

const sqlite = new Database('./kanbe.db');
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

    # Запуск скрипта создания пользователя
    if [ -f "create_admin.js" ]; then
        npx tsx create_admin.js "$ADMIN_EMAIL" "$ADMIN_PASSWORD"
        rm -f create_admin.js
        print_success "Администратор создан: $ADMIN_EMAIL"
    else
        print_error "Ошибка: файл create_admin.js не создан"
        return 1
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

    # Выбор типа установки (один/несколько пользователей)
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

    # Сборка приложения
    build_application

    print_footer

    echo ""
    echo -e "${CYAN}📋 Информация об установке:${NC}"
    echo "   Платформа: $PLATFORM"
    echo "   Архитектура: $CPU_ARCH"
    echo "   Директория: $(pwd)"
    echo "   Тип установки: $([ "$SINGLE_USER" = "true" ] && echo "Один пользователь" || echo "Несколько пользователей")"
    echo ""
    echo -e "${GREEN}🚀 KanBe готов к запуску!${NC}"
    echo ""
    echo "Команды для запуска:"
    echo "  Разработка: npm run dev (API) + npm run dev:client (фронтенд)"
    echo "  Продакшн: npm run start"
    echo ""
    echo "Порты:"
    echo "  API: 5010"
    echo "  Фронтенд: 3000"
    if [ "$SINGLE_USER" = "true" ] && [ -n "$ADMIN_EMAIL" ]; then
        echo "  Администратор: $ADMIN_EMAIL"
    fi

    # Запуск приложения после установки
    echo ""
    echo -e "${BLUE}🔄 Запуск KanBe...${NC}"
    if command -v npm &> /dev/null; then
        echo -e "${CYAN}🌐 После запуска откройте браузер и перейдите по адресу:${NC}"
        echo -e "${CYAN}   http://localhost:5010${NC}"
        echo ""
        echo -e "${YELLOW}💡 Для остановки сервера нажмите Ctrl+C${NC}"
        echo ""
        echo -e "${PURPLE}🎉 Установка завершена! Запуск приложения...${NC}"
        echo ""

        # Запуск сервера в foreground (не в background)
        npm run start
    else
        echo -e "${YELLOW}⚠️  NPM не найден. Запустите приложение вручную командой: npm run start${NC}"
    fi
}

# Запуск основной функции
main "$@"
