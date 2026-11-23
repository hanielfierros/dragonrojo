// SESPATE — Componente de comparativos (ranking) interactivo.

import { ESTIMADOS, COLORES } from "./config.js";
import { formatoUnidad } from "./kpi.js";
import { renderBarra } from "./charts.js";

function renderComparativos(contenedor, { comparativos, periodo }) {
  contenedor.innerHTML = "";
  if (!comparativos || comparativos.length === 0) return;

  const titulo = document.createElement("div");
  titulo.className = "section-title";
  titulo.textContent = "Comparativos";
  contenedor.appendChild(titulo);

  const grupo = document.createElement("div");
  grupo.className = "cmp-group";
  comparativos.forEach((cmp, i) => {
    const btn = document.createElement("button");
    btn.className = "btn";
    btn.type = "button";
    btn.textContent = cmp.nombre;
    if (ESTIMADOS.has(cmp.id)) {
      const nota = document.createElement("span");
      nota.className = "note-estimacion";
      nota.textContent = "Estimación DEMO";
      btn.appendChild(nota);
    }
    btn.addEventListener("click", () => mostrarComparativo(contenedor, cmp, periodo, btn));
    grupo.appendChild(btn);
  });
  contenedor.appendChild(grupo);

  const resultado = document.createElement("div");
  resultado.className = "cmp-result";
  resultado.id = "cmp-resultado";
  contenedor.appendChild(resultado);
}

function mostrarComparativo(contenedor, cmp, periodo, btn) {
  const resultado = contenedor.querySelector("#cmp-resultado");
  resultado.innerHTML = "";
  const { datos, esEstimacion } = cmp;

  if (!datos || datos.length === 0) {
    resultado.innerHTML = '<div class="state-msg">No hay información disponible para los filtros seleccionados.</div>';
    return;
  }

  const cabecera = document.createElement("div");
  cabecera.className = "cmp-meta";
  cabecera.innerHTML = `<strong>${cmp.nombre}</strong> · KPI ${cmp.kpi} · ${periodo}${esEstimacion ? ' · <span class="note-estimacion">Estimación DEMO</span>' : ""}`;
  resultado.appendChild(cabecera);

  // Lista ranking (con empates)
  const lista = document.createElement("div");
  let pos = 1;
  let prev = null;
  datos.forEach((d, i) => {
    const valor = d[cmp.claveValor];
    let posicion = pos;
    if (prev !== null && valor === prev) posicion = pos; // empate conserva posición
    else pos = i + 1;
    posicion = pos;
    prev = valor;
    const fila = document.createElement("div");
    fila.className = "cmp-rank";
    fila.innerHTML = `<span class="rank-pos">${posicion}</span><span class="rank-name">${d.nombre}</span><span class="rank-val">${formatoUnidad(valor, cmp.unidad)}</span>`;
    lista.appendChild(fila);
  });
  resultado.appendChild(lista);

  // Gráfica de barras
  const chartDiv = document.createElement("div");
  chartDiv.className = "chart chart-sm";
  chartDiv.style.marginTop = "12px";
  resultado.appendChild(chartDiv);
  renderBarra(chartDiv, {
    titulo: null,
    categorias: datos.map(d => d.nombre),
    series: [{ nombre: cmp.nombre, datos: datos.map(d => d[cmp.claveValor]), color: COLORES.primario }],
    unidad: cmp.unidad,
    horizontal: false,
  });
}

export { renderComparativos };
