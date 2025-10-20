# 🚀 KanBe на Raspberry Pi 3 - Полное руководство по оптимизации

## 📋 Обзор

Это руководство поможет вам оптимизировать KanBe для работы на Raspberry Pi 3 с максимальной производительностью и минимальным потреблением ресурсов.

## 🔧 Системные требования

### Минимальные требования:
- **Raspberry Pi 3 Model B/B+**
- **Оперативная память:** 1GB (рекомендуется 2GB+ для лучшей производительности)
- **Хранилище:** microSD карта Class 10, 16GB+ (рекомендуется SSD через USB)
- **ОС:** Raspberry Pi OS (64-bit Lite или Desktop)
- **Node.js:** 18.0.0+

### Рекомендуемая конфигурация:
- **Raspberry Pi 4** (4GB RAM)
- **Внешний SSD** через USB 3.0
- **Активное охлаждение** (вентилятор)
- **Стабильное питание** (3A+)

## ⚡ Быстрая установка

```bash
# 1. Обновите систему
sudo apt update && sudo apt upgrade -y

# 2. Установите Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Клонируйте и установите KanBe
git clone https://github.com/iwizard7/KanBe.git
cd KanBe
npm run setup:raspberry-pi

# 4. Запустите оптимизированную версию
npm run start:raspberry-pi
```

## 🛠️ Оптимизации производительности

### 1. Node.js оптимизации

Автоматически применяются при запуске на Raspberry Pi:

```javascript
// Ограничение памяти heap до 256MB
--max-old-space-size=256

// Оптимизация для размера кода
--optimize-for-size

// Уменьшение thread pool до 2 потоков
UV_THREADPOOL_SIZE=2
```

### 2. База данных SQLite

Оптимизации для медленных SD-карт:

```sql
-- WAL режим для лучшей производительности
PRAGMA journal_mode = WAL;

-- Увеличенный таймаут для медленного I/O
PRAGMA busy_timeout = 30000;

-- Ограниченный кеш 2MB
PRAGMA cache_size = -2000;

-- Оптимизированная синхронизация
PRAGMA synchronous = NORMAL;
```

### 3. Systemd сервис

Специальная конфигурация для Raspberry Pi:

```ini
[Service]
# Ограничение памяти
MemoryLimit=256M

# Ограничение CPU (50% от одного ядра)
CPUQuota=50%

# Пониженный приоритет
Nice=10

# Оптимизированные переменные окружения
Environment=NODE_OPTIONS=--max-old-space-size=256 --optimize-for-size
Environment=UV_THREADPOOL_SIZE=2
Environment=SQLITE_BUSY_TIMEOUT=30000
```

## 📊 Мониторинг производительности

### Встроенный мониторинг

```bash
# Запуск мониторинга производительности
npm run pi:monitor

# Получение информации о системе
npm run pi:info

# Проверка конфигурации
npm run pi:config
```

### Ручной мониторинг

```bash
# Температура процессора
vcgencmd measure_temp

# Использование CPU
top -p $(pgrep -f "node.*kanbe")

# Использование памяти
ps aux --no-headers -o pmem,comm -C node | grep kanbe

# Статистика диска
iostat -x 1

# SQLite статистика
sqlite3 data/kanbe.db "PRAGMA stats;"
```

## 🔧 Расширенные оптимизации

### 1. Внешний SSD

```bash
# Найти SSD диск
lsblk

# Создать раздел (пример для /dev/sda)
sudo fdisk /dev/sda
# Создать раздел и отформатировать в ext4

# Смонтировать SSD
sudo mkdir /mnt/ssd
sudo mount /dev/sda1 /mnt/ssd

# Добавить в fstab для автозамонтирования
echo '/dev/sda1 /mnt/ssd ext4 defaults,noatime 0 0' | sudo tee -a /etc/fstab

# Переместить базу данных
sudo mv data /mnt/ssd/
sudo ln -s /mnt/ssd/data data
```

### 2. Swap файл

```bash
# Создать swap файл 1GB
sudo fallocate -l 1G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Добавить в fstab
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 3. Nginx reverse proxy

```bash
# Установка nginx
sudo apt install nginx

