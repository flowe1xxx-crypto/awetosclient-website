// Tab Switching Functionality for Info Page
document.addEventListener('DOMContentLoaded', function() {
    initTabSwitching();
    initPasswordChange();
    initSettingsKeyActivation();
});

/**
 * Initialize tab switching functionality
 */
function initTabSwitching() {
    const tabButtons = document.querySelectorAll('.panel-tab');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');

            // Remove active class from all buttons
            tabButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            this.classList.add('active');

            // Hide all tab content panels
            tabContents.forEach(content => {
                content.classList.remove('active');
            });

            // Show the target tab content
            const targetContent = document.querySelector(`.tab-content[data-tab="${targetTab}"]`);
            if (targetContent) {
                targetContent.classList.add('active');
            }
        });
    });
}

/**
 * Initialize password change form handler
 */
function initPasswordChange() {
    const changePasswordBtn = document.getElementById('change-password-btn');
    
    if (changePasswordBtn) {
        changePasswordBtn.addEventListener('click', function() {
            const currentPassword = document.getElementById('current-password').value;
            const newPassword = document.getElementById('new-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;

            // Basic validation
            if (!currentPassword || !newPassword || !confirmPassword) {
                alert('Пожалуйста, заполните все поля');
                return;
            }

            if (newPassword !== confirmPassword) {
                alert('Новые пароли не совпадают');
                return;
            }

            if (newPassword.length < 6) {
                alert('Пароль должен содержать минимум 6 символов');
                return;
            }

            // TODO: Send password change request to backend
            // For now, just show a message
            alert('Функция изменения пароля будет доступна после подключения к серверу');
            
            // Clear fields
            document.getElementById('current-password').value = '';
            document.getElementById('new-password').value = '';
            document.getElementById('confirm-password').value = '';
        });
    }
}

/**
 * Initialize key activation in Settings tab
 * Reuses the same logic as the Account tab activation
 */
function initSettingsKeyActivation() {
    const settingsActivateBtn = document.getElementById('settings-activate-btn');
    
    if (settingsActivateBtn) {
        settingsActivateBtn.addEventListener('click', function() {
            const keyInput = document.getElementById('settings-key-input');
            const key = keyInput.value.trim();

            if (!key) {
                alert('Пожалуйста, введите ключ активации');
                return;
            }

            // TODO: Send activation request to backend
            // For now, just show a message
            alert('Функция активации ключа будет доступна после подключения к серверу');
            
            // Clear input
            keyInput.value = '';
        });
    }
}
