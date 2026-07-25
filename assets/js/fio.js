// ============================================================
// SIGOM v2 — módulo Ficha FIO (Fase 3)
// Depende de globais definidas em app.js: sb, OBRAS, PERFIL, $, fmtMoeda, fmtPct
// ============================================================
const FIO_BUCKET = "fio-fotos";
// Campos narrativos/editáveis da ficha (persistidos em fio_edicoes.conteudo).
// Os demais dados (financeiro, % medido, IDP, empresa etc.) vêm sempre AO VIVO da tabela `obras`,
// nunca são congelados aqui — isso evita o problema já conhecido de dados financeiros desatualizados.
const FIO_CAMPOS_EDITAVEIS = ["TITULO", "AO", "CONCEP", "FUND", "ESTR", "COB", "PAR", "TERRA", "PA", "OBS", "DATA"];

let FIO_OBRA_ATUAL = null;   // objeto da obra selecionada (mesma shape usada na aba Obras)
let FIO_REGISTRO = null;     // linha atual de fio_edicoes (ou null se ainda não existe)
let FIO_FOTO_URL = null;     // object URL da foto carregada (para exibição)

function podeEditarFio() {
  return PERFIL === "administrador" || PERFIL === "editor";
}

// ============================================================
// LISTA DE OBRAS (reaproveita o cache OBRAS já carregado pela aba Obras)
// ============================================================
function carregarFio() {
  renderListaObrasFio();
  $("#fioBusca").oninput = renderListaObrasFio;
}

function renderListaObrasFio() {
  const busca = $("#fioBusca").value.trim().toLowerCase();
  const ul = $("#listaObrasFio");

  if (!OBRAS.length) {
    ul.innerHTML = `<li class="emptyMsg">Nenhuma obra carregada. Abra a aba "Obras" primeiro.</li>`;
    return;
  }

  const lista = !busca ? OBRAS : OBRAS.filter((o) => {
    const alvo = [o.opus, o.contrato, o.om_beneficiada, o.empresa].filter(Boolean).join(" ").toLowerCase();
    return alvo.includes(busca);
  });

  ul.innerHTML = lista.slice(0, 300).map((o) => `
    <li data-id="${o.id}" class="${FIO_OBRA_ATUAL?.id === o.id ? "active" : ""}">
      <b>${o.opus || "—"}</b> · ${o.contrato || "—"}<br><span style="color:#5a6b7a">${o.om_beneficiada || o.rm || ""}</span>
    </li>
  `).join("");

  ul.querySelectorAll("li[data-id]").forEach((li) => {
    li.addEventListener("click", () => abrirFichaFio(li.dataset.id));
  });
}

// ============================================================
// ABRIR / CARREGAR A FICHA DE UMA OBRA
// ============================================================
async function abrirFichaFio(obraId) {
  FIO_OBRA_ATUAL = OBRAS.find((o) => o.id === obraId);
  if (!FIO_OBRA_ATUAL) return;
  renderListaObrasFio();

  $("#fioEditorWrap").innerHTML = `<div class="emptyMsg">Carregando ficha…</div>`;

  const { data, error } = await sb
    .from("fio_edicoes")
    .select("id, conteudo, foto_path, versao")
    .eq("obra_id", obraId)
    .maybeSingle();

  if (error) {
    $("#fioEditorWrap").innerHTML = `<div class="emptyMsg">Erro ao carregar ficha: ${error.message}</div>`;
    return;
  }

  FIO_REGISTRO = data || null;
  FIO_FOTO_URL = null;

  renderFichaFio();

  if (FIO_REGISTRO?.foto_path) {
    const { data: blobData, error: dlErr } = await sb.storage.from(FIO_BUCKET).download(FIO_REGISTRO.foto_path);
    if (!dlErr && blobData) {
      FIO_FOTO_URL = URL.createObjectURL(blobData);
      const img = document.getElementById("fioFotoImg");
      if (img) img.src = FIO_FOTO_URL;
    }
  }
}

