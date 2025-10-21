#!/bin/bash

# Тестовый скрипт для проверки исправлений установки KanBe на Raspberry Pi

echo "🧪 Тестирование исправлений установки KanBe на Raspberry Pi..."
echo ""

# Проверка наличия исправленного install.sh
if [ ! -f "install.sh" ]; then
    echo "❌ Файл install.sh не найден"
    exit 1
fi

# Проверка исправления NODE_OPTIONS в install.sh
if grep -q "max-old-space-size-semispace" install.sh; then
    echo "❌ Найден неправильный флаг max-old-space-size-semispace в install.sh"
    exit 1
else
    echo "✅ Правильный флаг NODE_OPTIONS найден в install.sh"
fi

# Проверка увеличенного лимита памяти
if grep -q "max-old-space-size=1024" install.sh; then
    echo "✅ Лимит памяти увеличен до 1024MB"
else
    echo "❌ Лимит памяти не увеличен"
    exit 1
fi

# Проверка добавления флага --no-package-lock
if grep -q "no-package-lock" install.sh; then
    echo "✅ Флаг --no-package-lock добавлен"
else
    echo "❌ Флаг --no-package-lock не найден"
    exit 1
fi

# Проверка увеличенного таймаута
if grep -q "timeout=900000" install.sh; then
    echo "✅ Таймаут увеличен до 900 секунд"
else
    echo "❌ Таймаут не увеличен"
    exit 1
fi

echo ""
echo "🎉 Все исправления применены успешно!"
echo ""
echo "📋 Следующие шаги для тестирования на Raspberry Pi:"
echo "1. Скопируйте исправленный install.sh на Raspberry Pi"
echo "2. Запустите: chmod +x install.sh"
echo "3. Запустите: ./install.sh"
echo "4. Дождитесь завершения установки"
echo ""
echo "🔍 Что было исправлено:"
echo "• Неправильный флаг --max-old-space-size-semispace исправлен на --max-old-space-size"
echo "• Лимит памяти увеличен с 512MB до 1024MB"
echo "• Добавлен флаг --no-package-lock для избежания конфликтов"
echo "• Таймаут увеличен до 900 секунд для медленных систем"
echo ""
echo "🚀 Удачи с установкой KanBe на Raspberry Pi!"
