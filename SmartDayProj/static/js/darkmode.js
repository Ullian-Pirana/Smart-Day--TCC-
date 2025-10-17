// static/js/nav.js

document.addEventListener('DOMContentLoaded', function() {
    // Menu Mobile
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.getElementById('navMenu');
    
    if (navToggle && navMenu) {
        navToggle.addEventListener('click', function() {
            navMenu.classList.toggle('show');
            navToggle.classList.toggle('active');
        });
    }

    // Dark Mode
    const themeToggle = document.getElementById('themeToggle');
    
    if (themeToggle) {
        // Carregar tema salvo
        const savedTheme = localStorage.getItem('theme') || 'light';
        if (savedTheme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
            themeToggle.querySelector('.theme-icon').textContent = '☀️';
        }
        
        // Alternar tema
        themeToggle.addEventListener('click', function() {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const themeIcon = themeToggle.querySelector('.theme-icon');
            
            if (currentTheme === 'dark') {
                document.documentElement.removeAttribute('data-theme');
                themeIcon.textContent = '🌙';
                localStorage.setItem('theme', 'light');
            } else {
                document.documentElement.setAttribute('data-theme', 'dark');
                themeIcon.textContent = '☀️';
                localStorage.setItem('theme', 'dark');
            }
        });
    }
});