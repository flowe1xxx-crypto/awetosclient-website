let currentUser = null;
let currentCallId = 0;
let updateInfo = null;
const callbacks = {};

// Helper to communicate with the local Python bootloader
async function callPython(type, data = {}) {
    return new Promise((resolve, reject) => {
        const callId = currentCallId++;
        callbacks[callId] = resolve;

        window.parent.postMessage({
            type: type,
            data: data,
            callId: callId
        }, "*");
    });
}

// Listen for callbacks and events from the parent bootloader
window.addEventListener('message', (event) => {
    const { type, callId, result, data } = event.data;

    if (type === 'callback' && callbacks[callId]) {
        callbacks[callId](result);
        delete callbacks[callId];
    } else if (type === 'update_download_progress') {
        update_download_progress(data);
    } else if (type === 'update_download_stats') {
        update_download_stats(data);
    } else if (type === 'update_status') {
        update_status(data);
    } else if (type === 'launch_failed') {
        launch_failed(data);
    }
});

function showPage(pageId) {
    if (!currentUser && pageId !== 'login' && pageId !== 'register') {
        showPage('login');
        return;
    }

    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));

    const page = document.getElementById(`page-${pageId}`);
    if (page) page.classList.add('active');

    const navItem = document.getElementById(`nav-${pageId}`);
    if (navItem) navItem.classList.add('active');
}

async function handleLogin() {
    const user = document.getElementById('login-user').value;
    const pass = document.getElementById('login-pass').value;
    const errorEl = document.getElementById('login-error');
    const btn = document.getElementById('login-btn');
    const captchaAnswer = document.getElementById('captcha-answer').value;

    if (!user || !pass) {
        errorEl.innerText = "CREDENTIALS REQUIRED";
        return;
    }
    if (!validateCaptcha(captchaAnswer)) {
        errorEl.innerText = "CAPTCHA FAILED";
        return;
    }

    try {
        btn.disabled = true;
        btn.innerText = "AUTHENTICATING...";

        const result = await callPython('login', { username: user, password: pass });

        if (result.success) {
            currentUser = result.user;
            document.getElementById('sidebar-main').style.opacity = "1";
            document.getElementById('sidebar-main').style.pointerEvents = "all";
            updateUI();
            showPage('dashboard');
        } else {
            errorEl.innerText = result.message.toUpperCase();
            btn.disabled = false;
            btn.innerText = "AUTHORIZE";
        }
    } catch (e) {
        errorEl.innerText = "CONNECTION ERROR";
        btn.disabled = false;
        btn.innerText = "AUTHORIZE";
    }
}

function updateUI() {
    if (!currentUser) return;

    const username = currentUser.username.toUpperCase();
    document.getElementById('dash-username').innerText = username;
    document.getElementById('license-type').innerText = "PREMIUM";

    // Set avatar letter
    const avatarEl = document.getElementById('avatar-letter');
    if (avatarEl) avatarEl.innerText = username.charAt(0);
}

async function handleLaunch() {
    const btn = document.getElementById('launch-btn');

    btn.disabled = true;
    btn.innerText = "LAUNCHING...";
    update_status("Preparing modules");

    const ram = document.getElementById('setting-ram').value;
    const result = await callPython('launch_game', { ram: parseInt(ram) });

    if (result.success) {
        btn.innerText = "RUNNING";
        update_status("Protected by AwetosGuard");
    } else {
        alert("Launch Failed: " + result.message);
        btn.disabled = false;
        btn.innerText = "Inject";
        update_status("Build v1.21.4-stable");
    }
}

function updateRamLabel(val) {
    document.getElementById('ram-val').innerText = val + " MB";
}

function update_download_progress(percent) {
    const percentEl = document.getElementById('download-percent');
    const bar = document.getElementById('download-progress');
    if (percentEl) percentEl.innerText = `${percent}%`;
    if (bar) bar.style.width = `${percent}%`;
}

function update_status(text) {
    const status = document.getElementById('download-status');
    if (status) status.innerText = text;
    addLog(text);
}

