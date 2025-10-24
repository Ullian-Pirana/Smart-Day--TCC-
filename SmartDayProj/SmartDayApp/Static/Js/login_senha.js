// static/js/password-toggle.js
document.addEventListener('DOMContentLoaded', function() {
    const passwordInput = document.getElementById('password');
    const passwordToggle = document.getElementById('passwordToggle');
    
    // Verifica se os elementos existem na página
    if (passwordInput && passwordToggle) {
        passwordToggle.addEventListener('click', function() {
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                passwordToggle.classList.add('show-password');
            } else {
                passwordInput.type = 'password';
                passwordToggle.classList.remove('show-password');
            }
        });
    }
});