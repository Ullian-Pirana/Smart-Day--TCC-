document.addEventListener("DOMContentLoaded", () => {
    const calendarBar = document.getElementById("calendarBar");
    const tarefasContainer = document.getElementById("tarefasContainer");
    const btnCriar = document.getElementById("btnCriar");
    const modal = document.getElementById("modalCriar");
    const salvarBtn = document.getElementById("salvarTarefa");
    const cancelarBtn = document.getElementById("cancelarTarefa");
    const searchInput = document.getElementById("searchInput");
    const monthLabel = document.getElementById("monthLabel");

    let dataAtual = new Date();

    // ====== ELEMENTO DE NOTIFICAÇÃO ======
    const notificacao = document.createElement("div");
    notificacao.classList.add("toast-msg");
    document.body.appendChild(notificacao);

    function mostrarNotificacao(mensagem, tipo = "sucesso") {
        notificacao.textContent = mensagem;
        notificacao.className = `toast-msg ${tipo}`;
        notificacao.style.display = "block";
        setTimeout(() => (notificacao.style.display = "none"), 3000);
    }

    // ====== MODAL DE CONFIRMAÇÃO ======
    function mostrarConfirmacao(mensagem, onConfirm) {
        // remove modais antigas (caso múltiplas sejam abertas por erro)
        const antiga = document.querySelector(".confirm-overlay");
        if (antiga) antiga.remove();

        // cria overlay + conteúdo
        const overlay = document.createElement("div");
        overlay.classList.add("confirm-overlay");
        overlay.innerHTML = `
            <div class="confirm-modal">
                <p class="confirm-text">${mensagem}</p>
                <div class="confirm-actions">
                    <button class="btn-confirmar">Sim</button>
                    <button class="btn-cancelar">Não</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // animação de entrada
        requestAnimationFrame(() => {
            overlay.classList.add("show");
        });

        const btnSim = overlay.querySelector(".btn-confirmar");
        const btnNao = overlay.querySelector(".btn-cancelar");

        btnSim.addEventListener("click", () => {
            overlay.classList.add("fade-out");
            setTimeout(() => {
                overlay.remove();
                onConfirm();
            }, 200);
        });

        btnNao.addEventListener("click", () => {
            overlay.classList.add("fade-out");
            setTimeout(() => overlay.remove(), 200);
        });
    }

    // ====== GERA O CALENDÁRIO ======
    function gerarCalendario(ano, mes) {
        calendarBar.innerHTML = "";
        const diasNoMes = new Date(ano, mes + 1, 0).getDate();
        const hoje = new Date();
        const nomesMeses = [
            "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
            "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
        ];
        monthLabel.textContent = `${nomesMeses[mes]} ${ano}`;

        for (let d = 1; d <= diasNoMes; d++) {
            const diaEl = document.createElement("div");
            diaEl.textContent = d;
            if (
                d === hoje.getDate() &&
                mes === hoje.getMonth() &&
                ano === hoje.getFullYear()
            ) {
                diaEl.classList.add("active");
            }

            diaEl.addEventListener("click", () => {
                document.querySelectorAll(".calendar-bar div").forEach(el => el.classList.remove("active"));
                diaEl.classList.add("active");
                dataAtual = new Date(ano, mes, d);
                carregarTarefas();
            });

            calendarBar.appendChild(diaEl);
        }

        // Scroll automático até o dia atual
        const activeDay = document.querySelector(".calendar-bar .active");
        if (activeDay) activeDay.scrollIntoView({ behavior: "smooth", inline: "center" });
    }

    // ====== SELETOR DE MÊS (sem setas) ======
    const seletorMes = document.createElement("input");
    seletorMes.type = "month";
    seletorMes.style.display = "none";
    document.body.appendChild(seletorMes);

    monthLabel.style.cursor = "pointer";
    monthLabel.title = "Clique para escolher outro mês";

    monthLabel.addEventListener("click", () => {
        seletorMes.value = `${dataAtual.getFullYear()}-${String(dataAtual.getMonth() + 1).padStart(2, "0")}`;
        seletorMes.showPicker();
    });

    seletorMes.addEventListener("change", () => {
        const [ano, mes] = seletorMes.value.split("-");
        dataAtual = new Date(parseInt(ano), parseInt(mes) - 1, 1);
        gerarCalendario(dataAtual.getFullYear(), dataAtual.getMonth());
        carregarTarefas();
    });

    // ====== BUSCA TAREFAS ======
    async function carregarTarefas() {
        const dataISO = dataAtual.toISOString().split("T")[0];
        try {
            const resp = await fetch(`/todo/listar/?data=${dataISO}`);
            const json = await resp.json();

            window.usuarioAtual = json.usuario;
            window.isResponsavel = json.is_responsavel;

            tarefasContainer.innerHTML = "";

            if (!json.tarefas || json.tarefas.length === 0) {
                tarefasContainer.innerHTML = "<p>Nenhuma tarefa para este dia.</p>";
                return;
            }

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

        } catch (error) {
            console.error("Erro ao carregar tarefas:", error);
            mostrarNotificacao("Erro ao carregar tarefas.", "erro");
        }
    }

    function abrirCardDetalhe(tarefa) {
        const overlay = document.createElement("div");
        overlay.classList.add("modal");
        overlay.style.display = "flex";
        overlay.style.zIndex = "10000";

        // Checa permissões
        const usuarioAtual = window.usuarioAtual;
        const isResponsavel = window.isResponsavel;
        const podeEditar = (usuarioAtual === tarefa.criado_por) || isResponsavel;

        overlay.innerHTML = `
            <div class="modal-content" style="z-index:10001;">
                <h3>${tarefa.titulo}</h3>
                <p><strong>Descrição:</strong> ${tarefa.descricao || '-'}</p>
                <p><strong>Adicionado por:</strong> ${tarefa.criado_por}</p>
                <p><strong>Início:</strong> ${tarefa.data_inicio}</p>
                <p><strong>Fim:</strong> ${tarefa.data_fim}</p>
                <div class="modal-actions">
                    <button id="toggleStatus" class="btn-primary">${tarefa.concluida ? 'Marcar como pendente' : 'Marcar como concluída'}</button>
                    ${podeEditar ? '<button id="editarTarefa" class="btn-warning">Editar</button>' : ''}
                    ${podeEditar ? '<button id="excluirTarefa" class="btn-danger">Excluir</button>' : ''}
                    <button id="fecharModal" class="btn-secondary">Fechar</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        requestAnimationFrame(() => {
            const btnFechar = overlay.querySelector("#fecharModal");
            const btnStatus = overlay.querySelector("#toggleStatus");
            const btnExcluir = overlay.querySelector("#excluirTarefa");
            const btnEditar = overlay.querySelector("#editarTarefa");

            btnFechar.addEventListener("click", () => {
                overlay.querySelector(".modal-content").classList.add("fade-out");
                overlay.classList.add("fade-out-backdrop");
                setTimeout(() => overlay.remove(), 220);
            });

            btnStatus.addEventListener("click", async () => {
                try {
                    const resp = await fetch(`/todo/status/${tarefa.id}/`, {
                        method: "POST",
                        headers: { "X-CSRFToken": getCSRF() }
                    });
                    if (!resp.ok) throw new Error();
                    mostrarNotificacao("Status atualizado!");
                    overlay.remove();
                    carregarTarefas();
                } catch (err) {
                    console.error(err);
                    mostrarNotificacao("Erro ao atualizar status.", "erro");
                }
            });

            // 🔧 Edição (somente se permitido)
            if (btnEditar) {
                btnEditar.addEventListener("click", async () => {
                    const novoTitulo = prompt("Novo título:", tarefa.titulo);
                    if (!novoTitulo) return;

                    const novoDescricao = prompt("Nova descrição:", tarefa.descricao || "");
                    const novoInicio = prompt("Data de início (YYYY-MM-DD):", tarefa.data_inicio);
                    const novoFim = prompt("Data de fim (YYYY-MM-DD):", tarefa.data_fim);

                    try {
                        const resp = await fetch(`/todo/editar/${tarefa.id}/`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json", "X-CSRFToken": getCSRF() },
                            body: JSON.stringify({
                                titulo: novoTitulo,
                                descricao: novoDescricao,
                                data_inicio: novoInicio,
                                data_fim: novoFim
                            })
                        });
                        if (!resp.ok) throw new Error();
                        mostrarNotificacao("Tarefa editada com sucesso!");
                        overlay.remove();
                        carregarTarefas();
                    } catch (err) {
                        console.error(err);
                        mostrarNotificacao("Erro ao editar tarefa.", "erro");
                    }
                });
            }

            // 🔧 Exclusão (somente se permitido)
            if (btnExcluir) {
                btnExcluir.addEventListener("click", () => {
                    btnExcluir.classList.add("shake");
                    setTimeout(() => btnExcluir.classList.remove("shake"), 600);

                    mostrarConfirmacao("Deseja realmente excluir esta tarefa?", async () => {
                        try {
                            const resp = await fetch(`/todo/excluir/${tarefa.id}/`, {
                                method: "POST",
                                headers: { "X-CSRFToken": getCSRF() }
                            });
                            if (!resp.ok) throw new Error();
                            mostrarNotificacao("Tarefa removida com sucesso!");
                            overlay.remove();
                            carregarTarefas();
                        } catch (err) {
                            console.error(err);
                            mostrarNotificacao("Erro ao excluir tarefa.", "erro");
                            console.error("Resposta do servidor:", erroDetalhe);
                        }
                    });
                });
            }
        });
    }

    // ====== MODAL DE CRIAÇÃO ======
    btnCriar.addEventListener("click", () => modal.style.display = "flex");
    cancelarBtn.addEventListener("click", () => modal.style.display = "none");

    salvarBtn.addEventListener("click", async () => {
        const data = {
            titulo: document.getElementById("titulo").value,
            descricao: document.getElementById("descricao").value,
            data_inicio: document.getElementById("dataInicio").value,
            data_fim: document.getElementById("dataFim").value
        };
        if (!data.titulo || !data.data_inicio || !data.data_fim) {
            mostrarNotificacao("Por favor, preencha todos os campos obrigatórios.", "erro");
            return;
        }

        try {
            const resp = await fetch("/todo/criar/", {
                method: "POST",
                headers: { "Content-Type": "application/json", "X-CSRFToken": getCSRF() },
                body: JSON.stringify(data)
            });

            if (!resp.ok) throw new Error("Erro ao salvar");

            modal.style.display = "none";
            mostrarNotificacao("Tarefa criada com sucesso!");
            carregarTarefas();
        } catch (error) {
            console.error("Erro ao criar tarefa:", error);
            mostrarNotificacao("Erro ao criar tarefa.", "erro");
        }
    });

    // ====== FILTRO DE PESQUISA ======
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

    // ====== INICIALIZAÇÃO ======
    gerarCalendario(dataAtual.getFullYear(), dataAtual.getMonth());
    carregarTarefas();
});