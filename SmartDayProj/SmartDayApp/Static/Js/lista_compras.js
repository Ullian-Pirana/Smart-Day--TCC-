document.addEventListener("DOMContentLoaded", () => {
    const lista = document.getElementById("listaCompras");
    const btnAdicionar = document.getElementById("btnAdicionar");
    const btnAprovar = document.getElementById("btnAprovar");
    const modal = document.getElementById("modalAdicionar");
    const salvarItem = document.getElementById("salvarItem");
    const cancelarItem = document.getElementById("cancelarItem");
    const tituloHeader = document.getElementById("tituloHeader");

    let modoAprovacao = false;

    function getCSRF() {
        return document.cookie.split('; ').find(row => row.startsWith('csrftoken=')).split('=')[1];
    }

    async function carregarLista() {
        const resp = await fetch("/compras/");
        const html = await resp.text();
        document.body.innerHTML = html;
    }

    function renderizar(itens, aguardando=false) {
        lista.innerHTML = "";
        itens.forEach(item => {
            const li = document.createElement("li");
            li.className = "item-compra";
            if (item.comprado) li.classList.add("comprado");

            li.innerHTML = `
                <div>
                    <input type="checkbox" ${item.comprado ? "checked" : ""}>
                    <span>${item.nome}</span>
                </div>
                <small>${item.valor_unitario ? "R$ " + item.valor_unitario : "Não informado"} × ${item.quantidade}</small>
            `;

            const checkbox = li.querySelector("input");
            checkbox.addEventListener("change", async () => {
                await fetch(`/compras/status/${item.id}/`, {
                    method: "POST",
                    headers: { "X-CSRFToken": getCSRF() }
                });
                li.classList.toggle("comprado");
            });

            li.addEventListener("click", () => {
                if (modoAprovacao && aguardando) abrirModalAprovacao(item);
            });

            lista.appendChild(li);
        });
    }

    btnAdicionar.addEventListener("click", () => modal.style.display = "flex");
    cancelarItem.addEventListener("click", () => modal.style.display = "none");

    salvarItem.addEventListener("click", async () => {
        const nome = document.getElementById("nomeItem").value;
        const valor = document.getElementById("valorItem").value;
        const quantidade = document.getElementById("quantidadeItem").value || 1;

        const resp = await fetch("/compras/criar/", {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-CSRFToken": getCSRF() },
            body: JSON.stringify({ nome, valor_unitario: valor, quantidade })
        });

        modal.style.display = "none";
        location.reload();
    });

    if (btnAprovar) {
        btnAprovar.addEventListener("click", async () => {
            modoAprovacao = !modoAprovacao;
            tituloHeader.textContent = modoAprovacao ? "Itens aguardando aprovação" : "Lista de compras";
            btnAprovar.textContent = modoAprovacao ? "Voltar" : "Aprovar Itens";
            const dados = await fetch("/compras/");
            const html = await dados.text();
            document.body.innerHTML = html;
        });
    }

    function abrirModalAprovacao(item) {
        const overlay = document.createElement("div");
        overlay.className = "modal";
        overlay.style.display = "flex";
        overlay.innerHTML = `
            <div class="modal-content">
                <h3>${item.nome}</h3>
                <p>Valor: ${item.valor_unitario || "Não informado"}</p>
                <p>Quantidade: ${item.quantidade}</p>
                <div class="modal-actions">
                    <button id="btnAprov">Aprovar</button>
                    <button id="btnRecus">Recusar</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        overlay.querySelector("#btnAprov").addEventListener("click", async () => {
            await fetch(`/compras/aprovar/${item.id}/`, { method: "POST", headers: { "X-CSRFToken": getCSRF() }});
            overlay.remove();
            location.reload();
        });

        overlay.querySelector("#btnRecus").addEventListener("click", async () => {
            await fetch(`/compras/recusar/${item.id}/`, { method: "POST", headers: { "X-CSRFToken": getCSRF() }});
            overlay.remove();
            location.reload();
        });
    }
});