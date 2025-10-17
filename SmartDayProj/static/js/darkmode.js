// static/js/darkmode.js
class DarkMode {
  constructor() {
    this.themeToggle = document.getElementById('themeToggle');
    this.init();
  }

  init() {
    this.loadTheme();
    this.bindEvents();
  }

  loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    this.setTheme(savedTheme);
  }

  setTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      if (this.themeToggle) {
        this.themeToggle.textContent = '☀️';
        this.themeToggle.title = 'Modo Claro';
      }
    } else {
      document.documentElement.removeAttribute('data-theme');
      if (this.themeToggle) {
        this.themeToggle.textContent = '🌙';
        this.themeToggle.title = 'Modo Escuro';
      }
    }
    localStorage.setItem('theme', theme);
  }

  toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    this.setTheme(currentTheme === 'dark' ? 'light' : 'dark');
  }

  bindEvents() {
    if (this.themeToggle) {
      this.themeToggle.addEventListener('click', () => this.toggleTheme());
    }
  }
}

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  new DarkMode();
});