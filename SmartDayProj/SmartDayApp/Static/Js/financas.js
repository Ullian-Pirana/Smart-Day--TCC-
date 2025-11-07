document.addEventListener("DOMContentLoaded", async () => {

    const modal = document.getElementById("modalFinanceiro");
    const toast = document.getElementById("toastSucesso");

    const btnRenda = document.getElementById("btnAddRenda");
    const btnGasto = document.getElementById("btnAddGasto");
    const confirmar = document.getElementById("confirmar");
    const cancelar = document.getElementById("cancelar");

    const valorInput = document.getElementById("valorInput");
    const localInput = document.getElementById("localInput");
    const notaInput = document.getElementById("notaInput");

    let modo = "renda";

    function csrf() {
        let cookie = document.cookie.split(";").find(x => x.trim().startsWith("csrftoken="));
        return cookie ? cookie.split("=")[1] : "";
    }

    function abrirModal(tipo) {
        modo = tipo;
        modal.style.display = "flex";

        document.getElementById("modalTitulo").textContent =
            tipo === "renda" ? "Registrar Renda" : "Registrar Gasto";
    }

    function fecharModal() {
        modal.style.display = "none";
        valorInput.value = "";
        localInput.value = "";
        notaInput.value = "";
    }

    async function enviar() {
        let valor = valorInput.value;

        if (!valor) {
            alert("Digite um valor.");
            return;
        }

        let body = {
            valor: valor,
            local: localInput.value,
            nota: notaInput.value,
            categoria: modo,
            data: new Date().toISOString().slice(0,10)
        };

        let url = modo === "renda" ? "/financas/salvar-renda/" : "/financas/salvar-gasto/";

        const resp = await fetch(url, {
            method: "POST",
            headers: {
                "X-CSRFToken": csrf(),
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        });

        if (resp.ok) {
            toast.style.display = "block";
            setTimeout(() => toast.style.display = "none", 2000);
            fecharModal();
            location.reload();
        }
    }

    btnRenda.onclick = () => abrirModal("renda");
    btnGasto.onclick = () => abrirModal("gasto");

    confirmar.onclick = enviar;
    cancelar.onclick = fecharModal;

    // ============================
    //   GRÁFICO
    // ============================

    const ctx = document.getElementById("graficoDiario");

    const resp = await fetch("/financas/grafico-mensal/");
    const dados = await resp.json();

    new Chart(ctx, {
        type: "line",
        data: {
            labels: Object.keys(dados),
            datasets: [{
                label: "Gastos por dia",
                data: Object.values(dados),
                borderWidth: 3
            }]
        }
    });
});