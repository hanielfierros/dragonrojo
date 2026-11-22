/* ============================================================
   SECURITYTRANS — Orquestador del Dashboard (entry point)
   ============================================================ */

import { DataLoader } from "./data-loader.js";
import * as G from "./charts.js";
import * as CMP from "./comparisons.js";
import * as SD from "./service-details.js";
import * as SCI from "./scientific-models.js";

let servicios = [];
let filtrados = [];
let catalogos = null;
let historial = null;

const COLS_TABLA = [
  ["folio", "Folio"], ["fecha", "Fecha"], ["origen", "Origen"], ["destino", "Destino"],
  ["operador", "Operador"], ["distancia_km", "Distancia"], ["tiempo_total_h", "Duración"],
  ["litros_presupuestados_L", "Litros plan."], ["consumo_motor_L", "Litros modelo"],
  ["consumo_total_L", "Salida balance"], ["rendimiento_balance_tanque_kmL", "Rendimiento"],
  ["presupuesto_MXN", "Presupuesto"], ["costo_consumo_MXN", "Costo"],
  ["ahorro_sobrecosto_MXN", "Ahorro/Sobrecosto"],
];

async function init() {
  try {
    [catalogos, servicios, historial] = await Promise.all([
      DataLoader.catalogos(), DataLoader.resumen(), DataLoader.historial(),
    ]);
    filtrados = [...servicios];
    renderVehiculo();
    renderFiltros();
    renderKpis();
    renderChartTabs();
    CMP.init(servicios);
    renderTabla();
    await SCI.init();
  } catch (e) {
    document.getElementById("KPI_GRID").innerHTML = `<p class="state-msg">Error al cargar datos: ${e.message}</p>`;
  }
}

function renderVehiculo() {
  const v = catalogos.vehiculos[0];
  const el = document.getElementById("VEHICLE_PROFILE");
  el.innerHTML = `
    ${vp("Número económico", v.unidad_referencia, "real")}
    ${vp("Marca", v.marca, "real")}
    ${vp("Modelo", v.modelo_operativo + " (" + v.modelo_cientifico + ")", "real")}
    ${vp("Placa (ficticia)", v.placa_ficticia, "simulado")}
    ${vp("Carrocería", v.carroceria, "real")}
    ${vp("Blindaje", v.blindaje, "real")}
    ${vp("Motor", v.motor, "pendiente")}
    ${vp("Potencia", v.potencia_kW + " kW", "pendiente")}
    ${vp("Transmisión", v.transmision, "pendiente")}
    ${vp("Tanque", v.capacidad_tanque_L + " L", "real")}
    ${vp("Masa vehicular (blindada)", v.masa_vacio_blindado_kg + " kg", "pendiente")}
    ${vp("Rendimiento administrativo", v.rend_admin_ref_kmL + " km/L", "real")}
    ${vp("Kilometraje", historial.odo_final_acumulado_km + " km", "calculado")}
    ${vp("Servicios registrados", servicios.length + "", "calculado")}
  `;
}

function vp(label, value, clase) {
  return `<div class="vp-item"><div class="vp-label">${label}</div><div class="vp-value">${value}</div><div class="vp-status">${chip(clase)}</div></div>`;
}

function chip(clase) {
  const mapa = { real: "Real", simulado: "Simulado", pendiente: "Estimado/Pendiente", calculado: "Calculado" };
  return `<span class="status-chip ${clase}">${mapa[clase] || clase}</span>`;
}

function renderFiltros() {
  const v = document.getElementById("F_VEHICULO");
  const o = document.getElementById("F_OPERADOR");
  const r = document.getElementById("F_RUTA");
  catalogos.vehiculos.forEach(x => v.add(new Option(x.modelo_operativo, x.ID_VEHICULO)));
  catalogos.operadores.forEach(x => o.add(new Option(x.nombre, x.ID_OPERADOR)));
  catalogos.rutas.forEach(x => r.add(new Option(x.origen + " → " + x.destino, x.ID_RUTA)));
  document.getElementById("B_APLICAR_FILTROS").addEventListener("click", aplicarFiltros);
  document.getElementById("B_LIMPIAR_FILTROS").addEventListener("click", limpiarFiltros);
  actualizarResumenFiltros();
}

