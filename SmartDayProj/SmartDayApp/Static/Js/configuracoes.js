document.addEventListener("DOMContentLoaded", () => {

    const modal = document.getElementById("modalSenha");
    const btnSenha = document.getElementById("btnSenha");
    const cancelarModal = document.getElementById("cancelarModal");
    const salvarSenha = document.getElementById("confirmarSenhaBtn");
    const toast = document.getElementById("toast");

    btnSenha.onclick = () => modal.style.display = "flex";
    cancelarModal.onclick = () => modal.style.display = "none";

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

        toast.style.display = "block";
        setTimeout(() => toast.style.display = "none", 2000);
        modal.style.display = "none";
    };

    // Tema
    const toggleTema = document.getElementById("toggleTema");
    toggleTema.onchange = () => fetch("/configuracoes/toggle-theme/");
});