// ============================================================
// RENDERIZAR O SLIDE DA FICHA FIO
// ============================================================
function renderFichaFio() {
  const o = FIO_OBRA_ATUAL;
  const c = FIO_REGISTRO?.conteudo || {};
  const editavel = podeEditarFio();
  const ed = (v) => (editavel ? `contenteditable="true"` : "");

  const valor = fmtMoeda(o.valor_atual);
  const empenho = fmtMoeda(o["Total NE"] ?? o.total_ne);
  const saldo = fmtMoeda(o["saldo de empenho"]);
  const exec = fmtPct(o.percentual_medido);
  const medmensal = o["media mensal global"] != null ? fmtPct(o["media mensal global"]) : "—";
  const idp = o.IDP != null ? Number(o.IDP).toFixed(2) : "—";
  const inicio = o["Início (OS)"] ? new Date(o["Início (OS)"]).toLocaleDateString("pt-BR") : "—";
  const entrega = o["data projetada"] || o["Fim Vigência"]
    ? new Date(o["data projetada"] || o["Fim Vigência"]).toLocaleDateString("pt-BR") : "—";

  $("#fioEditorWrap").innerHTML = `
    <div class="fioToolbar">
      ${editavel ? `<button class="btnSalvarFio" id="btnSalvarFio">Salvar ficha</button>` : ""}
      <button class="btnImprimirFio" id="btnImprimirFio">Imprimir / PDF</button>
      <button class="btnPngFio" id="btnPngFio">Baixar PNG</button>
      <button class="btnCopiarFio" id="btnCopiarFio">Copiar imagem</button>
      <button class="btnImprimirFio" id="btnPptxFio" style="background:#5a3d99">Gerar PPTX (FIO oficial)</button>
      <span id="fioStatus"></span>
    </div>

    <div class="fioSlide" id="fioSlideCard">
      <div class="fioHead">
        <div class="rmLine">${o.rm || "—"} · SIGOM</div>
        <div class="titulo" id="f_TITULO" ${ed()}>${c.TITULO || o.descricao || o.nome_obra || "Título da obra"}</div>
      </div>
      <div class="fioOpusBar">
        <span><b>OPUS</b>${o.opus || "—"}</span>
        <span><b>Contrato</b>${o.contrato || "—"}</span>
        <span><b>AO</b><span id="f_AO" ${ed()}>${c.AO || "—"}</span></span>
      </div>
      <div class="fioCarac">
        <div class="titCarac">Características técnicas</div>
        <ul>
          <li><b>Concepção:</b><span id="f_CONCEP" ${ed()}>${c.CONCEP || "—"}</span></li>
          <li><b>Fundações:</b><span id="f_FUND" ${ed()}>${c.FUND || "—"}</span></li>
          <li><b>Estrutura:</b><span id="f_ESTR" ${ed()}>${c.ESTR || "—"}</span></li>
          <li><b>Cobertura:</b><span id="f_COB" ${ed()}>${c.COB || "—"}</span></li>
          <li><b>Paredes:</b><span id="f_PAR" ${ed()}>${c.PAR || "—"}</span></li>
          <li><b>Terraplenagem:</b><span id="f_TERRA" ${ed()}>${c.TERRA || "—"}</span></li>
        </ul>
      </div>
      <table class="fioTabela">
        <tr><td class="lbl">Início</td><td>${inicio}</td><td class="lbl">Empresa</td><td>${o.empresa || "—"}</td></tr>
        <tr><td class="lbl">Valor</td><td>${valor}</td><td class="lbl">Empenho</td><td>${empenho}</td></tr>
        <tr><td class="lbl">Saldo</td><td>${saldo}</td><td class="lbl">% Executado</td><td>${exec}</td></tr>
        <tr><td class="lbl">Média mensal</td><td>${medmensal}</td><td class="lbl">Entrega prevista</td><td>${entrega}</td></tr>
        <tr><td class="lbl2">PA</td><td id="f_PA" ${ed()}>${c.PA || "—"}</td><td class="lbl2">IDP</td><td>${idp}</td></tr>
      </table>
      <div class="fioFotoObs">
        <div class="fioFoto">
          ${FIO_FOTO_URL
            ? `<img id="fioFotoImg" src="${FIO_FOTO_URL}">`
            : `<div class="semFoto" id="fioFotoImgWrap">Sem foto</div>`}
          ${editavel ? `<div><input type="file" id="fioFotoInput" accept="image/*"></div>` : ""}
        </div>
        <div class="fioObs">
          <div class="titObs">Observações</div>
          <div id="f_OBS" ${ed()}>${c.OBS || "—"}</div>
        </div>
      </div>
      <div class="fioRodape">
        <span>Data da ficha: <span id="f_DATA" ${ed()}>${c.DATA || new Date().toLocaleDateString("pt-BR")}</span></span>
        <span>SIGOM · DOM/DEC</span>
      </div>
    </div>
  `;

  if (editavel) {
    $("#btnSalvarFio").addEventListener("click", salvarFichaFio);
    $("#fioFotoInput")?.addEventListener("change", uploadFotoFio);
  }
  $("#btnImprimirFio").addEventListener("click", () => window.print());
  $("#btnPngFio").addEventListener("click", () => exportarFioImagem("download"));
  $("#btnCopiarFio").addEventListener("click", () => exportarFioImagem("clipboard"));
  $("#btnPptxFio").addEventListener("click", () => gerarFioPptx([FIO_OBRA_ATUAL.id], $("#fioStatus")));
}

