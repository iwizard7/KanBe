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

# Создание временной директории для установки в постоянном хранилище
print_step "Создание временной директории..."
# Используем /var/tmp вместо /tmp для постоянного хранения
TEMP_DIR="/var/tmp/kanbe-install-$(date +%s)"
if ! mkdir -p "$TEMP_DIR"; then
    # Альтернатива: использовать домашнюю директорию
    TEMP_DIR="$HOME/kanbe-install-$(date +%s)"
    if ! mkdir -p "$TEMP_DIR"; then
        print_error "Не удалось создать временную директорию"
        exit 1
    fi
fi

# Проверка создания директории
if [ ! -d "$TEMP_DIR" ]; then
    print_error "Временная директория не существует после создания"
    exit 1
fi

# Установка правильных прав доступа
chmod 755 "$TEMP_DIR"
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

# Предварительная очистка для освобождения места
print_step "Подготовка места для скачивания..."
echo -e "${CYAN}🧹 Очистка кэшей перед скачиванием...${NC}"
sudo find /var/cache -type f -delete 2>/dev/null || true
sudo find /var/log -name '*.log' -type f -exec truncate -s 0 {} + 2>/dev/null || true

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
            echo ""
            echo -e "${YELLOW}🔧 Возможные решения:${NC}"
            echo "1. Проверьте подключение к интернету"
            echo "2. Попробуйте позже или используйте локальную копию"
            echo "3. Скачайте скрипт вручную: curl -o install.sh https://raw.githubusercontent.com/iwizard7/KanBe/main/install.sh"
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

    echo -e "${CYAN}🔍 Проверка свободного места на диске...${NC}"

    # Проверяем место в корневом разделе (постоянное хранилище)
    local root_space=$(df / | awk 'NR==2 {print int($4/1024)}')
    local root_device=$(df / | awk 'NR==2 {print $1}')
    echo "Основное хранилище ($root_device): ${root_space}MB свободно"

    # Проверяем место в /var/tmp (если существует)
    if [ -d "/var/tmp" ]; then
        local var_space=$(df /var/tmp | awk 'NR==2 {print int($4/1024)}')
        echo "Хранилище /var/tmp: ${var_space}MB свободно"
    fi

    # Проверяем место в домашней директории
    local home_space=$(df "$HOME" | awk 'NR==2 {print int($4/1024)}')
    echo "Домашняя директория: ${home_space}MB свободно"

    # Используем наибольшее значение среди постоянных хранилищ
    local available_space=$root_space
    if [ -d "/var/tmp" ] && [ "$var_space" -gt "$available_space" ]; then
        available_space=$var_space
    fi
    if [ "$home_space" -gt "$available_space" ]; then
        available_space=$home_space
    fi

    echo "Используется наибольшее значение: ${available_space}MB"

    if [ "$available_space" -lt "$min_space_mb" ]; then
        echo -e "${YELLOW}⚠️  Недостаточно места в постоянном хранилище (${available_space}MB < ${min_space_mb}MB)${NC}"

        # Попытка очистки временных файлов в постоянном хранилище
        echo -e "${CYAN}🧹 Попытка очистки временных файлов...${NC}"

        # Очищаем /var/tmp если существует
        if [ -d "/var/tmp" ]; then
            sudo find /var/tmp -type f -mtime +1 -delete 2>/dev/null || true
            sudo find /var/tmp -type d -mtime +1 -exec rm -rf {} + 2>/dev/null || true
        fi

        # Очищаем кэш в домашней директории
        if [ -d "$HOME/.npm" ]; then
            npm cache clean --force 2>/dev/null || true
        fi

        # Очищаем системные кэши
        sudo apt-get clean 2>/dev/null || true
        sudo apt-get autoclean 2>/dev/null || true

        # Проверка после очистки
        root_space=$(df / | awk 'NR==2 {print int($4/1024)}')
        available_space=$root_space

        if [ -d "/var/tmp" ]; then
            var_space=$(df /var/tmp | awk 'NR==2 {print int($4/1024)}')
            if [ "$var_space" -gt "$available_space" ]; then
                available_space=$var_space
            fi
        fi

        echo "Свободное место после очистки: ${available_space}MB"

        if [ "$available_space" -lt "$min_space_mb" ]; then
            echo -e "${RED}❌ Критически недостаточно места в постоянном хранилище${NC}"
            echo ""
            echo -e "${YELLOW}🔧 Рекомендации по освобождению места:${NC}"
            echo ""
            echo "1. Очистите кэш пакетного менеджера:"
            echo "   sudo apt-get clean && sudo apt-get autoclean"
            echo "   sudo apt-get autoremove"
            echo ""
            echo "2. Очистите npm кэш:"
            echo "   npm cache clean --force"
            echo ""
            echo "3. Удалите ненужные файлы из /var/tmp:"
            echo "   sudo find /var/tmp -type f -mtime +1 -delete"
            echo ""
            echo "4. Проверьте использование диска:"
            echo "   df -h"
            echo "   du -sh /var/* /home/* 2>/dev/null | sort -hr | head -10"
            echo ""
            echo "5. Увеличьте размер раздела (если возможно):"
            echo "   sudo raspi-config (Advanced Options -> Expand Filesystem)"
            echo ""
            echo -e "${YELLOW}Требуется минимум ${min_space_mb}MB свободного места в постоянном хранилище${NC}"
            exit 1
        fi
    fi

    print_success "Дисковое пространство проверено (${available_space}MB доступно)"
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
