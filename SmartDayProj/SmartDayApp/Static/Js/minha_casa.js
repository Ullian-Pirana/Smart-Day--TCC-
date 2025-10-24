document.addEventListener('DOMContentLoaded', function() {
    function getCSRF() {
        const name = 'csrftoken=';
        const cookie = document.cookie.split(';').map(c => c.trim()).find(c => c.startsWith(name));
        return cookie ? cookie.substring(name.length) : '';
    }
    const csrftoken = getCSRF();

    /* --- Modal criação --- */
    const btnCriar = document.getElementById('btnCriarCasa');
    const modal = document.getElementById('modalCriarCasa');
    const btnCancelar = document.getElementById('cancelarCasa');
    const btnSalvar = document.getElementById('salvarCasa');

    if (btnCriar) btnCriar.addEventListener('click', () => modal.style.display = 'block');
    if (btnCancelar) btnCancelar.addEventListener('click', () => modal.style.display = 'none');

    if (btnSalvar) {
        btnSalvar.addEventListener('click', async () => {
            const nome = (document.getElementById('nomeCasa').value || '').trim();
            if (!nome) return alert('Digite um nome para a casa.');

            try {
                const res = await fetch('/casa/criar/', {
                    method: 'POST',
                    headers: {'Content-Type':'application/json','X-CSRFToken': csrftoken},
                    body: JSON.stringify({ nome })
                });
                const data = await res.json();
                alert(data.mensagem || data.erro);
                if (res.ok) window.location.reload();
            } catch (err) { console.error(err); alert('Erro de rede.'); }
        });
    }

    /* --- Adicionar usuário --- */
    const btnAdd = document.getElementById('btnAddUsuario');
    if (btnAdd) {
        btnAdd.addEventListener('click', async () => {
            const select = document.getElementById('usuarioSelect');
            const usuario_id = select ? select.value : null;
            const casaId = btnAdd.dataset.casaId;
            if (!usuario_id) return alert('Selecione um usuário.');

            try {
                const res = await fetch(`/casa/${casaId}/adicionar_usuario/`, {
                    method: 'POST',
                    headers: {'Content-Type':'application/json','X-CSRFToken': csrftoken},
                    body: JSON.stringify({ usuario_id })
                });
                const data = await res.json();
                alert(data.mensagem || data.erro);
                if (res.ok) window.location.reload();
            } catch (err) { console.error(err); alert('Erro de rede.'); }
        });
    }

    /* --- Remover usuário --- */
    document.querySelectorAll('.btn-remover').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (!confirm('Remover este usuário da casa?')) return;
            const casaId = btn.dataset.casaId;
            const userId = btn.dataset.userId;

            try {
                const res = await fetch(`/casa/${casaId}/remover_usuario/${userId}/`, {
                    method: 'POST',
                    headers: {'X-CSRFToken': csrftoken}
                });
                const data = await res.json();
                alert(data.mensagem || data.erro);
                if (res.ok) window.location.reload();
            } catch (err) { console.error(err); alert('Erro de rede.'); }
        });
    });

    /* --- Editar nome da casa --- */
    const btnEditar = document.getElementById('btnEditarCasa');
    if (btnEditar) {
        btnEditar.addEventListener('click', async () => {
            const casaId = btnEditar.dataset.casaId;
            const novoNome = (document.getElementById('novoNomeCasa').value || '').trim();
            if (!novoNome) return alert('Digite um novo nome.');

            try {
                const res = await fetch(`/casa/${casaId}/editar/`, {
                    method: 'POST',
                    headers: {'Content-Type':'application/json','X-CSRFToken': csrftoken},
                    body: JSON.stringify({ nome: novoNome })
                });
                const data = await res.json();
                alert(data.mensagem || data.erro);
                if (res.ok) window.location.reload();
            } catch (err) { console.error(err); alert('Erro de rede.'); }
        });
    }

    /* --- Excluir casa --- */
    const btnExcluir = document.getElementById('btnExcluirCasa');
    if (btnExcluir) {
        btnExcluir.addEventListener('click', async () => {
            if (!confirm('Tem certeza que deseja excluir esta casa?')) return;
            const casaId = btnExcluir.dataset.casaId;

            try {
                const res = await fetch(`/casa/${casaId}/excluir/`, {
                    method: 'POST',
                    headers: {'X-CSRFToken': csrftoken}
                });
                const data = await res.json();
                alert(data.mensagem || data.erro);
                if (res.ok) window.location.reload();
            } catch (err) { console.error(err); alert('Erro de rede.'); }
        });
    }

    /* --- Definir papel --- */
    document.querySelectorAll('.papel-select').forEach(select => {
        select.addEventListener('change', async () => {
            const casaId = select.dataset.casaId;
            const usuario_id = select.dataset.userId;
            const papel = select.value;

            try {
                const res = await fetch(`/casa/${casaId}/definir_papel/`, {
                    method: 'POST',
                    headers: {'Content-Type':'application/json','X-CSRFToken': csrftoken},
                    body: JSON.stringify({ usuario_id, papel })
                });
                const data = await res.json();
                alert(data.mensagem || data.erro);
                if (res.ok) window.location.reload();
            } catch (err) { console.error(err); alert('Erro de rede.'); }
        });
    });
});