function aplicarFiltros() {
  const v = document.getElementById("F_VEHICULO").value;
  const o = document.getElementById("F_OPERADOR").value;
  const fi = document.getElementById("F_FECHA_INI").value;
  const ff = document.getElementById("F_FECHA_FIN").value;
  const est = document.getElementById("F_ESTADO").value;
  const pres = document.getElementById("F_PRESUPUESTO").value;

  filtrados = servicios.filter(s => {
    if (v && s.id_vehiculo !== v) return false;
    if (o && s.id_operador !== o) return false;
    if (fi && s.fecha < fi) return false;
    if (ff && s.fecha > ff) return false;
    if (est && s.naturaleza !== est) return false;
    if (pres === "ahorro" && s.ahorro_sobrecosto_MXN <= 0) return false;
    if (pres === "sobrecosto" && s.ahorro_sobrecosto_MXN >= 0) return false;
    return true;
  });
  renderKpis();
  renderTabla();
  actualizarResumenFiltros();
}

function limpiarFiltros() {
  ["F_VEHICULO", "F_OPERADOR", "F_RUTA", "F_FECHA_INI", "F_FECHA_FIN", "F_ESTADO", "F_PRESUPUESTO"].forEach(id => {
    document.getElementById(id).value = "";
  });
  filtrados = [...servicios];
  renderKpis();
  renderTabla();
  actualizarResumenFiltros();
}

function actualizarResumenFiltros() {
  const el = document.getElementById("FILTER_SUMMARY");
  const fechas = filtrados.map(s => s.fecha).sort();
  el.textContent = `Servicios seleccionados: ${filtrados.length} · Periodo: ${fechas[0] || "—"} a ${fechas[fechas.length - 1] || "—"} · Naturaleza: datos simulados`;
}

function renderKpis() {
  const n = filtrados.length;
  const km = filtrados.reduce((a, s) => a + s.distancia_km, 0);
  const litros = filtrados.reduce((a, s) => a + s.consumo_total_L, 0);
  const litrosMotor = filtrados.reduce((a, s) => a + s.consumo_motor_L, 0);
  const costo = filtrados.reduce((a, s) => a + s.costo_consumo_MXN, 0);
  const presup = filtrados.reduce((a, s) => a + s.presupuesto_MXN, 0);
  const ralenti = filtrados.reduce((a, s) => a + s.tiempo_ralenti_h, 0);
  const horas = filtrados.reduce((a, s) => a + s.tiempo_total_h, 0);
  const difNoExp = filtrados.reduce((a, s) => a + s.diferencia_no_explicada_L, 0);
  const rendPond = litros > 0 ? (km / litros).toFixed(2) : "No calculable";
  const costoKm = km > 0 ? (costo / km).toFixed(2) : "No calculable";

  const kpis = [
    ["Servicios realizados", n, "", "simulado"],
    ["Kilómetros acumulados", km.toFixed(0), "km", "calculado"],
    ["Horas de operación", horas.toFixed(1), "h", "calculado"],
    ["Horas de ralentí", ralenti.toFixed(1), "h", "calculado"],
    ["Litros consumidos (balance)", litros.toFixed(1), "L", "calculado"],
    ["Rendimiento ponderado", rendPond, "km/L", "calculado"],
    ["Litros / 100 km", (litros / km * 100).toFixed(2), "L/100km", "calculado"],
    ["Presupuesto acumulado", "$" + presup.toFixed(0), "MXN", "calculado"],
    ["Costo del consumo", "$" + costo.toFixed(0), "MXN", "calculado"],
    ["Costo promedio por km", "$" + costoKm, "MXN/km", "calculado"],
    ["Ahorro simulado", "$" + (presup - costo).toFixed(0), "MXN", "simulado"],
    ["Dif. no explicada", difNoExp.toFixed(1), "L", "calculado"],
  ];
  document.getElementById("KPI_GRID").innerHTML = kpis.map(k =>
    `<div class="kpi"><div class="kpi-label">${k[0]}</div><div class="kpi-value">${k[1]}</div><div class="kpi-unit">${k[2]}</div><div class="kpi-note">${chip(k[3])}</div></div>`
  ).join("");
}

