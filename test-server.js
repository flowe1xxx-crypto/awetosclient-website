const WebSocket = require('ws');
const http = require('http');

console.log('========================================');
console.log('Awetos Server Test Suite');
console.log('========================================\n');

const SERVER_URL = process.env.SERVER_URL || 'localhost:3000';
const TEST_UID = 'test_user_' + Date.now();

// ========================================
// TEST 1: HTTP Validation
// ========================================
async function testValidation() {
  return new Promise((resolve) => {
    console.log('TEST 1: HTTP Validation');
    console.log('------------------------');
    
    const data = JSON.stringify({
      hwid: 'test_hwid_123',
      challenge: 'test_challenge',
      version: '1.0.0'
    });
    
    const options = {
      hostname: SERVER_URL.split(':')[0],
      port: SERVER_URL.split(':')[1] || 3000,
      path: '/api/validate',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };
    
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          console.log('✓ Response received:', response.status);
          console.log('  Message:', response.message || 'OK');
          resolve(true);
        } catch (e) {
          console.log('✗ Failed to parse response');
          resolve(false);
        }
      });
    });
    
    req.on('error', (e) => {
      console.log('✗ Request failed:', e.message);
      resolve(false);
    });
    
    req.write(data);
    req.end();
  });
}

// ========================================
// TEST 2: Cloud Configs WebSocket
// ========================================
async function testCloudConfigs() {
  return new Promise((resolve) => {
    console.log('\nTEST 2: Cloud Configs WebSocket');
    console.log('--------------------------------');
    
    const ws = new WebSocket(`ws://${SERVER_URL}/ws/configs`);
    let testsPassed = 0;
    
    ws.on('open', () => {
      console.log('✓ Connected to Cloud Configs');
      
      // Test 1: List configs
      ws.send(JSON.stringify({
        action: 'list',
        uuid: TEST_UID
      }));
    });
    
    ws.on('message', (data) => {
      const response = JSON.parse(data);
      
      if (response.configs !== undefined) {
        console.log('✓ List configs:', response.configs.length, 'configs found');
        testsPassed++;
        
        // Test 2: Save config
        ws.send(JSON.stringify({
          action: 'save',
          uuid: TEST_UID,
          configName: '12345678',
          configData: {
            test: true,
            modules: { aura: { enabled: true } },
            created: Date.now(),
            updated: Date.now()
          }
        }));
      } else if (response.success && response.message === 'Config saved') {
        console.log('✓ Save config: success');
        testsPassed++;
        
        // Test 3: Get config
        ws.send(JSON.stringify({
          action: 'get',
          uuid: TEST_UID,
          configName: '12345678'
        }));
      } else if (response.success && response.data) {
        console.log('✓ Get config: success');
        console.log('  Data:', JSON.stringify(response.data).substring(0, 50) + '...');
        testsPassed++;
        
        // Test 4: Delete config
        ws.send(JSON.stringify({
          action: 'delete',
          uuid: TEST_UID,
          configName: '12345678'
        }));
      } else if (response.success && response.message === 'Config deleted') {
        console.log('✓ Delete config: success');
        testsPassed++;
        
        ws.close();
      }
    });
    
    ws.on('close', () => {
      console.log(`\nCloud Configs: ${testsPassed}/4 tests passed`);
      resolve(testsPassed === 4);
    });
    
    ws.on('error', (e) => {
      console.log('✗ WebSocket error:', e.message);
      resolve(false);
    });
    
    setTimeout(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
      resolve(false);
    }, 5000);
  });
}

// ========================================
// TEST 3: IRC WebSocket
// ========================================
async function testIRC() {
  return new Promise((resolve) => {
    console.log('\nTEST 3: IRC Chat WebSocket');
    console.log('---------------------------');
    
    const ws = new WebSocket(`ws://${SERVER_URL}/ws/irc`);
    let testsPassed = 0;
    let receivedWelcome = false;
    
    ws.on('open', () => {
      console.log('✓ Connected to IRC');
      
      // Test 1: Register
      ws.send(JSON.stringify({
        type: 'register',
        clientId: TEST_UID
      }));
    });
    
    ws.on('message', (data) => {
      const response = JSON.parse(data);
      
      if (response.type === 'system' && !receivedWelcome) {
        console.log('✓ Received welcome message');
        receivedWelcome = true;
        testsPassed++;
        
        // Test 2: Send message
        ws.send(JSON.stringify({
          type: 'message',
          message: 'Test message from automated test'
        }));
      } else if (response.type === 'message' && response.clientId === TEST_UID) {
        console.log('✓ Message sent and received');
        console.log('  Message:', response.message);
        testsPassed++;
        
        setTimeout(() => ws.close(), 500);
      }
    });
    
    ws.on('close', () => {
      console.log(`\nIRC Chat: ${testsPassed}/2 tests passed`);
      resolve(testsPassed === 2);
    });
    
    ws.on('error', (e) => {
      console.log('✗ WebSocket error:', e.message);
      resolve(false);
    });
    
    setTimeout(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
      resolve(false);
    }, 5000);
  });
}

// ========================================
// RUN ALL TESTS
// ========================================
async function runTests() {
  const results = [];
  
  results.push(await testValidation());
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  results.push(await testCloudConfigs());
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  results.push(await testIRC());
  
  console.log('\n========================================');
  console.log('Test Results');
  console.log('========================================');
  console.log(`HTTP Validation:    ${results[0] ? '✓ PASS' : '✗ FAIL'}`);
  console.log(`Cloud Configs:      ${results[1] ? '✓ PASS' : '✗ FAIL'}`);
  console.log(`IRC Chat:           ${results[2] ? '✓ PASS' : '✗ FAIL'}`);
  console.log('========================================');
  
  const passed = results.filter(r => r).length;
  console.log(`\nTotal: ${passed}/${results.length} tests passed\n`);
  
  process.exit(passed === results.length ? 0 : 1);
}

runTests().catch(e => {
  console.error('Test suite failed:', e);
  process.exit(1);
});
