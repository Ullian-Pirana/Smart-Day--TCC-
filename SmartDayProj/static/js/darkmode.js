// Menu mobile toggle
const navToggle = document.getElementById('navToggle');
const navMenu = document.getElementById('navMenu');
const themeToggle = document.getElementById('themeToggle');
const themeIcon = themeToggle.querySelector('.theme-icon');

// Toggle do menu mobile
navToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    navToggle.classList.toggle('active');
    navMenu.classList.toggle('show');
});

// Fechar menu ao clicar fora
document.addEventListener('click', (e) => {
    if (!navMenu.contains(e.target) && !navToggle.contains(e.target)) {
        navToggle.classList.remove('active');
        navMenu.classList.remove('show');
    }
});

// Fechar menu ao clicar em um link
const navLinks = document.querySelectorAll('.nav-link');
navLinks.forEach(link => {
    link.addEventListener('click', () => {
        navToggle.classList.remove('active');
        navMenu.classList.remove('show');
    });
});

// ===== SISTEMA DE TEMA ESCURO/CLARO =====

// Verificar tema salvo no localStorage
const savedTheme = localStorage.getItem('theme') || 'light';
if (savedTheme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    themeIcon.className = 'bi bi-sun-fill theme-icon';
    themeToggle.title = 'Modo Claro';
} else {
    document.documentElement.removeAttribute('data-theme');
    themeIcon.className = 'bi bi-moon-fill theme-icon';
    themeToggle.title = 'Modo Escuro';
}

// Toggle do tema
themeToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    
    const isDarkMode = document.documentElement.hasAttribute('data-theme');
    
    if (isDarkMode) {
        // Mudou para light mode
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
        themeIcon.className = 'bi bi-moon-fill theme-icon';
        themeToggle.title = 'Modo Escuro';
    } else {
        // Mudou para dark mode
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
        themeIcon.className = 'bi bi-sun-fill theme-icon';
        themeToggle.title = 'Modo Claro';
    }
    
    // Disparar evento customizado para outros componentes
    window.dispatchEvent(new CustomEvent('themeChanged', {
        detail: { theme: isDarkMode ? 'light' : 'dark' }
    }));
});

// Prevenir que o clique no tema toggle feche o menu
themeToggle.addEventListener('click', (e) => {
    e.stopPropagation();
});

// Fechar menu ao pressionar ESC
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        navToggle.classList.remove('active');
        navMenu.classList.remove('show');
    }
});