const TABS = [
  ["Rendimiento", (s) => G.g01Rendimiento(s, 3.6, null)],
  ["Combustible", (s) => G.g02Combustible(s)],
  ["Presupuesto vs costo", (s) => G.g03Presupuesto(s)],
  ["Kilometraje", (s, h) => G.g04Kilometraje(h)],
  ["Costo por km", (s) => G.g05CostoKm(s)],
  ["Por operador", (s) => G.g06Operadores(s)],
  ["Ahorros", (s) => G.g07Ahorros(s)],
  ["Tiempo", (s) => G.g08Tiempo(s)],
  ["Ralentí", (s) => G.g09Ralenti(s)],
  ["Velocidad vs consumo", (s) => G.g12VelocidadConsumo(s)],
  ["Ralentí vs costo", (s) => G.g13RalentiCosto(s)],
];

function renderChartTabs() {
  const tabs = document.getElementById("CHART_TABS");
  tabs.innerHTML = "";
  TABS.forEach((t, i) => {
    const b = document.createElement("button");
    b.className = "tab" + (i === 0 ? " active" : "");
    b.textContent = t[0];
    b.setAttribute("role", "tab");
    b.addEventListener("click", () => {
      tabs.querySelectorAll(".tab").forEach(x => x.classList.remove("active"));
      b.classList.add("active");
      dibujar(t[1]);
    });
    tabs.appendChild(b);
  });
  dibujar(TABS[0][1]);
}

function dibujar(fn) {
  const cont = document.getElementById("CHART_CONTAINER");
  cont.innerHTML = '<div class="chart" id="CHART_MAIN"></div>';
  if (fn.length >= 2 && historial) { fn(filtrados, historial); }
  else { fn(filtrados); }
}

function renderTabla() {
  const head = document.getElementById("SERVICE_TABLE_HEAD");
  const body = document.getElementById("SERVICE_TABLE_BODY");
  const termino = (document.getElementById("IR_SEARCH").value || "").toLowerCase();

  head.innerHTML = "<th></th>" + COLS_TABLA.map(c => `<th data-col="${c[0]}">${c[1]}</th>`).join("") + "<th>Estado</th><th>Alertas</th>";

  const datos = filtrados.filter(s =>
    !termino || s.folio.toLowerCase().includes(termino) || s.operador.toLowerCase().includes(termino)
    || s.origen.toLowerCase().includes(termino) || s.destino.toLowerCase().includes(termino));

  body.innerHTML = datos.map(s => {
    const celdas = COLS_TABLA.map(c => `<td data-label="${c[1]}" class="num">${s[c[0]]}</td>`).join("");
    const alertas = s.diferencia_no_explicada_L > 5 ? "⚠" : "";
    return `<tr>
      <td><button class="btn" data-expand="${s.folio}" aria-expanded="false" aria-controls="R_SERVICE_DETAIL">+</button></td>
      ${celdas}
      <td data-label="Estado">${chip("simulado")}</td>
      <td data-label="Alertas">${alertas}</td>
    </tr>`;
  }).join("");

  document.getElementById("IR_META").textContent = `${datos.length} registros`;

  // Ordenamiento por clic en encabezado
  head.querySelectorAll("th[data-col]").forEach(th => {
    th.addEventListener("click", () => {
      const col = th.dataset.col;
      filtrados.sort((a, b) => (a[col] < b[col] ? -1 : 1));
      renderTabla();
    });
  });

  // Expandir servicio
  body.querySelectorAll("[data-expand]").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (SD.servicioAbierto() === btn.dataset.expand) { SD.cerrarServicio(); }
      else { await SD.abrirServicio(btn.dataset.expand); }
    });
  });
}

function exportCSV() {
  const head = COLS_TABLA.map(c => c[1]).join(",");
  const filas = filtrados.map(s => COLS_TABLA.map(c => `"${s[c[0]]}"`).join(",")).join("\n");
  const blob = new Blob([head + "\n" + filas], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "securitytrans_servicios.csv";
  a.click();
  URL.revokeObjectURL(a.href);
}

// Event listeners globales
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("IR_SEARCH").addEventListener("input", debounce(renderTabla, 250));
  document.getElementById("B_EXPORT_CSV").addEventListener("click", exportCSV);
  // Redibujar gráficas al cambiar el tema
  window.addEventListener("securitytrans:theme", () => {
    const tabs = document.getElementById("CHART_TABS");
    const activo = tabs.querySelector(".tab.active");
    if (activo) {
      const idx = [...tabs.children].indexOf(activo);
      dibujar(TABS[idx][1]);
    }
  });
  init();
});

function debounce(fn, ms) {
  let t;
  return function () { clearTimeout(t); t = setTimeout(fn, ms); };
}
