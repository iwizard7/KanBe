#!/bin/bash

# Онлайн-установщик KanBe для Raspberry Pi
# Этот скрипт скачивает и запускает основной скрипт установки

echo "=== Онлайн-установщик KanBe ==="
echo ""

# Проверка ОС
if [[ "$OSTYPE" != "linux-gnu"* ]]; then
    echo "Этот скрипт предназначен для Linux (Debian на Raspberry Pi)"
    echo "Текущая ОС: $OSTYPE"
    exit 1
fi

# Сохранение текущей директории
ORIGINAL_DIR="$(pwd)"
echo "Исходная директория: $ORIGINAL_DIR"

# Создание временной директории для установки
TEMP_DIR=$(mktemp -d)
echo "Создание временной директории: $TEMP_DIR"

# Функция очистки при выходе
cleanup() {
    if [ -n "$TEMP_DIR" ] && [ -d "$TEMP_DIR" ]; then
        echo "Очистка временной директории: $TEMP_DIR"
        rm -rf "$TEMP_DIR" 2>/dev/null || true
    fi
}
trap cleanup EXIT

# Переход в временную директорию
echo "Переход в временную директорию..."
if ! cd "$TEMP_DIR"; then
    echo "Ошибка: не удалось перейти в директорию $TEMP_DIR"
    exit 1
fi

# Проверка существования временной директории
if [ ! -d "$TEMP_DIR" ]; then
    echo "Ошибка: временная директория не существует"
    exit 1
fi

# Скачивание скрипта установки с повторными попытками
echo "Скачивание скрипта установки..."
MAX_ATTEMPTS=3
for ((i=1; i<=MAX_ATTEMPTS; i++)); do
    echo "Попытка $i из $MAX_ATTEMPTS..."
    if curl -fsSL --connect-timeout 30 --max-time 300 -o "install.sh" "https://raw.githubusercontent.com/iwizard7/KanBe/main/install.sh"; then
        echo "Скрипт установки успешно скачан"
        break
    else
        echo "Ошибка скачивания на попытке $i"
        if [ $i -eq $MAX_ATTEMPTS ]; then
            echo "Не удалось скачать скрипт после $MAX_ATTEMPTS попыток"
            exit 1
        fi
        sleep 2
    fi
done

# Проверка существования файла
if [ ! -f "install.sh" ]; then
    echo "Ошибка: файл install.sh не найден после скачивания"
    exit 1
fi

# Проверка размера файла
if [ ! -s "install.sh" ]; then
    echo "Ошибка: скачанный файл install.sh пустой"
    exit 1
fi

# Установка прав на выполнение
chmod +x install.sh

# Проверка прав выполнения
if [ ! -x "install.sh" ]; then
    echo "Ошибка: не удалось установить права выполнения на install.sh"
    exit 1
fi

echo "Запуск скрипта установки..."
echo "Текущая директория: $(pwd)"
echo "Файл скрипта: $(ls -la install.sh)"

# Запуск скрипта установки с сохранением переменных окружения
exec bash install.sh
