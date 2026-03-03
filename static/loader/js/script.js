let currentUser = null;
let currentCallId = 0;
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

        // Proxy call through the parent bootloader
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
            btn.innerText = "INITIALIZE CONNECTION";
        }
    } catch (e) {
        errorEl.innerText = "BRIDGE ERROR: " + e;
        btn.disabled = false;
        btn.innerText = "INITIALIZE CONNECTION";
    }
}

function updateUI() {
    if (!currentUser) return;

    document.getElementById('user-display-name').innerText = currentUser.username.toUpperCase();
    document.getElementById('dash-username').innerText = currentUser.username.toUpperCase();
    document.getElementById('license-type').innerText = "PREMIUM";

    document.querySelector('.user-status').innerText = "AUTHORIZED SESSION";
    document.querySelector('.user-status').style.color = "var(--primary)";
}

async function handleLaunch() {
    const btn = document.getElementById('launch-btn');
    const primary = btn.querySelector('.main-txt');
    const secondary = btn.querySelector('.sub-txt');

    btn.disabled = true;
    primary.innerText = "DEPLOYING...";
    secondary.innerText = "SYNCING WITH NATIVE MODULES";

    const ram = document.getElementById('setting-ram').value;
    const result = await callPython('launch_game', { ram: parseInt(ram) });

    if (result.success) {
        primary.innerText = "DEPLOYMENT ACTIVE";
        secondary.innerText = "SYSTEM ENCRYPTED & RUNNING";
    } else {
        alert("Launch Failed: " + result.message);
        btn.disabled = false;
        primary.innerText = "DEPLOY CLIENT";
        secondary.innerText = "1.21.4-LATEST-STABLE";
    }
}

function updateRamLabel(val) {
    document.getElementById('ram-val').innerText = val + "MB";
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
    alert("CRITICAL ERROR: " + err);
}

async function checkUpdates() {
    try {
        const result = await callPython('check_updates');
        if (result.update_available) {
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
    document.getElementById('update-modal').style.display = 'flex';
}

function hideUpdateModal() {
    document.getElementById('update-modal').style.display = 'none';
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
        btn.innerText = "INITIALIZE UPDATE";
    }
}

window.onload = () => {
    checkUpdates();
    // Signal to the parent bootloader that the UI is ready to be shown
    window.parent.postMessage({ type: 'ui_ready' }, "*");
};
