#!/bin/bash

echo "========================================="
echo "Awetos Server - Deployment Script"
echo "========================================="
echo ""

# Проверка Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js не установлен!"
    echo "Установите Node.js: https://nodejs.org/"
    exit 1
fi

echo "✓ Node.js version: $(node --version)"

# Проверка npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm не установлен!"
    exit 1
fi

echo "✓ npm version: $(npm --version)"
echo ""

# Установка зависимостей
echo "📦 Установка зависимостей..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Ошибка установки зависимостей"
    exit 1
fi

echo "✓ Зависимости установлены"
echo ""

# Проверка PM2
if ! command -v pm2 &> /dev/null; then
    echo "⚠️  PM2 не установлен. Устанавливаю..."
    npm install -g pm2
    
    if [ $? -ne 0 ]; then
        echo "❌ Ошибка установки PM2"
        exit 1
    fi
    
    echo "✓ PM2 установлен"
fi

echo "✓ PM2 version: $(pm2 --version)"
echo ""

# Остановка старого процесса
echo "🛑 Остановка старого процесса..."
pm2 stop awetos-server 2>/dev/null
pm2 delete awetos-server 2>/dev/null

# Запуск нового процесса
echo "🚀 Запуск сервера..."
pm2 start server-full.js --name awetos-server

if [ $? -ne 0 ]; then
    echo "❌ Ошибка запуска сервера"
    exit 1
fi

# Сохранение конфигурации PM2
pm2 save

# Настройка автозапуска
echo ""
echo "⚙️  Настройка автозапуска..."
pm2 startup

echo ""
echo "========================================="
echo "✅ Сервер успешно развернут!"
echo "========================================="
echo ""
echo "Полезные команды:"
echo "  pm2 logs awetos-server    - Просмотр логов"
echo "  pm2 status                - Статус процессов"
echo "  pm2 restart awetos-server - Перезапуск"
echo "  pm2 stop awetos-server    - Остановка"
echo ""
echo "Сервер доступен на:"
echo "  HTTP:      http://localhost:3000"
echo "  WebSocket: ws://localhost:3000/ws/configs"
echo "  WebSocket: ws://localhost:3000/ws/irc"
echo ""
echo "Для тестирования запустите: npm test"
echo "========================================="
