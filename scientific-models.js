/* ============================================================
   SECURITYTRANS — Información metodológica y fundamento científico (R10)
   ============================================================ */

import { DataLoader } from "./data-loader.js";

const NOMBRES_ESTADO = {
  "EJECUTADO": "Ejecutado y validado",
  "EJECUTADO_CON_SUPUESTOS": "Ejecutado con supuestos",
  "APLICABLE_PENDIENTE": "Aplicable, pendiente de implementación",
  "REQUIERE_CALIBRACION": "Requiere calibración",
  "REQUIERE_PARAMETROS_EXTERNOS": "Requiere parámetros externos",
  "REQUIERE_HISTORICO": "Requiere histórico",
  "REQUIERE_DATOS": "Requiere datos",
  "NO_IDENTIFICABLE": "No identificable",
};

export async function init() {
  const body = document.getElementById("METHODOLOGY_BODY");
  body.innerHTML = '<p class="state-msg">Cargando información metodológica…</p>';
  try {
    const sci = await DataLoader.cientificos();
    let html = `<p class="ir-meta">Los 60 modelos provienen del registro científico del proyecto (MODEL_REGISTRY.json). La ciencia compleja se ejecutó en Python; el navegador presenta los resultados. Los 7 servicios simulados no permiten entrenar modelos de aprendizaje automático.</p>`;
    html += `<div class="table-wrap"><table class="ir">
      <thead><tr><th>Metodología</th><th>Nombre</th><th>Modelos</th><th>Estado en el prototipo</th></tr></thead><tbody>`;
    sci.metodologias.forEach(m => {
      html += `<tr><td>${m.id}</td><td>${m.nombre}</td><td class="num">${m.modelos}</td><td>${NOMBRES_ESTADO[m.estado] || m.estado}</td></tr>`;
    });
    html += `</tbody></table></div>`;
    html += `<details class="collapsible"><summary>Ver los 60 modelos (estado de aplicabilidad)</summary>
      <div class="table-wrap"><table class="ir">
      <thead><tr><th>ID</th><th>Metodología</th><th>Nombre</th><th>Aplicabilidad</th></tr></thead><tbody>`;
    sci.modelos.forEach(m => {
      html += `<tr><td>${m.codigo}</td><td>${m.metodologia}</td><td>${m.nombre}</td><td>${m.estado_aplicabilidad.replace(/_/g, " ")}</td></tr>`;
    });
    html += `</tbody></table></div></details>`;
    html += `<p class="ir-meta">Fuente de datos: los 7 servicios simulados (SECURITYTRANS PHASE 03.1). Datos técnicos no confirmados marcados como Estimado/Pendiente. Sin ground truth de anomalías publicado.</p>`;
    body.innerHTML = html;

    // Vincular botones "Ver fundamento matemático"
    body.querySelectorAll("[data-ver-modelo]").forEach(b => {
      b.addEventListener("click", () => verModelo(b.dataset.verModelo, sci));
    });
  } catch (e) {
    body.innerHTML = `<p class="state-msg">Error al cargar la información metodológica: ${e.message}</p>`;
  }
}

function verModelo(codigo, sci) {
  const m = sci.modelos.find(x => x.codigo === codigo);
  if (!m) return;
  const box = document.getElementById("METHODOLOGY_BODY");
  box.innerHTML = `
    <h4>${m.codigo} — ${m.nombre}</h4>
    <p><strong>Metodología:</strong> ${m.metodologia}</p>
    <p><strong>Objetivo:</strong> ${m.objetivo}</p>
    <p><strong>Estado en el prototipo:</strong> ${NOMBRES_ESTADO[m.estado_ejecucion_web] || m.estado_ejecucion_web}</p>
    <p><strong>Aplicabilidad (registro):</strong> ${m.estado_aplicabilidad.replace(/_/g, " ")}</p>
    <p><strong>Limitaciones:</strong> ${m.limitaciones}</p>
    <button class="btn" id="B_VOLVER_MODELOS">Volver a la lista</button>`;
  document.getElementById("B_VOLVER_MODELOS").addEventListener("click", () => init());
}
