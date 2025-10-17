document.addEventListener("DOMContentLoaded", () => {
    const calendarBar = document.getElementById("calendarBar");
    const tarefasContainer = document.getElementById("tarefasContainer");
    const btnCriar = document.getElementById("btnCriar");
    const modal = document.getElementById("modalCriar");
    const salvarBtn = document.getElementById("salvarTarefa");
    const cancelarBtn = document.getElementById("cancelarTarefa");
    const searchInput = document.getElementById("searchInput");

    let dataAtual = new Date();

    // ====== GERA O CALENDÁRIO ======
    function gerarCalendario(ano, mes) {
        calendarBar.innerHTML = "";
        const dias = new Date(ano, mes + 1, 0).getDate();

        for (let d = 1; d <= dias; d++) {
            const diaEl = document.createElement("div");
            diaEl.textContent = d;
            if (d === dataAtual.getDate()) diaEl.classList.add("active");
            diaEl.addEventListener("click", () => {
                document.querySelectorAll(".calendar-bar div").forEach(el => el.classList.remove("active"));
                diaEl.classList.add("active");
                dataAtual = new Date(ano, mes, d);
                carregarTarefas();
            });
            calendarBar.appendChild(diaEl);
        }
    }

    // ====== BUSCA TAREFAS ======
    async function carregarTarefas() {
        const dataISO = dataAtual.toISOString().split("T")[0];
        const resp = await fetch(`/todo/listar/?data=${dataISO}`);
        const json = await resp.json();

        tarefasContainer.innerHTML = "";

        json.tarefas
            .filter(t => t.titulo.toLowerCase().includes(searchInput.value.toLowerCase()))
            .forEach(t => {
                const card = document.createElement("div");
                card.className = "tarefa-card";
                card.innerHTML = `
                    <h4>${t.titulo}</h4>
                    <span class="status ${t.concluida ? 'concluida' : 'pendente'}"></span>
                `;
                card.addEventListener("click", () => abrirCardDetalhe(t));
                tarefasContainer.appendChild(card);
            });
    }

    // ====== MODAL DE DETALHES ======
    function abrirCardDetalhe(tarefa) {
        const overlay = document.createElement("div");
        overlay.classList.add("modal");
        overlay.style.display = "flex";
        overlay.innerHTML = `
            <div class="modal-content">
                <h3>${tarefa.titulo}</h3>
                <p><strong>Descrição:</strong> ${tarefa.descricao}</p>
                <p><strong>Adicionado por:</strong> ${tarefa.criado_por}</p>
                <p><strong>Início:</strong> ${tarefa.data_inicio}</p>
                <p><strong>Fim:</strong> ${tarefa.data_fim}</p>
                <button id="toggleStatus">${tarefa.concluida ? 'Marcar como pendente' : 'Marcar como concluída'}</button>
                <button id="fecharModal">Fechar</button>
            </div>
        `;
        document.body.appendChild(overlay);

        overlay.querySelector("#fecharModal").addEventListener("click", () => overlay.remove());
        overlay.querySelector("#toggleStatus").addEventListener("click", async () => {
            await fetch(`/todo/status/${tarefa.id}/`, { method: "POST", headers: { "X-CSRFToken": getCSRF() } });
            overlay.remove();
            carregarTarefas();
        });
    }

    // ====== CRIAR TAREFA ======
    btnCriar.addEventListener("click", () => modal.style.display = "flex");
    cancelarBtn.addEventListener("click", () => modal.style.display = "none");

    salvarBtn.addEventListener("click", async () => {
        const data = {
            titulo: document.getElementById("titulo").value,
            descricao: document.getElementById("descricao").value,
            data_inicio: document.getElementById("dataInicio").value,
            data_fim: document.getElementById("dataFim").value
        };
        await fetch("/todo/criar/", {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-CSRFToken": getCSRF() },
            body: JSON.stringify(data)
        });
        modal.style.display = "none";
        carregarTarefas();
    });

    searchInput.addEventListener("input", carregarTarefas);

    // ====== CSRF ======
    function getCSRF() {
        const name = "csrftoken=";
        const decodedCookie = decodeURIComponent(document.cookie);
        const ca = decodedCookie.split(';');
        for (let c of ca) {
            while (c.charAt(0) === ' ') c = c.substring(1);
            if (c.indexOf(name) === 0) return c.substring(name.length, c.length);
        }
        return "";
    }

    // Inicialização
    gerarCalendario(dataAtual.getFullYear(), dataAtual.getMonth());
    carregarTarefas();
});