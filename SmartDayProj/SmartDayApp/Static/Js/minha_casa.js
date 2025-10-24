document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('modalCriarCasa');
    const btnCriar = document.getElementById('btnCriarCasa');
    const btnCancelar = document.getElementById('cancelarCasa');
    const btnSalvar = document.getElementById('salvarCasa');

    if (btnCriar) {
        btnCriar.addEventListener('click', () => {
            modal.style.display = 'block';
        });
    }

    if (btnCancelar) {
        btnCancelar.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }

    if (btnSalvar) {
        btnSalvar.addEventListener('click', async () => {
            const nome = document.getElementById('nomeCasa').value.trim();
            if (!nome) {
                alert('Digite um nome para a casa.');
                return;
            }

            const response = await fetch('/casa/criar/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken'),
                },
                body: JSON.stringify({ nome }),
            });

            const data = await response.json();
            if (response.ok) {
                alert('Casa criada com sucesso!');
                window.location.reload();
            } else {
                alert(data.erro || 'Erro ao criar casa.');
            }
        });
    }

    function getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let cookie of cookies) {
                cookie = cookie.trim();
                if (cookie.startsWith(name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }
});