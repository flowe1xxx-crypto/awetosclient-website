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

    if (!user || !pass) {
        errorEl.innerText = "CREDENTIALS REQUIRED";
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
    const primary = btn.querySelector('.main-txt');
    const secondary = btn.querySelector('.sub-txt');

    btn.disabled = true;
    primary.innerText = "LAUNCHING...";
    secondary.innerText = "PREPARING MODULES";

    const ram = document.getElementById('setting-ram').value;
    const result = await callPython('launch_game', { ram: parseInt(ram) });

    if (result.success) {
        primary.innerText = "GAME RUNNING";
        secondary.innerText = "PROTECTED BY AWETOSGUARD";
    } else {
        alert("Launch Failed: " + result.message);
        btn.disabled = false;
        primary.innerText = "LAUNCH GAME";
        secondary.innerText = "BUILD v1.21.4-STABLE";
    }
}

function updateRamLabel(val) {
    document.getElementById('ram-val').innerText = val + " MB";
}

function update_download_progress(percent) {
    const sub = document.getElementById('launch-btn').querySelector('.sub-txt');
    if (sub) sub.innerText = `DOWNLOADING: ${percent}%`;
}

function update_status(text) {
    const btn = document.getElementById('launch-btn');
    const sub = btn.querySelector('.sub-txt');
    if (sub) sub.innerText = text.toUpperCase();
}

function launch_failed(err) {
    const btn = document.getElementById('launch-btn');
    const primary = btn.querySelector('.main-txt');
    const sub = btn.querySelector('.sub-txt');

    btn.disabled = false;
    primary.innerText = "LAUNCH GAME";
    sub.innerText = "ERROR: " + err.substring(0, 40);

    setTimeout(() => {
        sub.innerText = "BUILD v1.21.4-STABLE";
    }, 5000);
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
        }
    } catch (e) {
        console.error("Update check failed", e);
    }
}

function showUpdateModal(data) {
    document.getElementById('update-version').innerText = `v${data.version}`;
    document.getElementById('update-changelog').innerText = data.changelog;
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

window.onload = () => {
    initParticles();
    checkUpdates();
    // Signal to the parent bootloader that the UI is ready
    window.parent.postMessage({ type: 'ui_ready' }, "*");
};
