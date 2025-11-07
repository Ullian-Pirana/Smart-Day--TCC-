document.addEventListener("DOMContentLoaded", () => {

    const modal = document.getElementById("modalFinanceiro");
    const modalEdit = document.getElementById("modalEditar");
    const toast = document.getElementById("toastSucesso");

    const btnTransacao = document.getElementById("btnTransacao");
    const confirmar = document.getElementById("confirmar");
    const cancelar = document.getElementById("cancelar");

    const confirmarEdit = document.getElementById("confirmarEdit");
    const cancelarEdit = document.getElementById("cancelarEdit");

    let transacaoAtual = null;

    function csrf() {
        let cookie = document.cookie.split(";").find(x => x.trim().startsWith("csrftoken="));
        return cookie ? cookie.split("=")[1] : "";
    }

    function abrirModal() {
        modal.style.display = "flex";
    }

    function fecharModal() {
        modal.style.display = "none";
        document.getElementById("valorInput").value = "";
        document.getElementById("localInput").value = "";
        document.getElementById("notaInput").value = "";
        document.getElementById("dataInput").value = "";
    }

    function abrirModalEditar(t) {
        modalEdit.style.display = "flex";

        transacaoAtual = t.id;

        document.getElementById("editValor").value = t.valor;
        document.getElementById("editLocal").value = t.local;
        document.getElementById("editNota").value = t.nota;
        document.getElementById("editData").value = t.data;

        document.querySelector(`input[name="editCat"][value="${t.categoria}"]`).checked = true;
    }

    function fecharModalEditar() {
        modalEdit.style.display = "none";
    }

    async function enviar() {

        let body = {
            valor: document.getElementById("valorInput").value,
            local: document.getElementById("localInput").value,
            nota: document.getElementById("notaInput").value,
            data: document.getElementById("dataInput").value,
            categoria: document.querySelector('input[name="cat"]:checked').value
        };

        const resp = await fetch("/financas/salvar-transacao/", {
            method: "POST",
            headers: {
                "X-CSRFToken": csrf(),
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        });

        if (resp.ok) {
            location.reload();
        }
    }

    async function salvarEdicao() {

        let body = {
            valor: document.getElementById("editValor").value,
            local: document.getElementById("editLocal").value,
            nota: document.getElementById("editNota").value,
            data: document.getElementById("editData").value,
            categoria: document.querySelector('input[name="editCat"]:checked').value
        };

        const resp = await fetch(`/financas/editar/${transacaoAtual}/`, {
            method: "POST",
            headers: {
                "X-CSRFToken": csrf(),
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        });

        if (resp.ok) {
            location.reload();
        }
    }

    async function excluirTransacao(id) {
        const resp = await fetch(`/financas/excluir/${id}/`);
        if (resp.ok) {
            location.reload();
        }
    }

    async function carregarTransacoes() {
        const resp = await fetch("/financas/listar/");
        const lista = await resp.json();

        const box = document.getElementById("listaTransacoes");
        box.innerHTML = "";

        lista.forEach(t => {
            const div = document.createElement("div");
            div.className = "item-transacao";

            div.innerHTML = `
                <div class="item-header">
                    <span class="${t.categoria === 'renda' ? 'valor-entrada' : 'valor-saida'}">
                        R$ ${t.valor}
                    </span>
                    <span>${t.data}</span>
                </div>

                <p>${t.local || ''}</p>
                <small>${t.nota || ''}</small>

                <div class="item-btns">
                    <button class="btn-edit" data-id="${t.id}">Editar</button>
                    <button class="btn-del" data-id="${t.id}">Excluir</button>
                </div>
            `;

            // Editar
            div.querySelector(".btn-edit").onclick = () => abrirModalEditar(t);

            // Excluir
            div.querySelector(".btn-del").onclick = () => excluirTransacao(t.id);

            box.appendChild(div);
        });
    }

    let chart = null;

    async function carregarGrafico() {
        const ctx = document.getElementById("graficoDiario");
        const resp = await fetch("/financas/grafico-mensal/");
        const dados = await resp.json();

        if (chart) chart.destroy();

        chart = new Chart(ctx, {
            type: "line",
            data: {
                labels: dados.labels,
                datasets: [
                    {
                        label: "Entradas",
                        data: dados.entradas,
                        borderColor: "lime",
                        borderWidth: 2
                    },
                    {
                        label: "Saídas",
                        data: dados.saidas,
                        borderColor: "red",
                        borderWidth: 2
                    }
                ]
            }
        });
    }

    if (btnTransacao) btnTransacao.onclick = abrirModal;
    confirmar.onclick = enviar;
    cancelar.onclick = fecharModal;

    confirmarEdit.onclick = salvarEdicao;
    cancelarEdit.onclick = fecharModalEditar;

    carregarTransacoes();
    carregarGrafico();
});