#!/usr/bin/env node

/**
 * KanBe Password Reset Utility
 * 
 * Утилита для сброса пароля администратора KanBe приложения.
 * Поддерживает интерактивный и неинтерактивный режимы работы.
 * 
 * Usage:
 *   node reset-password.js                         # Интерактивный режим с подтверждением
 *   node reset-password.js --password "new-pass"   # Неинтерактивный режим
 *   node reset-password.js --help                  # Показать справку
 *   npm run reset-password                         # Через npm скрипт
 * 
 * Requirements:
 *   - bcryptjs: для хеширования пароля
 *   - data/config.json: файл конфигурации (создается автоматически)
 */

const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const CONFIG_FILE = path.join(__dirname, 'data', 'config.json');
const DATA_DIR = path.join(__dirname, 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
}

// Parse command line arguments
const args = process.argv.slice(2);
const helpIndex = args.indexOf('--help');
const passwordIndex = args.indexOf('--password');
const newPassword = passwordIndex !== -1 && args[passwordIndex + 1]
    ? args[passwordIndex + 1]
    : null;

// Show help if requested
if (helpIndex !== -1 || args.includes('-h')) {
    console.log(`
╔═══════════════════════════════════════════════════════╗
║      KanBe - Утилита сброса пароля администратора      ║
╚═══════════════════════════════════════════════════════╝

ИСПОЛЬЗОВАНИЕ:
  node reset-password.js                      Интерактивный режим
  node reset-password.js --password <пароль>  Неинтерактивный режим
  npm run reset-password                      Через npm скрипт

ОПЦИИ:
  --password <пароль>   Установить новый пароль напрямую
  --help, -h            Показать эту справку

ПРИМЕРЫ:
  node reset-password.js
  node reset-password.js --password "myNewPassword123"
  npm run reset-password

ПРИМЕЧАНИЯ:
  • Пароль должен быть не менее 4 символов
  • В интерактивном режиме требуется подтверждение
  • Хеш пароля сохраняется в data/config.json
`);
    process.exit(0);
}


async function resetPassword(password) {
    try {
        console.log('\n🔐 Генерация хеша пароля...');
        const hash = bcrypt.hashSync(password, 10);

        const config = { passwordHash: hash };
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));

        console.log('✅ Пароль успешно обновлен!');
        console.log(`📁 Конфигурация сохранена в: ${CONFIG_FILE}`);
        console.log('\n💡 Теперь вы можете войти в систему с новым паролем.\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Ошибка при сбросе пароля:', error.message);
        process.exit(1);
    }
}

if (newPassword) {
    // Non-interactive mode
    console.log('\n🔄 Сброс пароля...');
    resetPassword(newPassword);
} else {
    // Interactive mode
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    console.log('\n╔═══════════════════════════════════════╗');
    console.log('║   KanBe - Сброс пароля администратора  ║');
    console.log('╚═══════════════════════════════════════╝\n');

    rl.question('Введите новый пароль: ', (password) => {
        if (!password || password.length < 4) {
            console.log('\n❌ Пароль должен быть не менее 4 символов!');
            rl.close();
            process.exit(1);
        }

        rl.question('Подтвердите пароль: ', (confirm) => {
            rl.close();

            if (password !== confirm) {
                console.log('\n❌ Пароли не совпадают!');
                process.exit(1);
            }

            resetPassword(password);
        });
    });
}
