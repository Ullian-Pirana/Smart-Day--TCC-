document.addEventListener("DOMContentLoaded", () => {
  const fotoInput = document.getElementById("fotoInput");
  const salvarBtn = document.getElementById("salvarPerfil");
  const sobreInput = document.getElementById("sobreInput");
  const contatoInput = document.getElementById("contatoInput");

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

  salvarBtn.onclick = async () => {
    const fd = new FormData();
    if (fotoInput.files && fotoInput.files[0]) {
      fd.append("foto", fotoInput.files[0]);
    }
    fd.append("sobre", sobreInput.value || "");
    fd.append("contato", contatoInput.value || "");

    const resp = await fetch("/perfil/atualizar/", {
      method: "POST",
      headers: { "X-CSRFToken": getCSRF() },
      body: fd
    });

    if (resp.ok) {
      const json = await resp.json();
      // se quiser mostrar preview, pode usar json.foto_url
      location.reload(); // recarrega para mostrar nova foto e textos
    } else {
      alert("Erro ao salvar perfil.");
    }
  };

  // botão gerenciar pode rolar para a área de edição
  const btnGerenciar = document.getElementById("btnGerenciar");
  if (btnGerenciar) {
    btnGerenciar.onclick = () => {
      document.querySelector(".sobre-editar").scrollIntoView({ behavior: "smooth" });
    }
  }
});