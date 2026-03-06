# Awetos Client - Full Server

Единый сервер для валидации HWID, облачных конфигов и IRC чата.

## 🚀 Быстрый старт

```bash
# 1. Установите зависимости
npm install

# 2. Запустите сервер
npm start

# 3. Тестируйте
npm test
```

## 📡 Endpoints

### HTTP API
- `POST /api/validate` - Валидация HWID

### WebSocket
- `ws://your-domain/ws/configs` - Облачные конфиги
- `ws://your-domain/ws/irc` - IRC чат

## 🗄️ База данных

Сервер использует PostgreSQL (Neon). Таблицы создаются автоматически:
- `hwid_whitelist` - белый список HWID
- `validation_logs` - логи валидации
- `cloud_configs` - облачные конфигурации
- `irc_messages` - история IRC сообщений

## 🔧 Настройка

### Локальное тестирование
```bash
node server-full.js
```

### Продакшн (PM2)
```bash
npm install -g pm2
pm2 start server-full.js --name awetos-server
pm2 save
pm2 startup
```

### Heroku
```bash
git push heroku main
```

### Render.com
- Build Command: `npm install`
- Start Command: `npm start`

## 📝 Переменные окружения

```bash
PORT=3000  # Порт сервера (по умолчанию 3000)
```

Connection string для PostgreSQL указан в `server-full.js`.

## 🧪 Тестирование

```bash
# Запустить все тесты
npm test

# Тестировать конкретный endpoint
wscat -c ws://localhost:3000/ws/configs
wscat -c ws://localhost:3000/ws/irc
```

## 📚 Документация

Полная документация в файле `ИНТЕГРАЦИЯ_САЙТА_С_КЛИЕНТОМ.md`

## 🔐 Безопасность

- Используйте WSS (WebSocket Secure) в продакшене
- Настройте CORS для вашего домена
- Добавьте rate limiting
- Используйте аутентификацию для WebSocket

## 📊 Мониторинг

```bash
# Логи PM2
pm2 logs awetos-server

# Статус
pm2 status

# Перезапуск
pm2 restart awetos-server
```

## 🆘 Поддержка

Если возникли проблемы:
1. Проверьте логи сервера
2. Убедитесь, что база данных доступна
3. Проверьте, что порты открыты
4. Убедитесь, что WebSocket не блокируется файрволом
