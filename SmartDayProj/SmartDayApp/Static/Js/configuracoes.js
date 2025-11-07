document.addEventListener("DOMContentLoaded", () => {

    /* =============================
           APLICAR TEMA
    ============================= */
    const toggleTema = document.getElementById("toggleTema");

    function aplicarTemaInicial() {
        const tema = localStorage.getItem("theme") || "light";

        if (tema === "dark") {
            document.documentElement.setAttribute("data-theme", "dark");
            toggleTema.checked = true;
        } else {
            document.documentElement.removeAttribute("data-theme");
            toggleTema.checked = false;
        }
    }

    aplicarTemaInicial();

    toggleTema.addEventListener("change", () => {
        if (toggleTema.checked) {
            document.documentElement.setAttribute("data-theme", "dark");
            localStorage.setItem("theme", "dark");
        } else {
            document.documentElement.removeAttribute("data-theme");
            localStorage.setItem("theme", "light");
        }

        window.dispatchEvent(new CustomEvent("themeChanged"));
    });


    /* =============================
          ALTERAR SENHA
    ============================= */
    const modalSenha = document.getElementById("modalSenha");
    const btnSenha = document.getElementById("btnSenha");
    const cancelarSenha = document.getElementById("cancelarModal");
    const salvarSenha = document.getElementById("confirmarSenhaBtn");
    const toastSenha = document.getElementById("toastSenha");

    btnSenha.onclick = () => modalSenha.style.display = "flex";
    cancelarSenha.onclick = () => modalSenha.style.display = "none";

    function csrf() {
        let cookie = document.cookie.split(";").find(x => x.trim().startsWith("csrftoken="));
        return cookie ? cookie.split("=")[1] : "";
    }

    salvarSenha.onclick = async () => {
        let body = new FormData();
        body.append("senha_atual", document.getElementById("senhaAtual").value);
        body.append("nova_senha", document.getElementById("novaSenha").value);
        body.append("confirmar_senha", document.getElementById("confirmarSenha").value);

        const resp = await fetch("/configuracoes/alterar-senha/", {
            method: "POST",
            headers: { "X-CSRFToken": csrf() },
            body
        });

        const dados = await resp.json();

        if (!resp.ok) {
            alert(dados.erro);
            return;
        }

        toastSenha.style.display = "block";
        setTimeout(() => toastSenha.style.display = "none", 2500);
        modalSenha.style.display = "none";
    };


    /* =============================
         EXCLUIR CONTA
    ============================= */
    const modalExcluir = document.getElementById("modalExcluirConta");
    const btnExcluir = document.getElementById("btnExcluirConta");
    const cancelarExcluir = document.getElementById("cancelarExclusao");
    const confirmarExcluir = document.getElementById("confirmarExcluirBtn");
    const toastExcluido = document.getElementById("toastExcluido");

    btnExcluir.onclick = () => modalExcluir.style.display = "flex";
    cancelarExcluir.onclick = () => modalExcluir.style.display = "none";

    confirmarExcluir.onclick = async () => {
        const resp = await fetch("/configuracoes/excluir-conta/", {
            method: "POST",
            headers: { "X-CSRFToken": csrf() }
        });

        const dados = await resp.json();

        if (resp.ok) {
            toastExcluido.style.display = "block";
            setTimeout(() => {
                window.location.href = "/";
            }, 2000);
        } else {
            alert("Erro ao excluir conta.");
        }
    };


    /* =============================
         ANIMAÇÃO DOS CARDS
    ============================= */
    const cards = document.querySelectorAll(".config-item");
    cards.forEach((card, i) => {
        setTimeout(() => {
            card.classList.add("slide-up");
        }, 100 * i);
    });

});