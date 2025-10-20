#!/usr/bin/env node

/**
 * Специальная конфигурация для Raspberry Pi 3
 * Оптимизации производительности и памяти
 */

const os = require('os');
const fs = require('fs');
const path = require('path');

// Определение Raspberry Pi
function isRaspberryPi() {
  try {
    const model = fs.readFileSync('/proc/device-tree/model', 'utf8');
    return model.includes('Raspberry Pi');
  } catch {
    return false;
  }
}

// Получение информации о системе
function getSystemInfo() {
  return {
    platform: os.platform(),
    arch: os.arch(),
    totalMemory: os.totalmem(),
    freeMemory: os.freemem(),
    cpus: os.cpus().length,
    loadAverage: os.loadavg(),
    isRaspberryPi: isRaspberryPi()
  };
}

// Оптимизации для Raspberry Pi
function applyRaspberryPiOptimizations() {
  const sysInfo = getSystemInfo();

  if (!sysInfo.isRaspberryPi) {
    console.log('❌ Это не Raspberry Pi. Оптимизации не применены.');
    return false;
  }

  console.log('🔧 Применение оптимизаций для Raspberry Pi 3...');
  console.log(`📊 Системная информация:`, {
    'Процессор': `${sysInfo.cpus} ядер`,
    'Память': `${Math.round(sysInfo.totalMemory / 1024 / 1024)}MB`,
    'Загрузка': sysInfo.loadAverage.map(x => x.toFixed(2)).join(', ')
  });

  // Установка переменных окружения для оптимизации
  process.env.NODE_OPTIONS = [
    process.env.NODE_OPTIONS,
    '--max-old-space-size=256',  // Ограничение heap до 256MB
    '--optimize-for-size',      // Оптимизация для размера
    '--max-semi-space-size=16', // Уменьшение semi-space
    '--noconcurrent-sweeping'   // Отключение concurrent sweeping
  ].filter(Boolean).join(' ');

  // Оптимизации для libuv (Node.js thread pool)
  process.env.UV_THREADPOOL_SIZE = '2'; // Только 2 потока для Raspberry Pi

  // Оптимизации для SQLite
  process.env.SQLITE_BUSY_TIMEOUT = '30000'; // 30 секунд таймаут
  process.env.SQLITE_CACHE_SIZE = '-2000';   // 2MB cache
  process.env.SQLITE_SYNCHRONOUS = 'NORMAL'; // Более быстрая синхронизация
  process.env.SQLITE_JOURNAL_MODE = 'WAL';   // Write-Ahead Logging

  // Оптимизации для Express
  process.env.COMPRESSION_LEVEL = '1'; // Минимальный уровень сжатия

  console.log('✅ Оптимизации для Raspberry Pi применены');
  console.log('📋 Переменные окружения:');
  console.log(`   NODE_OPTIONS: ${process.env.NODE_OPTIONS}`);
  console.log(`   UV_THREADPOOL_SIZE: ${process.env.UV_THREADPOOL_SIZE}`);
  console.log(`   SQLITE_BUSY_TIMEOUT: ${process.env.SQLITE_BUSY_TIMEOUT}`);

  return true;
}

// Мониторинг производительности
function startPerformanceMonitoring() {
  const startTime = process.hrtime.bigint();
  let lastMemoryUsage = process.memoryUsage();

  setInterval(() => {
    const currentMemory = process.memoryUsage();
    const uptime = Number(process.hrtime.bigint() - startTime) / 1e9;

    console.log(`📊 Производительность [${uptime.toFixed(0)}s]:`, {
      'RSS': `${Math.round(currentMemory.rss / 1024 / 1024)}MB`,
      'Heap Used': `${Math.round(currentMemory.heapUsed / 1024 / 1024)}MB`,
      'Heap Total': `${Math.round(currentMemory.heapTotal / 1024 / 1024)}MB`,
      'External': `${Math.round(currentMemory.external / 1024 / 1024)}MB`
    });

    lastMemoryUsage = currentMemory;
  }, 30000); // Каждые 30 секунд
}

// Экспорт функций
module.exports = {
  isRaspberryPi,
  getSystemInfo,
  applyRaspberryPiOptimizations,
  startPerformanceMonitoring
};

// Автоматическое применение оптимизаций при запуске
if (require.main === module) {
  console.log('🚀 Raspberry Pi Configuration Tool');
  console.log('=====================================');

  if (applyRaspberryPiOptimizations()) {
    console.log('\n💡 Рекомендации для Raspberry Pi 3:');
    console.log('   • Используйте внешний SSD для базы данных');
    console.log('   • Мониторьте температуру: vcgencmd measure_temp');
    console.log('   • Ограничьте количество одновременных пользователей');
    console.log('   • Используйте nginx как reverse proxy для кеширования');

    // Запуск мониторинга в фоне
    startPerformanceMonitoring();
  }
}
