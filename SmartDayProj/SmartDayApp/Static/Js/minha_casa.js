document.addEventListener("DOMContentLoaded", () => {
  const modalCriar = document.getElementById("modalCriarCasa");
  const modalGerenciar = document.getElementById("modalGerenciarCasa");
  const btnCriarCasa = document.getElementById("btnCriarCasa");
  const salvarCasa = document.getElementById("salvarCasa");
  const cancelarCasa = document.getElementById("cancelarCasa");
  const fecharGerenciar = document.getElementById("fecharGerenciar");

  const tituloCasa = document.getElementById("tituloCasa");
  const donoCasa = document.getElementById("donoCasa");
  const listaMembros = document.getElementById("listaMembros");
  const selectUsuarios = document.getElementById("selectUsuarios");
  const btnAddUsuario = document.getElementById("btnAddUsuario");

  let casaAtiva = null;

  // === Funções utilitárias ===
  function getCSRFToken() {
    const name = "csrftoken";
    const cookies = document.cookie.split(";").map(c => c.trim());
    for (let cookie of cookies) {
      if (cookie.startsWith(name + "=")) return cookie.substring(name.length + 1);
    }
    return "";
  }

  function abrirModal(modal) { modal.style.display = "flex"; }
  function fecharModal(modal) { modal.style.display = "none"; }

  // === Criação de Casa ===
  btnCriarCasa.addEventListener("click", () => abrirModal(modalCriar));
  cancelarCasa.addEventListener("click", () => fecharModal(modalCriar));

  salvarCasa.addEventListener("click", async () => {
    const nome = document.getElementById("nomeCasa").value.trim();
    if (!nome) return alert("Digite um nome para a casa!");

    const resp = await fetch("/casa/criar/", {
      method: "POST",
      headers: {
        "X-CSRFToken": getCSRFToken(),
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ nome })
    });

    const data = await resp.json();
    if (resp.ok) {
      alert("Casa criada com sucesso!");
      location.reload();
    } else {
      alert(data.erro || "Erro ao criar casa");
    }
  });

  // === Abrir gerenciamento ===
  document.querySelectorAll(".btn-gerenciar").forEach(btn => {
    btn.addEventListener("click", async () => {
      casaAtiva = btn.dataset.id;
      const resp = await fetch(`/casa/${casaAtiva}/gerenciar/`);
      if (!resp.ok) return alert("Erro ao carregar casa.");
      const html = await resp.text();

      // Extraímos dados relevantes do HTML (render do Django)
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");

      const nome = doc.querySelector("h2")?.innerText || "Casa";
      const dono = doc.querySelector("p")?.innerText || "";
      const membros = [...doc.querySelectorAll("li")].map(li => li.innerText);

      tituloCasa.innerText = nome;
      donoCasa.innerText = dono;

      listaMembros.innerHTML = "";
      membros.forEach(m => {
        const li = document.createElement("li");
        li.textContent = m;
        const btnRem = document.createElement("button");
        btnRem.textContent = "Remover";
        btnRem.onclick = () => removerMembro(m);
        li.appendChild(btnRem);
        listaMembros.appendChild(li);
      });

      // Carrega lista de usuários disponíveis via endpoint (poderia ser adicionado na view)
      const usuariosResp = await fetch(`/api/usuarios_disponiveis/${casaAtiva}/`);
      if (usuariosResp.ok) {
        const users = await usuariosResp.json();
        selectUsuarios.innerHTML = "";
        users.forEach(u => {
          const opt = document.createElement("option");
          opt.value = u.id;
          opt.textContent = u.username;
          selectUsuarios.appendChild(opt);
        });
      }

      abrirModal(modalGerenciar);
    });
  });

  fecharGerenciar.addEventListener("click", () => fecharModal(modalGerenciar));

  // === Adicionar usuário ===
  btnAddUsuario.addEventListener("click", async () => {
    const usuarioId = selectUsuarios.value;
    if (!usuarioId) return alert("Selecione um usuário!");

    const resp = await fetch(`/casa/${casaAtiva}/adicionar_usuario/`, {
      method: "POST",
      headers: {
        "X-CSRFToken": getCSRFToken(),
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ usuario_id: usuarioId })
    });

    const data = await resp.json();
    if (resp.ok) {
      alert("Usuário adicionado!");
      fecharModal(modalGerenciar);
      location.reload();
    } else {
      alert(data.erro || "Erro ao adicionar usuário");
    }
  });

  async function removerMembro(nomeUsuario) {
    const confirmacao = confirm(`Remover ${nomeUsuario}?`);
    if (!confirmacao) return;

    // Essa parte precisará do ID do usuário (pode ser adaptado na view)
    alert("Remoção funcional pode ser adaptada conforme view JSON.");
  }
});