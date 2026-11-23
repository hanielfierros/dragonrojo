// SESPATE — Utilidades de formato y tarjetas de KPI.

const fmtMXN = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });
const fmtNum = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 });
const fmtInt = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 });

function formatoMXN(v) { return v == null ? "—" : fmtMXN.format(v); }
function formatoNum(v) { return v == null ? "—" : fmtNum.format(v); }
function formatoInt(v) { return v == null ? "—" : fmtInt.format(v); }
function formatoPct(v) { return v == null ? "—" : `${fmtNum.format(v)} %`; }
function formatoUnidad(v, unidad) {
  if (v == null) return "—";
  if (unidad === "MXN") return fmtMXN.format(v);
  if (unidad === "%") return `${fmtNum.format(v)} %`;
  if (unidad === "km/L" || unidad === "L/100km" || unidad === "MXN/km" || unidad === "MXN/h" || unidad === "MXN/L" || unidad === "MXN/servicio") return fmtNum.format(v);
  if (unidad === "km" || unidad === "L" || unidad === "min" || unidad === "h" || unidad === "días" || unidad === "km/mes") return fmtNum.format(v);
  if (unidad === "#" || unidad === "servicios" || unidad === "clientes" || unidad === "inc/km" || unidad === "#/servicio" || unidad === "inc/1000km") return fmtInt.format(v);
  return `${fmtNum.format(v)}`;
}

function crearTarjeta({ etiqueta, valor, unidad, nota, estimacion = false }) {
  const el = document.createElement("div");
  el.className = "kpi";
  el.innerHTML = `
    <div class="kpi-label">${etiqueta}</div>
    <div class="kpi-value">${formatoUnidad(valor, unidad)}</div>
    <div class="kpi-unit">${unidad || ""}${estimacion ? '<span class="note-estimacion">Estimación DEMO</span>' : ""}</div>
    ${nota ? `<div class="kpi-note">${nota}</div>` : ""}
  `;
  return el;
}

function renderKpiGrid(contenedor, kpis) {
  contenedor.innerHTML = "";
  const grid = document.createElement("div");
  grid.className = "kpi-grid";
  for (const k of kpis) grid.appendChild(crearTarjeta(k));
  contenedor.appendChild(grid);
}

export { formatoMXN, formatoNum, formatoInt, formatoPct, formatoUnidad, crearTarjeta, renderKpiGrid };