# Конфигурация для KanBe
sudo tee /etc/nginx/sites-available/kanbe << EOF
server {
    listen 80;
    server_name localhost;

    # Gzip сжатие
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Кеширование статических файлов
    location /assets/ {
        proxy_pass http://localhost:3000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API прокси
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }

    # Основной прокси
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Включить сайт
sudo ln -s /etc/nginx/sites-available/kanbe /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 4. Оптимизация Raspberry Pi OS

```bash
# Отключить GUI (если используете Lite версию)
sudo systemctl set-default multi-user.target

# Оптимизация GPU памяти (если не используете GUI)
# В /boot/config.txt добавить:
# gpu_mem=16

# Отключить swap
# sudo systemctl disable dphys-swapfile

# Настроить CPU governor
echo 'performance' | sudo tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor
```

## 🚨 Устранение неисправностей

### Проблема: Недостаточно памяти

```bash
# Проверить использование памяти
free -h

# Уменьшить heap size в .env
NODE_OPTIONS=--max-old-space-size=128

# Перезапустить сервис
sudo systemctl restart kanbe
```

### Проблема: Медленная база данных

```bash
# Проверить статистику SQLite
sqlite3 data/kanbe.db "PRAGMA stats;"

# Очистить WAL файл
sqlite3 data/kanbe.db "PRAGMA wal_checkpoint(TRUNCATE);"

# Перестроить индексы
npm run db:push
```

### Проблема: Высокая температура

```bash
# Мониторинг температуры
watch -n 1 vcgencmd measure_temp

# Установка охлаждения
sudo apt install raspi-config
# В raspi-config включить fan control
```

### Проблема: Низкая производительность сети

```bash
# Проверить скорость сети
iperf3 -c speedtest.net

# Оптимизировать WiFi (если используется)
# В /boot/config.txt добавить:
# dtoverlay=pi3-disable-wifi
# dtoverlay=pi3-disable-bt
```

## 📈 Производительность

### Ожидаемая производительность на Raspberry Pi 3:

- **Время запуска:** 15-30 секунд
- **Потребление памяти:** 150-250MB
- **CPU нагрузка:** 20-50% при активном использовании
- **Одновременные пользователи:** 2-5
- **Запросы/сек:** 50-100

### С Raspberry Pi 4 (4GB):
- **Время запуска:** 5-15 секунд
- **Потребление памяти:** 200-400MB
- **CPU нагрузка:** 10-30%
- **Одновременные пользователи:** 5-15
- **Запросы/сек:** 100-300

## 🔧 Полезные команды

```bash
# Управление сервисом
sudo systemctl start kanbe      # Запуск
sudo systemctl stop kanbe       # Остановка
sudo systemctl restart kanbe    # Перезапуск
sudo systemctl status kanbe     # Статус
sudo journalctl -u kanbe -f     # Логи

# Резервное копирование
tar -czf backup_$(date +%Y%m%d_%H%M%S).tar.gz data/

# Мониторинг ресурсов
htop                            # Интерактивный монитор процессов
iotop                           # Монитор дискового I/O
nmon                            # Общий монитор системы

# Очистка системы
sudo apt autoremove             # Удалить неиспользуемые пакеты
sudo apt autoclean              # Очистить кеш пакетов
sudo journalctl --vacuum-time=7d  # Очистить старые логи
```

## 🎯 Советы по эксплуатации

1. **Регулярно обновляйте систему:** `sudo apt update && sudo apt upgrade`
2. **Мониторьте температуру:** Не допускайте перегрев выше 70°C
3. **Делайте резервные копии:** Базы данных и конфигурации
4. **Используйте стабильное питание:** Raspberry Pi чувствителен к качеству блока питания
5. **Оптимизируйте хранилище:** Используйте SSD вместо SD-карты для production

## 📞 Поддержка

Если у вас возникли проблемы:

1. Проверьте логи: `sudo journalctl -u kanbe -f`
2. Запустите диагностику: `npm run pi:config`
3. Проверьте системные ресурсы: `htop`
4. Создайте issue на GitHub с подробным описанием проблемы

---

**Примечание:** Это руководство оптимизировано для Raspberry Pi 3. Для Raspberry Pi 4 и 5 некоторые ограничения можно ослабить для лучшей производительности.
