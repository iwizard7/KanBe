#!/bin/bash

# Онлайн-установщик KanBe для Raspberry Pi
# Этот скрипт скачивает и запускает основной скрипт установки

set -e

echo "=== Онлайн-установщик KanBe ==="
echo ""

# Проверка ОС
if [[ "$OSTYPE" != "linux-gnu"* ]]; then
    echo "Этот скрипт предназначен для Linux (Debian на Raspberry Pi)"
    echo "Текущая ОС: $OSTYPE"
    exit 1
fi

# Создание временной директории для установки
TEMP_DIR=$(mktemp -d)
echo "Создание временной директории: $TEMP_DIR"

# Переход в временную директорию
cd "$TEMP_DIR"

# Скачивание скрипта установки
echo "Скачивание скрипта установки..."
if curl -fsSL -o "install.sh" https://raw.githubusercontent.com/iwizard7/KanBe/main/install.sh; then
    echo "Скрипт установки успешно скачан"
else
    echo "Ошибка скачивания скрипта установки"
    cd /
    rm -rf "$TEMP_DIR"
    exit 1
fi

# Установка прав на выполнение
chmod +x install.sh

# Запуск скрипта установки
echo "Запуск установки..."
exec bash install.sh

# Очистка (не выполнится из-за exec)
cd /
rm -rf "$TEMP_DIR"