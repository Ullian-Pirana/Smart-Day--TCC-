document.addEventListener("DOMContentLoaded", () => {
    const listaEl = document.getElementById("listaCompras");
    const btnAdicionar = document.getElementById("btnAdicionar");
    const btnAprovar = document.getElementById("btnAprovar");
    const modal = document.getElementById("modalAdicionar");
    const salvarItem = document.getElementById("salvarItem");
    const cancelarItem = document.getElementById("cancelarItem");
    const tituloHeader = document.getElementById("tituloHeader");

    let modoAprovacao = false;
    let cacheAguardando = [];
    let cacheAprovados = [];
    let isResponsavel = false;

    function log(...args) { console.log("[ListaCompras]", ...args); }

    function getCSRF() {
        const name = "csrftoken=";
        const decoded = decodeURIComponent(document.cookie || "");
        const parts = decoded.split(';');
        for (let p of parts) {
            p = p.trim();
            if (p.startsWith(name)) return p.substring(name.length);
        }
        return "";
    }

    function toast(msg, tipo="sucesso") {
        const el = document.createElement("div");
        el.textContent = msg;
        el.className = `toast-msg ${tipo}`;
        document.body.appendChild(el);
        el.style.display = "block";
        setTimeout(() => { el.remove(); }, 3000);
    }

    async function carregarDados() {
        try {
            const resp = await fetch("/compras/listar/");
            if (!resp.ok) {
                const txt = await resp.text();
                log("Erro ao buscar itens:", resp.status, txt);
                toast("Erro ao carregar lista.", "erro");
                return;
            }
            const json = await resp.json();
            cacheAguardando = json.aguardando || [];
            cacheAprovados = json.aprovados || [];
            isResponsavel = !!json.is_responsavel;
            render();
        } catch (err) {
            console.error(err);
            toast("Erro de conexão ao carregar itens.", "erro");
        }
    }

    function formatValor(val) {
        if (val === null || val === undefined) return "Não informado";
        return "R$ " + Number(val).toFixed(2);
    }

    // === CRIAR ELEMENTO DE ITEM (com botão de excluir integrado) ===
    function criarItemElement(item, aguardandoFlag = false) {
        const li = document.createElement("li");
        li.className = "item-compra";
        if (item.comprado) li.classList.add("comprado");

        li.innerHTML = `
            <div class="item-left">
                <input type="checkbox" class="item-checkbox" ${item.comprado ? "checked" : ""} />
                <span class="item-nome">${item.nome}</span>
            </div>
            <div class="item-right">
                <small class="item-valor">${formatValor(item.valor_unitario)} × ${item.quantidade}</small>
            </div>
        `;

        // --- botão de exclusão ---
        if (isResponsavel || item.eh_do_usuario) {
            const btnExcluir = document.createElement("button");
            btnExcluir.className = "btn-excluir";
            btnExcluir.textContent = "🗑️";
            btnExcluir.title = "Excluir item";
            btnExcluir.addEventListener("click", async (ev) => {
                ev.stopPropagation();
                if (!confirm(`Excluir "${item.nome}" da lista?`)) return;
                try {
                    const resp = await fetch(`/compras/excluir/${item.id}/`, {
                        method: "POST",
                        headers: { "X-CSRFToken": getCSRF() }
                    });
                    const json = await resp.json();
                    if (!resp.ok) throw new Error(json.erro || "Erro ao excluir");
                    toast("Item excluído!");
                    await carregarDados();
                } catch (err) {
                    console.error(err);
                    toast("Erro ao excluir item.", "erro");
                }
            });
            li.querySelector(".item-right").appendChild(btnExcluir);
        }

        // clicar no item abre modal de detalhe
        li.addEventListener("click", (ev) => {
            if (ev.target.classList.contains("item-checkbox")) return;
            abrirDetalhe(item, aguardandoFlag);
        });

        // checkbox de status
        const checkbox = li.querySelector(".item-checkbox");
        checkbox.addEventListener("change", async (e) => {
            e.stopPropagation();
            try {
                const resp = await fetch(`/compras/status/${item.id}/`, {
                    method: "POST",
                    headers: { "X-CSRFToken": getCSRF() }
                });
                if (!resp.ok) {
                    toast("Erro ao atualizar status.", "erro");
                    checkbox.checked = !checkbox.checked;
                    return;
                }
                item.comprado = !item.comprado;
                li.classList.toggle("comprado", item.comprado);
            } catch (err) {
                console.error(err);
                toast("Erro ao atualizar status.", "erro");
                checkbox.checked = !checkbox.checked;
            }
        });

        return li;
    }

    function render() {
        listaEl.innerHTML = "";

        if (modoAprovacao) {
            tituloHeader.textContent = "Itens aguardando aprovação";
            if (cacheAguardando.length === 0) {
                listaEl.innerHTML = "<p>Nenhum item aguardando aprovação.</p>";
            } else {
                cacheAguardando.forEach(i => listaEl.appendChild(criarItemElement(i, true)));
            }
            return;
        }

        tituloHeader.textContent = "Lista de compras";
        if (cacheAprovados.length === 0) {
            if (cacheAguardando.length === 0) {
                listaEl.innerHTML = "<p>Nenhum item na lista.</p>";
            } else {
                listaEl.innerHTML = "<p>Nenhum item aprovado ainda.</p>";
            }
        } else {
            cacheAprovados.forEach(i => listaEl.appendChild(criarItemElement(i, false)));
        }
    }

    // === MODAL DE DETALHES / APROVAÇÃO / EDIÇÃO ===
    function abrirDetalhe(item, aguardandoFlag = false) {
        const overlay = document.createElement("div");
        overlay.className = "modal";
        overlay.style.display = "flex";
        overlay.style.zIndex = "10000";

        const podeEditar = isResponsavel && !aguardandoFlag;
        const showAprovButtons = isResponsavel && aguardandoFlag;

        overlay.innerHTML = `
            <div class="modal-content" style="z-index:10001;">
                <h3>${item.nome}</h3>
                <div class="detalhes">
                    <p><strong>Valor unitário:</strong> ${formatValor(item.valor_unitario)}</p>
                    <p><strong>Quantidade:</strong> ${item.quantidade}</p>
                    <p><strong>Adicionado por:</strong> ${item.criado_por}</p>
                    <div class="modal-actions"></div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        const actions = overlay.querySelector(".modal-actions");

        if (showAprovButtons) {
            const aprovBtn = document.createElement("button");
            aprovBtn.className = "btn-primary";
            aprovBtn.textContent = "Aprovar";
            aprovBtn.addEventListener("click", async () => {
                try {
                    const r = await fetch(`/compras/aprovar/${item.id}/`, { method: "POST", headers: { "X-CSRFToken": getCSRF() }});
                    if (!r.ok) throw new Error("erro");
                    toast("Item aprovado!");
                    overlay.remove();
                    await carregarDados();
                } catch (err) {
                    console.error(err);
                    toast("Erro ao aprovar.", "erro");
                }
            });
            const recusBtn = document.createElement("button");
            recusBtn.className = "btn-danger";
            recusBtn.textContent = "Recusar";
            recusBtn.addEventListener("click", async () => {
                try {
                    const r = await fetch(`/compras/recusar/${item.id}/`, { method: "POST", headers: { "X-CSRFToken": getCSRF() }});
                    if (!r.ok) throw new Error("erro");
                    toast("Item recusado.");
                    overlay.remove();
                    await carregarDados();
                } catch (err) {
                    console.error(err);
                    toast("Erro ao recusar.", "erro");
                }
            });
            actions.appendChild(aprovBtn);
            actions.appendChild(recusBtn);
        }

        if (podeEditar) {
            const editar = document.createElement("button");
            editar.className = "btn-edit";
            editar.textContent = "Editar";
            editar.addEventListener("click", () => {
                overlay.remove();
                abrirEdicao(item);
            });
            actions.appendChild(editar);
        }

        const fechar = document.createElement("button");
        fechar.className = "btn-secondary";
        fechar.textContent = "Fechar";
        fechar.addEventListener("click", () => overlay.remove());
        actions.appendChild(fechar);
    }

    function abrirEdicao(item) {
        const overlay = document.createElement("div");
        overlay.className = "modal";
        overlay.style.display = "flex";
        overlay.style.zIndex = "10000";

        overlay.innerHTML = `
            <div class="modal-content" style="z-index:10001;">
                <h3>Editar Item</h3>
                <label>Nome</label>
                <input id="editNome" value="${item.nome}" />
                <label>Valor unitário</label>
                <input id="editValor" type="number" step="0.01" value="${item.valor_unitario || ''}" />
                <label>Quantidade</label>
                <input id="editQtd" type="number" value="${item.quantidade}" />
                <div class="modal-actions">
                    <button id="salvarEd" class="btn-primary">Salvar</button>
                    <button id="cancelEd" class="btn-secondary">Cancelar</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        overlay.querySelector("#cancelEd").addEventListener("click", () => overlay.remove());
        overlay.querySelector("#salvarEd").addEventListener("click", async () => {
            const novoNome = overlay.querySelector("#editNome").value.trim();
            const novoValor = overlay.querySelector("#editValor").value;
            const novaQtd = parseInt(overlay.querySelector("#editQtd").value) || 1;

            if (!novoNome) {
                toast("Nome é obrigatório.", "erro");
                return;
            }

            try {
                const resp = await fetch(`/compras/editar/${item.id}/`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "X-CSRFToken": getCSRF() },
                    body: JSON.stringify({ nome: novoNome, valor_unitario: novoValor || null, quantidade: novaQtd })
                });
                if (!resp.ok) throw new Error("Erro ao editar");
                toast("Item atualizado!");
                overlay.remove();
                await carregarDados();
            } catch (err) {
                console.error(err);
                toast("Erro ao editar item.", "erro");
            }
        });
    }

    // === EVENTOS GERAIS ===
    btnAdicionar.addEventListener("click", () => modal.style.display = "flex");
    cancelarItem.addEventListener("click", () => modal.style.display = "none");

    salvarItem.addEventListener("click", async () => {
        const nome = document.getElementById("nomeItem").value.trim();
        const valor = document.getElementById("valorItem").value;
        const quantidade = parseInt(document.getElementById("quantidadeItem").value) || 1;

        if (!nome) {
            toast("Preencha o nome do item.", "erro");
            return;
        }

        try {
            const resp = await fetch("/compras/criar/", {
                method: "POST",
                headers: { "Content-Type": "application/json", "X-CSRFToken": getCSRF() },
                body: JSON.stringify({ nome, valor_unitario: valor || null, quantidade })
            });
            const json = await resp.json();
            if (!resp.ok) throw new Error(json.erro || "Erro ao criar item");
            toast("Item criado" + (json.aprovado ? "" : " (aguardando aprovação)"));
            modal.style.display = "none";
            document.getElementById("nomeItem").value = "";
            document.getElementById("valorItem").value = "";
            document.getElementById("quantidadeItem").value = "";
            await carregarDados();
        } catch (err) {
            console.error(err);
            toast("Erro ao criar item.", "erro");
        }
    });

    if (btnAprovar) {
        btnAprovar.addEventListener("click", () => {
            modoAprovacao = !modoAprovacao;
            btnAprovar.textContent = modoAprovacao ? "Voltar" : "Aprovar Itens";
            render();
        });
    }

    // === INICIALIZAÇÃO ===
    carregarDados();
});