// static/js/menu.js - Menu Hamburguer
document.addEventListener('DOMContentLoaded', function() {
    console.log('Script menu.js carregado - Layout invertido');
    
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.getElementById('navMenu');
    
    if (!navToggle || !navMenu) {
        console.error('Elementos do menu não encontrados');
        return;
    }
    
    console.log('Elementos do menu encontrados');
    
    // Toggle do menu hamburger
    navToggle.addEventListener('click', function(event) {
        event.stopPropagation();
        
        console.log('Hamburger clicado');
        
        navToggle.classList.toggle('active');
        navMenu.classList.toggle('show');
        
        // Bloquear scroll do body quando menu está aberto
        if (navMenu.classList.contains('show')) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
    });
    
    // Fechar menu ao clicar em um link
    const navLinks = navMenu.querySelectorAll('.nav-link');
    navLinks.forEach(function(link) {
        link.addEventListener('click', function() {
            navToggle.classList.remove('active');
            navMenu.classList.remove('show');
            document.body.style.overflow = 'auto';
        });
    });
    
    // Fechar menu ao clicar fora
    document.addEventListener('click', function(event) {
        if (navMenu.classList.contains('show') && 
            !navToggle.contains(event.target) && 
            !navMenu.contains(event.target)) {
            
            navToggle.classList.remove('active');
            navMenu.classList.remove('show');
            document.body.style.overflow = 'auto';
        }
    });
    
    // Fechar menu com tecla ESC
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape' && navMenu.classList.contains('show')) {
            navToggle.classList.remove('active');
            navMenu.classList.remove('show');
            document.body.style.overflow = 'auto';
        }
    });
});