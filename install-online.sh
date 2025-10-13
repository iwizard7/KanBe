#!/bin/bash

# Онлайн-установщик KanBe для Raspberry Pi
# Этот скрипт скачивает и запускает основной скрипт установки

# Отключение строгого режима для pipe
set +e

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

# Функция очистки при выходе
cleanup() {
    if [ -n "$TEMP_DIR" ] && [ -d "$TEMP_DIR" ]; then
        rm -rf "$TEMP_DIR"
    fi
}
trap cleanup EXIT

# Переход в временную директорию
if ! cd "$TEMP_DIR"; then
    echo "Ошибка: не удалось перейти в директорию $TEMP_DIR"
    exit 1
fi

# Скачивание скрипта установки
echo "Скачивание скрипта установки..."
if ! curl -fsSL -o "install.sh" https://raw.githubusercontent.com/iwizard7/KanBe/main/install.sh; then
    echo "Ошибка скачивания скрипта установки"
    exit 1
fi

echo "Скрипт установки успешно скачан"

# Установка прав на выполнение
chmod +x install.sh

# Запуск скрипта установки
echo "Запуск установки..."
exec bash install.sh