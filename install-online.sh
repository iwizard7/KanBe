#!/bin/bash

# 🎯 Онлайн-установщик KanBe для Raspberry Pi
# 📥 Этот скрипт скачивает и запускает основной скрипт установки

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
    echo -e "${PURPLE}🎯 === Онлайн-установщик KanBe ===${NC}"
    echo ""
}

print_footer() {
    echo ""
    echo -e "${GREEN}🚀 Установка завершена! Добро пожаловать в KanBe!${NC}"
}

# Проверка ОС
print_header

print_step "Проверка операционной системы..."
if [[ "$OSTYPE" != "linux-gnu"* ]]; then
    print_error "Этот скрипт предназначен для Linux (Debian на Raspberry Pi)"
    echo "Текущая ОС: $OSTYPE"
    exit 1
fi
print_success "Операционная система проверена"

# Сохранение текущей директории
ORIGINAL_DIR="$(pwd)"
print_info "Исходная директория: $ORIGINAL_DIR"

# Создание временной директории для установки
print_step "Создание временной директории..."
TEMP_DIR=$(mktemp -d)
if [ -z "$TEMP_DIR" ] || [ ! -d "$TEMP_DIR" ]; then
    print_error "Не удалось создать временную директорию"
    exit 1
fi
print_success "Временная директория создана: $TEMP_DIR"

# Функция очистки при выходе
cleanup() {
    if [ -n "$TEMP_DIR" ] && [ -d "$TEMP_DIR" ]; then
        print_info "Очистка временной директории..."
        rm -rf "$TEMP_DIR" 2>/dev/null || true
    fi
}
trap cleanup EXIT

# Переход в временную директорию
print_step "Переход в рабочую директорию..."
if ! cd "$TEMP_DIR"; then
    print_error "Не удалось перейти в директорию $TEMP_DIR"
    exit 1
fi
print_success "Рабочая директория установлена"

# Скачивание скрипта установки с повторными попытками
print_step "Скачивание скрипта установки..."
MAX_ATTEMPTS=3
for ((i=1; i<=MAX_ATTEMPTS; i++)); do
    echo -e "📥 Попытка $i из $MAX_ATTEMPTS..."
    if curl -fsSL --connect-timeout 30 --max-time 300 -o "install.sh" "https://raw.githubusercontent.com/iwizard7/KanBe/main/install.sh"; then
        print_success "Скрипт установки успешно скачан"
        break
    else
        print_warning "Ошибка скачивания на попытке $i"
        if [ $i -eq $MAX_ATTEMPTS ]; then
            print_error "Не удалось скачать скрипт после $MAX_ATTEMPTS попыток"
            exit 1
        fi
        echo "⏳ Повторная попытка через 2 секунды..."
        sleep 2
    fi
done

# Проверка существования файла
if [ ! -f "install.sh" ]; then
    print_error "Файл install.sh не найден после скачивания"
    exit 1
fi

# Проверка размера файла
if [ ! -s "install.sh" ]; then
    print_error "Скачанный файл install.sh пустой"
    exit 1
fi

print_success "Файл скрипта проверен"

# Установка прав на выполнение
print_step "Настройка прав доступа..."
chmod +x install.sh

# Проверка прав выполнения
if [ ! -x "install.sh" ]; then
    print_error "Не удалось установить права выполнения на install.sh"
    exit 1
fi
print_success "Права доступа настроены"

# Функция проверки свободного места
check_disk_space() {
    local min_space_mb=500  # Минимально необходимое место в МБ
    local temp_dir="/tmp"

    echo -e "${CYAN}🔍 Проверка свободного места на диске...${NC}"

    # Проверка места в /tmp
    local temp_space=$(df "$temp_dir" | awk 'NR==2 {print int($4/1024)}')
    echo "Свободное место в $temp_dir: ${temp_space}MB"

    if [ "$temp_space" -lt "$min_space_mb" ]; then
        echo -e "${YELLOW}⚠️  Недостаточно места в $temp_dir (${temp_space}MB < ${min_space_mb}MB)${NC}"

        # Попытка очистки временных файлов
        echo -e "${CYAN}🧹 Попытка очистки временных файлов...${NC}"
        sudo find /tmp -type f -mtime +1 -delete 2>/dev/null || true
        sudo find /tmp -type d -mtime +1 -exec rm -rf {} + 2>/dev/null || true

        # Проверка после очистки
        temp_space=$(df "$temp_dir" | awk 'NR==2 {print int($4/1024)}')
        echo "Свободное место после очистки: ${temp_space}MB"

        if [ "$temp_space" -lt "$min_space_mb" ]; then
            echo -e "${RED}❌ Критически недостаточно места для установки${NC}"
            echo ""
            echo -e "${YELLOW}🔧 Рекомендации по освобождению места:${NC}"
            echo ""
            echo "1. Очистите временные файлы:"
            echo "   sudo find /tmp -type f -mtime +1 -delete"
            echo "   sudo apt-get clean"
            echo "   sudo apt-get autoclean"
            echo ""
            echo "2. Удалите ненужные пакеты:"
            echo "   sudo apt-get autoremove"
            echo ""
            echo "3. Очистите npm кэш:"
            echo "   npm cache clean --force"
            echo ""
            echo "4. Проверьте использование диска:"
            echo "   df -h"
            echo "   du -sh /* 2>/dev/null | sort -hr | head -10"
            echo ""
            echo -e "${YELLOW}Требуется минимум ${min_space_mb}MB свободного места${NC}"
            exit 1
        fi
    fi

    print_success "Дисковое пространство проверено"
}

# Проверка дискового пространства перед установкой
check_disk_space

# Финальная информация перед запуском
echo ""
echo -e "${CYAN}📋 Информация о запуске:${NC}"
echo "   Текущая директория: $(pwd)"
echo "   Файл скрипта: $(ls -la install.sh)"
echo ""

print_step "Запуск основного скрипта установки..."
echo -e "${GREEN}🎯 KanBe будет установлен автоматически!${NC}"
echo ""

# Запуск скрипта установки с сохранением переменных окружения
exec bash install.sh