function launch_failed(err) {
    const btn = document.getElementById('launch-btn');

    btn.disabled = false;
    btn.innerText = "Inject";
    update_status("ERROR: " + err.substring(0, 40));

    setTimeout(() => {
        update_status("Build v1.21.4-stable");
    }, 5000);
}

function update_download_stats(stats) {
    if (!stats) return;
    const speedEl = document.getElementById('download-speed');
    const etaEl = document.getElementById('download-eta');
    const statusEl = document.getElementById('download-status');
    const percentEl = document.getElementById('download-percent');
    const bar = document.getElementById('download-progress');

    const speed = stats.speed || 0;
    const speedMb = (speed / (1024 * 1024)).toFixed(2);
    if (speedEl) speedEl.innerText = `${speedMb} MB/s`;

    if (stats.total && stats.total > 0) {
        const percent = Math.floor((stats.downloaded / stats.total) * 100);
        if (percentEl) percentEl.innerText = `${percent}%`;
        if (bar) bar.style.width = `${percent}%`;
    }

    if (etaEl) {
        if (stats.eta && stats.eta > 0) {
            const min = Math.floor(stats.eta / 60);
            const sec = stats.eta % 60;
            etaEl.innerText = `${min}m ${sec}s`;
        } else {
            etaEl.innerText = "—";
        }
    }

    if (statusEl && stats.resumed) {
        statusEl.innerText = `Возобновление: ${stats.label}`;
    }
}

// ========== Account Modal ==========
async function showAccountModal() {
    if (!currentUser) {
        showPage('login');
        return;
    }

    const modal = document.getElementById('account-modal');
    modal.classList.add('active');

    // Set username immediately from local data
    document.getElementById('account-username').innerText = currentUser.username.toUpperCase();

    // Fetch full account info from Python backend
    try {
        const info = await callPython('get_user_info');
        if (info && info.success) {
            document.getElementById('account-hwid').innerText = (info.hwid || '—').substring(0, 16) + '...';
            document.getElementById('account-hwid').title = info.hwid || '';
            document.getElementById('account-uid').innerText = info.uid || '—';
            document.getElementById('account-expiry').innerText = info.expiry_date || '—';
            document.getElementById('account-registered').innerText = info.registered_at || '—';
        }
    } catch (e) {
        console.error("Failed to get account info:", e);
    }
}

function hideAccountModal() {
    document.getElementById('account-modal').classList.remove('active');
}

// Close modal on overlay click
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('account-modal-overlay')) {
        hideAccountModal();
    }
    if (e.target.classList.contains('modal-overlay')) {
        hideUpdateModal();
    }
});

// ========== Updates ==========
async function checkUpdates() {
    try {
        const result = await callPython('check_updates');
        if (result && result.update_available) {
            updateInfo = result;
            showUpdateModal(result);
            const pageLog = document.getElementById('update-changelog-page');
            if (pageLog) pageLog.innerText = result.changelog || "Есть обновление";
        }
    } catch (e) {
        console.error("Update check failed", e);
    }
}

function showUpdateModal(data) {
    document.getElementById('update-version').innerText = `v${data.version}`;
    document.getElementById('update-changelog-modal').innerText = data.changelog;
    document.getElementById('update-modal').classList.add('active');
}

function hideUpdateModal() {
    document.getElementById('update-modal').classList.remove('active');
}

async function startUpdate() {
    if (!updateInfo) return;

    const btn = document.querySelector('#update-modal .btn-glow-primary');
    btn.disabled = true;
    btn.innerText = "DOWNLOADING...";

    const result = await callPython('apply_update', { url: updateInfo.download_url });
    if (result && !result.success) {
        alert("Update failed: " + result.message);
        btn.disabled = false;
        btn.innerText = "UPDATE NOW";
    }
}

async function cancelDownload() {
    try {
        await callPython('cancel_download');
        update_status("Загрузка отменена");
    } catch (e) {
        update_status("Ошибка отмены");
    }
}

