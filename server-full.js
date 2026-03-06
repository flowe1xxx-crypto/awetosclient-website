const http = require('http');
const WebSocket = require('ws');
const { Pool } = require('pg');

// ========================================
// НАСТРОЙКИ NEON POSTGRESQL
// ========================================
const dbConfig = {
  connectionString: 'postgresql://neondb_owner:npg_nPf2qM7UmQZz@ep-damp-snow-aijkrdwe-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: {
    rejectUnauthorized: false
  }
};

const pool = new Pool(dbConfig);

// ========================================
// ИНИЦИАЛИЗАЦИЯ БД
// ========================================
async function initDatabase() {
  try {
    // Таблица HWID whitelist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS hwid_whitelist (
        id SERIAL PRIMARY KEY,
        hwid VARCHAR(64) UNIQUE NOT NULL,
        username VARCHAR(255),
        discord_id VARCHAR(64),
        telegram_id VARCHAR(64),
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_used TIMESTAMP,
        use_count INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        max_uses INTEGER,
        notes TEXT
      )
    `);
    
    // Таблица логов валидации
    await pool.query(`
      CREATE TABLE IF NOT EXISTS validation_logs (
        id SERIAL PRIMARY KEY,
        hwid VARCHAR(64) NOT NULL,
        ip_address VARCHAR(45),
        result VARCHAR(20),
        version VARCHAR(20),
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Таблица облачных конфигов
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cloud_configs (
        id SERIAL PRIMARY KEY,
        config_name VARCHAR(8) UNIQUE NOT NULL,
        user_uid VARCHAR(64) NOT NULL,
        config_data JSONB NOT NULL,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL
      )
    `);
    
    // Таблица IRC сообщений (для истории)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS irc_messages (
        id SERIAL PRIMARY KEY,
        client_id VARCHAR(64) NOT NULL,
        prefix VARCHAR(50),
        message TEXT NOT NULL,
        timestamp BIGINT NOT NULL
      )
    `);
    
    // Индексы
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_hwid ON validation_logs(hwid)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_timestamp ON validation_logs(timestamp)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_config_user ON cloud_configs(user_uid)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_irc_timestamp ON irc_messages(timestamp)`);
    
    console.log('✓ Database initialized');
    console.log('✓ Tables: hwid_whitelist, validation_logs, cloud_configs, irc_messages');
  } catch (err) {
    console.error('✗ Database initialization failed:', err.message);
    throw err;
  }
}

// ========================================
// ПРОВЕРКА HWID
// ========================================
async function checkHWID(hwid) {
  const result = await pool.query(
    `SELECT * FROM hwid_whitelist 
     WHERE hwid = $1 
     AND is_active = TRUE 
     AND (expires_at IS NULL OR expires_at > NOW())
     AND (max_uses IS NULL OR use_count < max_uses)`,
    [hwid]
  );
  
  if (result.rows.length > 0) {
    await pool.query(
      `UPDATE hwid_whitelist 
       SET last_used = NOW(), use_count = use_count + 1 
       WHERE hwid = $1`,
      [hwid]
    );
    return result.rows[0];
  }
  
  return null;
}

// ========================================
// ЛОГИРОВАНИЕ
// ========================================
async function logValidation(hwid, ip, result, version) {
  await pool.query(
    `INSERT INTO validation_logs (hwid, ip_address, result, version) 
     VALUES ($1, $2, $3, $4)`,
    [hwid, ip, result, version]
  );
}

// ========================================
// ГЕНЕРАЦИЯ SESSION KEY
// ========================================
function generateSessionKey(hwid, challenge) {
  const crypto = require('crypto');
  const hash = crypto.createHash('sha256');
  hash.update(hwid + challenge + 'CHANGE_THIS_SECRET_SALT_12345');
  return hash.digest('hex').substring(0, 32);
}

// ========================================
// CLOUD CONFIGS - DATABASE FUNCTIONS
// ========================================
async function getCloudConfigs(userUid) {
  const result = await pool.query(
    `SELECT config_name, created_at, updated_at 
     FROM cloud_configs 
     WHERE user_uid = $1 
     ORDER BY updated_at DESC`,
    [userUid]
  );
  return result.rows.map(row => ({
    name: row.config_name,
    created: row.created_at,
    updated: row.updated_at
  }));
}

async function getCloudConfig(userUid, configName) {
  const result = await pool.query(
    `SELECT config_data FROM cloud_configs 
     WHERE user_uid = $1 AND config_name = $2`,
    [userUid, configName]
  );
  return result.rows.length > 0 ? result.rows[0].config_data : null;
}

async function getCloudConfigMetadata(userUid, configName) {
  const result = await pool.query(
    `SELECT created_at, updated_at FROM cloud_configs 
     WHERE user_uid = $1 AND config_name = $2`,
    [userUid, configName]
  );
  return result.rows.length > 0 ? {
    created: result.rows[0].created_at,
    updated: result.rows[0].updated_at
  } : null;
}

async function saveCloudConfig(userUid, configName, configData, createdAt, updatedAt) {
  await pool.query(
    `INSERT INTO cloud_configs (config_name, user_uid, config_data, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (config_name) 
     DO UPDATE SET config_data = $3, updated_at = $5`,
    [configName, userUid, configData, createdAt, updatedAt]
  );
}

async function deleteCloudConfig(userUid, configName) {
  await pool.query(
    `DELETE FROM cloud_configs 
     WHERE user_uid = $1 AND config_name = $2`,
    [userUid, configName]
  );
}

// ========================================
// IRC - DATABASE FUNCTIONS
// ========================================
async function saveIRCMessage(clientId, prefix, message, timestamp) {
  await pool.query(
    `INSERT INTO irc_messages (client_id, prefix, message, timestamp)
     VALUES ($1, $2, $3, $4)`,
    [clientId, prefix, message, timestamp]
  );
}

async function getRecentIRCMessages(limit = 50) {
  const result = await pool.query(
    `SELECT client_id, prefix, message, timestamp 
     FROM irc_messages 
     ORDER BY timestamp DESC 
     LIMIT $1`,
    [limit]
  );
  return result.rows.reverse(); // Возвращаем в хронологическом порядке
}

// ========================================
// HTTP СЕРВЕР (ВАЛИДАЦИЯ)
// ========================================
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  if (req.method === 'POST' && req.url === '/api/validate') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const { hwid, challenge, version } = data;
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        
        console.log(`\n[${new Date().toISOString()}] Validation request:`);
        console.log(`  HWID: ${hwid}`);
        console.log(`  IP: ${ip}`);
        console.log(`  Version: ${version}`);
        
        const user = await checkHWID(hwid);
        
        if (!user) {
          console.log(`  Result: ✗ DENIED`);
          await logValidation(hwid, ip, 'denied', version);
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            status: 'error',
            message: 'HWID not authorized'
          }));
          return;
        }
        
        const sessionKey = generateSessionKey(hwid, challenge);
        console.log(`  Result: ✓ OK (user: ${user.username || 'unknown'})`);
        
        await logValidation(hwid, ip, 'ok', version);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'ok',
          key: Buffer.from(sessionKey).toString('base64'),
          username: user.username
        }));
        
      } catch (e) {
        console.error('✗ Error:', e.message);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          status: 'error', 
          message: 'Invalid request' 
        }));
      }
    });
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

// ========================================
// WEBSOCKET СЕРВЕР (CLOUD CONFIGS)
// ========================================
const wssConfigs = new WebSocket.Server({ noServer: true });

wssConfigs.on('connection', (ws) => {
  console.log('[CloudConfig] Client connected');
  
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      const { action, uuid, configName, configData } = data;
      
      switch(action) {
        case 'list':
          const configs = await getCloudConfigs(uuid);
          ws.send(JSON.stringify({ configs }));
          break;
          
        case 'get':
          const config = await getCloudConfig(uuid, configName);
          if (config) {
            ws.send(JSON.stringify({ 
              success: true, 
              data: config 
            }));
          } else {
            ws.send(JSON.stringify({ 
              success: false, 
              error: 'Config not found' 
            }));
          }
          break;
          
        case 'save':
          const created = configData.created || Date.now();
          const updated = configData.updated || Date.now();
          await saveCloudConfig(uuid, configName, configData, created, updated);
          ws.send(JSON.stringify({ 
            success: true, 
            message: 'Config saved' 
          }));
          console.log(`[CloudConfig] Saved: ${configName} for user ${uuid}`);
          break;
          
        case 'delete':
          await deleteCloudConfig(uuid, configName);
          ws.send(JSON.stringify({ 
            success: true, 
            message: 'Config deleted' 
          }));
          console.log(`[CloudConfig] Deleted: ${configName} for user ${uuid}`);
          break;
          
        case 'getMetadata':
          const metadata = await getCloudConfigMetadata(uuid, configName);
          if (metadata) {
            ws.send(JSON.stringify({ 
              success: true,
              created: metadata.created,
              updated: metadata.updated
            }));
          } else {
            ws.send(JSON.stringify({ success: false }));
          }
          break;
      }
    } catch (e) {
      console.error('[CloudConfig] Error:', e);
      ws.send(JSON.stringify({ 
        success: false, 
        error: e.message 
      }));
    }
  });
  
  ws.on('close', () => {
    console.log('[CloudConfig] Client disconnected');
  });
});

// ========================================
// WEBSOCKET СЕРВЕР (IRC CHAT)
// ========================================
const wssIRC = new WebSocket.Server({ noServer: true });
const ircClients = new Map(); // clientId -> ws
const mutedUsers = new Set();
const adminUsers = new Set(['admin_uid_1', 'admin_uid_2']); // Замените на реальные UID админов

wssIRC.on('connection', (ws) => {
  let clientId = null;
  
  console.log('[IRC] Client connected');
  
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      
      switch(data.type) {
        case 'register':
          clientId = data.clientId;
          ircClients.set(clientId, ws);
          console.log(`[IRC] Client registered: ${clientId}`);
          
          // Отправить приветствие
          ws.send(JSON.stringify({
            type: 'system',
            message: 'Добро пожаловать в IRC чат Awetos!'
          }));
          
          // Отправить последние сообщения
          const recentMessages = await getRecentIRCMessages(20);
          recentMessages.forEach(msg => {
            ws.send(JSON.stringify({
              type: 'message',
              clientId: msg.client_id,
              prefix: msg.prefix,
              message: msg.message,
              timestamp: msg.timestamp
            }));
          });
          
          // Уведомить всех о подключении
          broadcastIRC({
            type: 'join',
            clientId: clientId,
            message: `${clientId} присоединился к чату`
          }, clientId);
          break;
          
        case 'message':
          if (mutedUsers.has(clientId)) {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Вы заглушены'
            }));
            return;
          }
          
          const timestamp = Date.now();
          const msg = {
            type: 'message',
            clientId: clientId,
            prefix: data.prefix || '',
            message: data.message,
            timestamp: timestamp
          };
          
          // Сохранить в БД
          await saveIRCMessage(clientId, data.prefix || '', data.message, timestamp);
          
          // Отправить всем
          broadcastIRC(msg);
          console.log(`[IRC] [${clientId}] ${data.message}`);
          break;
          
        case 'mute':
          if (adminUsers.has(clientId)) {
            mutedUsers.add(data.targetId);
            broadcastIRC({
              type: 'system',
              message: `${data.targetId} был заглушен`
            });
            console.log(`[IRC] ${data.targetId} muted by ${clientId}`);
          }
          break;
          
        case 'unmute':
          if (adminUsers.has(clientId)) {
            mutedUsers.delete(data.targetId);
            broadcastIRC({
              type: 'system',
              message: `${data.targetId} был разглушен`
            });
            console.log(`[IRC] ${data.targetId} unmuted by ${clientId}`);
          }
          break;
      }
    } catch (e) {
      console.error('[IRC] Error:', e);
    }
  });
  
  ws.on('close', () => {
    if (clientId) {
      ircClients.delete(clientId);
      broadcastIRC({
        type: 'leave',
        clientId: clientId,
        message: `${clientId} покинул чат`
      }, clientId);
      console.log(`[IRC] Client disconnected: ${clientId}`);
    }
  });
});

function broadcastIRC(data, excludeId = null) {
  const message = JSON.stringify(data);
  ircClients.forEach((client, id) => {
    if (id !== excludeId && client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// ========================================
// UPGRADE HANDLER (HTTP -> WebSocket)
// ========================================
server.on('upgrade', (request, socket, head) => {
  const pathname = request.url;
  
  if (pathname === '/ws/configs') {
    wssConfigs.handleUpgrade(request, socket, head, (ws) => {
      wssConfigs.emit('connection', ws, request);
    });
  } else if (pathname === '/ws/irc') {
    wssIRC.handleUpgrade(request, socket, head, (ws) => {
      wssIRC.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

// ========================================
// ЗАПУСК
// ========================================
const PORT = process.env.PORT || 3000;

initDatabase().then(() => {
  server.listen(PORT, () => {
    console.log('\n========================================');
    console.log('Rich Client Full Server');
    console.log('Database: Neon PostgreSQL');
    console.log('========================================');
    console.log(`HTTP Server: http://localhost:${PORT}`);
    console.log(`  POST /api/validate - HWID Validation`);
    console.log(`WebSocket Servers:`);
    console.log(`  ws://localhost:${PORT}/ws/configs - Cloud Configs`);
    console.log(`  ws://localhost:${PORT}/ws/irc - IRC Chat`);
    console.log('========================================');
    console.log('Waiting for connections...\n');
  });
}).catch(err => {
  console.error('✗ Failed to start server:', err.message);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('\nShutting down...');
  await pool.end();
  process.exit(0);
});