// ============================================================
// SALVAR FICHA (upsert em fio_edicoes)
// ============================================================
async function salvarFichaFio() {
  const conteudo = {};
  FIO_CAMPOS_EDITAVEIS.forEach((campo) => {
    const el = document.getElementById("f_" + campo);
    conteudo[campo] = el ? el.textContent.trim() : "";
  });

  const status = $("#fioStatus");
  status.textContent = "Salvando…";

  const payload = {
    obra_id: FIO_OBRA_ATUAL.id,
    conteudo,
    versao: (FIO_REGISTRO?.versao || 0) + 1,
    editado_por: CURRENT_USER_ID,
  };
  if (FIO_REGISTRO?.foto_path) payload.foto_path = FIO_REGISTRO.foto_path;

  const { data, error } = await sb
    .from("fio_edicoes")
    .upsert(payload, { onConflict: "obra_id" })
    .select()
    .single();

  if (error) {
    status.textContent = "Erro ao salvar: " + error.message;
    return;
  }
  FIO_REGISTRO = data;
  status.textContent = "Ficha salva ✓";
  setTimeout(() => { if (status.textContent === "Ficha salva ✓") status.textContent = ""; }, 3000);
}

// ============================================================
// UPLOAD DE FOTO (com redimensionamento em canvas antes de subir)
// ============================================================
function uploadFotoFio(e) {
  const file = e.target.files[0];
  if (!file) return;

  const img = new Image();
  const reader = new FileReader();
  reader.onload = (ev) => { img.src = ev.target.result; };
  img.onload = async () => {
    const maxLado = 1000;
    let { width, height } = img;
    if (width > maxLado || height > maxLado) {
      const escala = maxLado / Math.max(width, height);
      width *= escala; height *= escala;
    }
    const canvas = document.createElement("canvas");
    canvas.width = width; canvas.height = height;
    canvas.getContext("2d").drawImage(img, 0, 0, width, height);

    canvas.toBlob(async (blob) => {
      const status = $("#fioStatus");
      status.textContent = "Enviando foto…";
      const path = `${FIO_OBRA_ATUAL.id}.jpg`;
      const { error: upErr } = await sb.storage.from(FIO_BUCKET).upload(path, blob, { upsert: true, contentType: "image/jpeg" });
      if (upErr) { status.textContent = "Erro ao enviar foto: " + upErr.message; return; }

      const { data, error } = await sb
        .from("fio_edicoes")
        .upsert({ obra_id: FIO_OBRA_ATUAL.id, foto_path: path, conteudo: FIO_REGISTRO?.conteudo || {}, editado_por: CURRENT_USER_ID }, { onConflict: "obra_id" })
        .select()
        .single();
      if (!error) FIO_REGISTRO = data;

      FIO_FOTO_URL = URL.createObjectURL(blob);
      const wrap = document.getElementById("fioFotoImgWrap");
      if (wrap) wrap.outerHTML = `<img id="fioFotoImg" src="${FIO_FOTO_URL}">`;
      else document.getElementById("fioFotoImg").src = FIO_FOTO_URL;
      status.textContent = "Foto salva ✓";
    }, "image/jpeg", 0.85);
  };
  reader.readAsDataURL(file);
}

// ============================================================
// EXPORTAR IMAGEM (PNG / área de transferência) via html2canvas
// ============================================================
async function exportarFioImagem(modo) {
  const status = $("#fioStatus");
  status.textContent = "Gerando imagem…";
  const canvas = await html2canvas(document.getElementById("fioSlideCard"), { scale: 2, backgroundColor: "#ffffff" });

  if (modo === "download") {
    const link = document.createElement("a");
    link.download = `FIO_${FIO_OBRA_ATUAL.opus || "obra"}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    status.textContent = "PNG baixado ✓";
  } else {
    canvas.toBlob(async (blob) => {
      try {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        status.textContent = "Imagem copiada ✓ — cole no PowerPoint";
      } catch (err) {
        status.textContent = "Não foi possível copiar (navegador sem suporte). Use 'Baixar PNG'.";
      }
    });
  }
}

// ============================================================
// GERAÇÃO DO FIO EM POWERPOINT (Fase 5 — via Netlify Function em Python)
// Reaproveitada também pela aba Grupos (gerar PPTX de todas as obras do grupo).
// ============================================================
async function gerarFioPptx(obraIds, statusEl) {
  if (!obraIds || !obraIds.length) { alert("Nenhuma obra para gerar."); return; }
  const { data: { session } } = await sb.auth.getSession();
  if (statusEl) statusEl.textContent = `Gerando PowerPoint (${obraIds.length} obra(s))…`;

  try {
    const res = await fetch("/api/gerar-fio", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` },
      body: JSON.stringify({ obraIds }),
    });
    if (!res.ok) {
      const erro = await res.json().catch(() => ({}));
      if (statusEl) statusEl.textContent = "Erro: " + (erro.msg || res.statusText);
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `FIO_SIGOM_${new Date().toISOString().slice(0, 10)}.pptx`;
    a.click();
    URL.revokeObjectURL(url);
    if (statusEl) statusEl.textContent = "PowerPoint gerado ✓";
  } catch (err) {
    if (statusEl) statusEl.textContent = "Falha ao gerar PowerPoint: " + err.message;
  }
}
window.gerarFioPptx = gerarFioPptx;

window.carregarFio = carregarFio;