function exportConfig() {
    const ram = document.getElementById('setting-ram').value;
    const data = JSON.stringify({ ram }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'awetos_config.json';
    link.click();
}

function importConfig() {
    const input = document.getElementById('config-file');
    input.onchange = () => {
        const file = input.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const cfg = JSON.parse(reader.result);
                if (cfg.ram) {
                    document.getElementById('setting-ram').value = cfg.ram;
                    updateRamLabel(cfg.ram);
                }
            } catch (e) {
                update_status("Неверный файл конфигурации");
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

function filterLogs() {
    const val = document.getElementById('log-filter').value.toLowerCase();
    const entries = document.querySelectorAll('.log-line');
    entries.forEach((line) => {
        line.style.display = line.innerText.toLowerCase().includes(val) ? 'block' : 'none';
    });
}

function exportLogs() {
    const lines = Array.from(document.querySelectorAll('.log-line')).map((l) => l.innerText).join("\n");
    const blob = new Blob([lines], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'awetos_logs.txt';
    link.click();
}

function addLog(text) {
    const consoleEl = document.getElementById('log-console');
    if (!consoleEl || !text) return;
    const line = document.createElement('div');
    line.className = 'log-line';
    line.innerText = `[${new Date().toLocaleTimeString()}] ${text}`;
    consoleEl.appendChild(line);
    consoleEl.scrollTop = consoleEl.scrollHeight;
}

function initCaptcha() {
    const a = Math.floor(Math.random() * 8) + 1;
    const b = Math.floor(Math.random() * 8) + 1;
    const question = `${a} + ${b} = ?`;
    const el = document.getElementById('captcha-question');
    el.dataset.answer = String(a + b);
    el.innerText = question;
}

function validateCaptcha(answer) {
    const el = document.getElementById('captcha-question');
    return el && answer && answer.trim() === el.dataset.answer;
}

function initThemeToggle() {
    const btn = document.getElementById('theme-toggle');
    const html = document.documentElement;
    const saved = localStorage.getItem('awetos_theme') || 'dark';
    html.setAttribute('data-theme', saved);
    btn.innerHTML = saved === 'light' ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
    btn.addEventListener('click', () => {
        const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        html.setAttribute('data-theme', next);
        localStorage.setItem('awetos_theme', next);
        btn.innerHTML = next === 'light' ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
    });
}

async function applyDownloadSettings() {
    const retriesEl = document.getElementById('setting-retries');
    const delayEl = document.getElementById('setting-retry-delay');
    if (!retriesEl || !delayEl) return;

    const savedRetries = localStorage.getItem('awetos_dl_retries');
    const savedDelay = localStorage.getItem('awetos_dl_delay');

    if (savedRetries) retriesEl.value = savedRetries;
    if (savedDelay) delayEl.value = savedDelay;

    const maxRetries = parseInt(retriesEl.value || '6', 10);
    const retryDelaySeconds = parseFloat(delayEl.value || '2.5');

    try {
        await callPython('set_download_settings', { max_retries: maxRetries, retry_delay_seconds: retryDelaySeconds });
    } catch (e) {
        addLog("Failed to apply download settings");
    }

    const saveAndApply = async () => {
        localStorage.setItem('awetos_dl_retries', retriesEl.value);
        localStorage.setItem('awetos_dl_delay', delayEl.value);
        await applyDownloadSettings();
    };

    retriesEl.addEventListener('change', saveAndApply);
    delayEl.addEventListener('change', saveAndApply);
}

function initLoaderUI() {
    initParticles();
    initCaptcha();
    initThemeToggle();
    updateRamLabel(document.getElementById('setting-ram').value);
    applyDownloadSettings();
    checkUpdates();
    window.parent.postMessage({ type: 'ui_ready' }, "*");
}

document.addEventListener('DOMContentLoaded', initLoaderUI);

// ========== Particles (minimal) ==========
function initParticles() {
    const canvas = document.getElementById('particles');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    const particles = [];
    for (let i = 0; i < 40; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 0.3,
            vy: (Math.random() - 0.5) * 0.3,
            r: Math.random() * 1.5 + 0.5,
            alpha: Math.random() * 0.3 + 0.1
        });
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
            if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(168, 85, 247, ${p.alpha})`;
            ctx.fill();
        });
        requestAnimationFrame(draw);
    }
    draw();
}
