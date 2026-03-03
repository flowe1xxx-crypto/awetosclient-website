// ==========================================
// AwetosClient Main JS
// Loading screen, themes, i18n, scroll fx
// ==========================================

// ---- i18n Translations ----
const translations = {
    en: {
        nav_home: 'Home', nav_buy: 'Buy', nav_info: 'Information', nav_features: 'Features',
        nav_login: 'Login', nav_logout: 'Logout',
        hero_title: 'AWETOS CLIENT', hero_sub: 'Elevate your Minecraft experience with the most powerful and visually stunning client available.',
        hero_btn: 'Get Started',
        feat_title: 'Why AwetosClient?', feat_sub: 'Redefining the standards of gaming utility.',
        f1_title: 'Advanced TargetESP', f1_desc: 'New "Sims", "Orbs", and "Jelly" modes for unparalleled visual feedback during combat.',
        f2_title: 'Maximum Performance', f2_desc: 'Engineered for high FPS and zero latency. Every frame counts when you\'re at the top.',
        f3_title: 'Advanced Bypass', f3_desc: 'Stay undetected with our cutting-edge module management system and intelligent rotations.',
        f4_title: 'Premium UI', f4_desc: 'A beautiful interface designed for clarity and style. Custom startup screens and HUDs.',
        f5_title: 'Cloud Configs', f5_desc: 'Save and load your settings from anywhere. Share configs with friends instantly.',
        f6_title: '24/7 Support', f6_desc: 'Our team is always ready to help. Discord support with fast response time.',
        stats_users: 'Active Users', stats_modules: 'Modules', stats_uptime: '% Uptime',
        dl_title: 'Ready to dominate?', dl_sub: 'Join thousands of users who chose excellence.',
        dl_btn: 'Download AwetosClient v3.2', dl_note: 'Compatible with Minecraft 1.20+ (Win/Linux/MacOS)',
        footer: '© 2026 AwetosClient Project. Not affiliated with Mojang AB.',
        theme_label: 'Theme', lang_label: 'Lang'
    },
    ru: {
        nav_home: 'Главная', nav_buy: 'Купить', nav_info: 'Информация', nav_features: 'Функции',
        nav_login: 'Войти', nav_logout: 'Выйти',
        hero_title: 'AWETOS CLIENT', hero_sub: 'Прокачай свой Minecraft с самым мощным и стильным клиентом. Создан для победителей.',
        hero_btn: 'Начать',
        feat_title: 'Почему AwetosClient?', feat_sub: 'Переопределяем стандарты.',
        f1_title: 'Продвинутый TargetESP', f1_desc: 'Режимы "Sims", "Orbs" и "Jelly" для идеальной визуальной обратной связи в бою.',
        f2_title: 'Макс. производительность', f2_desc: 'Высокий FPS и нулевая задержка. Каждый кадр на счету.',
        f3_title: 'Продвинутый обход', f3_desc: 'Оставайся незамеченным благодаря системе управления модулями.',
        f4_title: 'Премиум интерфейс', f4_desc: 'Красивый интерфейс для ясности и стиля. Кастомные экраны и HUD.',
        f5_title: 'Облачные конфиги', f5_desc: 'Сохраняй и загружай настройки откуда угодно. Делись конфигами с друзьями.',
        f6_title: 'Поддержка 24/7', f6_desc: 'Наша команда всегда готова помочь. Discord с быстрым временем ответа.',
        stats_users: 'Пользователей', stats_modules: 'Модулей', stats_uptime: '% Аптайм',
        dl_title: 'Готов доминировать?', dl_sub: 'Присоединяйся к тысячам пользователей.',
        dl_btn: 'Скачать AwetosClient v3.2', dl_note: 'Совместим с Minecraft 1.20+ (Win/Linux/MacOS)',
        footer: '© 2026 AwetosClient Project. Не аффилирован с Mojang AB.',
        theme_label: 'Тема', lang_label: 'Язык'
    },
    ua: {
        nav_home: 'Головна', nav_buy: 'Купити', nav_info: 'Інформація', nav_features: 'Функції',
        nav_login: 'Увійти', nav_logout: 'Вийти',
        hero_title: 'AWETOS CLIENT', hero_sub: 'Прокачай свій Minecraft з найпотужнішим та стильним клієнтом. Створений для переможців.',
        hero_btn: 'Почати',
        feat_title: 'Чому AwetosClient?', feat_sub: 'Перевизначаємо стандарти.',
        f1_title: 'Просунутий TargetESP', f1_desc: 'Режими "Sims", "Orbs" та "Jelly" для ідеального візуального фідбеку в бою.',
        f2_title: 'Макс. продуктивність', f2_desc: 'Високий FPS та нульова затримка. Кожен кадр на рахунку.',
        f3_title: 'Просунутий обхід', f3_desc: 'Залишайся непоміченим завдяки системі управління модулями.',
        f4_title: 'Преміум інтерфейс', f4_desc: 'Гарний інтерфейс для ясності та стилю. Кастомні екрани та HUD.',
        f5_title: 'Хмарні конфіги', f5_desc: 'Зберігай та завантажуй налаштування звідусіль. Діліться конфігами з друзями.',
        f6_title: 'Підтримка 24/7', f6_desc: 'Наша команда завжди готова допомогти. Discord з швидким часом відповіді.',
        stats_users: 'Користувачів', stats_modules: 'Модулів', stats_uptime: '% Аптайм',
        dl_title: 'Готовий домінувати?', dl_sub: 'Приєднуйся до тисяч користувачів.',
        dl_btn: 'Завантажити AwetosClient v3.2', dl_note: 'Сумісний з Minecraft 1.20+ (Win/Linux/MacOS)',
        footer: '© 2026 AwetosClient Project. Не афілійований з Mojang AB.',
        theme_label: 'Тема', lang_label: 'Мова'
    }
};

