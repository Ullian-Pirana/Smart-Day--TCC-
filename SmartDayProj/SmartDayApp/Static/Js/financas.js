document.addEventListener("DOMContentLoaded", async () => {

    const modal = document.getElementById("modalFinanceiro");
    const toast = document.getElementById("toastSucesso");

    const btnTransacao = document.getElementById("btnTransacao");
    const confirmar = document.getElementById("confirmar");
    const cancelar = document.getElementById("cancelar");

    const valorInput = document.getElementById("valorInput");
    const localInput = document.getElementById("localInput");
    const notaInput = document.getElementById("notaInput");
    const dataInput = document.getElementById("dataInput");

    function csrf() {
        let cookie = document.cookie.split(";").find(x => x.trim().startsWith("csrftoken="));
        return cookie ? cookie.split("=")[1] : "";
    }

    function abrirModal() {
        modal.style.display = "flex";
    }

    function fecharModal() {
        modal.style.display = "none";
        valorInput.value = "";
        localInput.value = "";
        notaInput.value = "";
        dataInput.value = "";
    }

    async function enviar() {
        let valor = valorInput.value;
        let data = dataInput.value;

        if (!valor || !data) {
            alert("Informe o valor e a data.");
            return;
        }

        let categoria = document.querySelector('input[name="cat"]:checked').value;

        let body = {
            valor: valor,
            local: localInput.value,
            nota: notaInput.value,
            categoria: categoria,
            data: data,
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
            toast.style.display = "block";
            setTimeout(() => toast.style.display = "none", 2000);
            fecharModal();
            location.reload();
        }
    }

    btnTransacao.onclick = abrirModal;
    confirmar.onclick = enviar;
    cancelar.onclick = fecharModal;

    // ============================
    //   GRÁFICO DIÁRIO
    // ============================

    const ctx = document.getElementById("graficoDiario");

    const resp = await fetch("/financas/grafico-mensal/");
    const dados = await resp.json();

    new Chart(ctx, {
        type: "line",
        data: {
            labels: dados.labels,
            datasets: [
                {
                    label: "Entradas (R$)",
                    data: dados.entradas,
                    borderWidth: 3,
                    borderColor: "green",
                    tension: 0.3
                },
                {
                    label: "Saídas (R$)",
                    data: dados.saidas,
                    borderWidth: 3,
                    borderColor: "red",
                    tension: 0.3
                }
            ]
        }
    });
});