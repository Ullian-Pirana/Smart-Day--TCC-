document.addEventListener('DOMContentLoaded', function() {
    function getCSRF() {
        const name = 'csrftoken=';
        const cookie = document.cookie.split(';').map(c => c.trim()).find(c => c.startsWith(name));
        return cookie ? cookie.substring(name.length) : '';
    }
    const csrftoken = getCSRF();

    document.querySelectorAll('.aceitar-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.dataset.id;
            try {
                const res = await fetch(`/convites/aceitar/${id}/`, {
                    method: 'POST',
                    headers: {'X-CSRFToken': csrftoken}
                });
                const data = await res.json();
                alert(data.mensagem || data.erro);
                if (res.ok) window.location.reload();
            } catch (err) { console.error(err); alert('Erro de rede.'); }
        });
    });

    document.querySelectorAll('.recusar-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.dataset.id;
            if (!confirm('Tem certeza que deseja recusar este convite?')) return;
            try {
                const res = await fetch(`/convites/recusar/${id}/`, {
                    method: 'POST',
                    headers: {'X-CSRFToken': csrftoken}
                });
                const data = await res.json();
                alert(data.mensagem || data.erro);
                if (res.ok) window.location.reload();
            } catch (err) { console.error(err); alert('Erro de rede.'); }
        });
    });
});