// ---- Loading Screen ----
function initLoader() {
    const loader = document.getElementById('loader');
    if (!loader) return;
    const bar = loader.querySelector('.loader-bar-fill');
    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.random() * 15 + 5;
        if (progress >= 100) {
            progress = 100;
            clearInterval(interval);
            setTimeout(() => {
                loader.classList.add('loader-hidden');
                document.body.classList.add('loaded');
                setTimeout(() => loader.remove(), 600);
            }, 400);
        }
        if (bar) bar.style.width = progress + '%';
    }, 150);
}

// ---- Theme Switcher ----
const themes = ['dark', 'neon', 'purple'];
let currentThemeIndex = 0;

function initTheme() {
    const saved = localStorage.getItem('rc_theme') || 'dark';
    currentThemeIndex = themes.indexOf(saved);
    if (currentThemeIndex === -1) currentThemeIndex = 0;
    applyTheme(themes[currentThemeIndex]);
}

function cycleTheme() {
    currentThemeIndex = (currentThemeIndex + 1) % themes.length;
    const theme = themes[currentThemeIndex];
    applyTheme(theme);
    localStorage.setItem('rc_theme', theme);
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const btn = document.getElementById('theme-btn');
    if (btn) {
        const icons = { dark: '🌙', neon: '⚡', purple: '🔮' };
        const names = { dark: 'Dark', neon: 'Neon', purple: 'Purple' };
        btn.innerHTML = icons[theme] + ' ' + names[theme];
    }
}

// ---- Language Switcher ----
let currentLang = 'en';

function initLang() {
    currentLang = localStorage.getItem('rc_lang') || 'en';
    applyLang(currentLang);
}

function cycleLang() {
    const langs = ['en', 'ru', 'ua'];
    let idx = langs.indexOf(currentLang);
    idx = (idx + 1) % langs.length;
    currentLang = langs[idx];
    localStorage.setItem('rc_lang', currentLang);
    applyLang(currentLang);
}

function applyLang(lang) {
    const t = translations[lang];
    if (!t) return;
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (t[key]) el.textContent = t[key];
    });
    const btn = document.getElementById('lang-btn');
    if (btn) {
        const flags = { en: '🇬🇧', ru: '🇷🇺', ua: '🇺🇦' };
        btn.innerHTML = flags[lang] + ' ' + lang.toUpperCase();
    }
}

// ---- Scroll Reveal ----
function initScrollReveal() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15 });

    document.querySelectorAll('.scroll-reveal').forEach(el => observer.observe(el));
}

// ---- Animated Counter ----
function initCounters() {
    const counters = document.querySelectorAll('.stat-number');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const el = entry.target;
                const target = parseInt(el.getAttribute('data-target'));
                const duration = 2000;
                const step = target / (duration / 16);
                let current = 0;
                const timer = setInterval(() => {
                    current += step;
                    if (current >= target) {
                        current = target;
                        clearInterval(timer);
                    }
                    el.textContent = Math.floor(current).toLocaleString();
                }, 16);
                observer.unobserve(el);
            }
        });
    }, { threshold: 0.5 });

    counters.forEach(c => observer.observe(c));
}

// ---- Navbar scroll effect ----
function initNavScroll() {
    const nav = document.querySelector('nav');
    if (!nav) return;
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            nav.classList.add('nav-scrolled');
        } else {
            nav.classList.remove('nav-scrolled');
        }
    });
}

// ---- Smooth scroll ----
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) target.scrollIntoView({ behavior: 'smooth' });
        });
    });
}

// ---- Typing animation ----
function initTyping() {
    const el = document.getElementById('typing-text');
    if (!el) return;
    const texts = ['Built for winners.', 'Designed by professionals.', 'Powered by passion.'];
    let textIdx = 0, charIdx = 0, deleting = false;

    function type() {
        const current = texts[textIdx];
        if (deleting) {
            el.textContent = current.substring(0, charIdx--);
            if (charIdx < 0) { deleting = false; textIdx = (textIdx + 1) % texts.length; }
            setTimeout(type, 40);
        } else {
            el.textContent = current.substring(0, charIdx++);
            if (charIdx > current.length) { deleting = true; setTimeout(type, 2000); }
            else setTimeout(type, 80);
        }
    }
    type();
}

// ---- Hamburger Menu ----
function initHamburger() {
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    if (!hamburger || !navLinks) return;

    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navLinks.classList.toggle('open');
    });

    // Close menu when clicking a link
    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('active');
            navLinks.classList.remove('open');
        });
    });
}

// ---- Init everything ----
document.addEventListener('DOMContentLoaded', () => {
    initLoader();
    initTheme();
    initLang();
    initScrollReveal();
    initCounters();
    initNavScroll();
    initSmoothScroll();
    initTyping();
    initHamburger();

    // Wire up settings buttons
    const themeBtn = document.getElementById('theme-btn');
    if (themeBtn) themeBtn.addEventListener('click', cycleTheme);
    const langBtn = document.getElementById('lang-btn');
    if (langBtn) langBtn.addEventListener('click', cycleLang);
});
