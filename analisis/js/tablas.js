// SESPATE — Renderizado de tablas reutilizable.

import { formatoUnidad } from "./kpi.js";

function renderTabla(contenedor, { columnas, filas, titulo, meta, vacio = "No hay información disponible para los filtros seleccionados." }) {
  contenedor.innerHTML = "";
  if (titulo) {
    const h = document.createElement("div");
    h.className = "section-title";
    h.textContent = titulo;
    contenedor.appendChild(h);
  }
  if (!filas || filas.length === 0) {
    const msg = document.createElement("div");
    msg.className = "state-msg";
    msg.textContent = vacio;
    contenedor.appendChild(msg);
    return;
  }
  const wrap = document.createElement("div");
  wrap.className = "table-wrap";
  const table = document.createElement("table");
  table.className = "ir";
  const thead = document.createElement("thead");
  const trh = document.createElement("tr");
  for (const col of columnas) {
    const th = document.createElement("th");
    th.textContent = col.titulo;
    if (col.num) th.className = "num";
    trh.appendChild(th);
  }
  thead.appendChild(trh);
  table.appendChild(thead);
  const tbody = document.createElement("tbody");
  for (const fila of filas) {
    const tr = document.createElement("tr");
    for (const col of columnas) {
      const td = document.createElement("td");
      if (col.num) td.className = "num";
      const v = fila[col.clave];
      td.textContent = col.unidad ? formatoUnidad(v, col.unidad) : (v == null ? "—" : String(v));
      td.setAttribute("data-label", col.titulo);
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  wrap.appendChild(table);
  contenedor.appendChild(wrap);
  if (meta) {
    const m = document.createElement("div");
    m.className = "ir-meta";
    m.textContent = meta;
    contenedor.appendChild(m);
  }
}

export { renderTabla };
