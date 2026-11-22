/* ============================================================
   SECURITYTRANS — Comparaciones dinámicas (R06 / R07)
   ============================================================ */

import { DataLoader } from "./data-loader.js";
import * as G from "./charts.js";

const BOTONES = [
  { id: "comparar_operadores", label: "Comparar operadores", fn: "operadores" },
  { id: "mejores_rendimientos", label: "Mejores rendimientos", fn: "rendimientos" },
  { id: "mayores_ahorros", label: "Mayores ahorros", fn: "ahorros" },
  { id: "mayores_consumos", label: "Mayores consumos", fn: "consumos" },
  { id: "mayores_sobrecostos", label: "Mayores sobrecostos", fn: "sobrecostos" },
  { id: "comparar_tiempos", label: "Comparar tiempos", fn: "tiempos" },
  { id: "comparar_rutas", label: "Comparar rutas", fn: "rutas" },
  { id: "comparar_vehiculos", label: "Comparar vehículos", fn: "vehiculos" },
  { id: "planeado_vs_ejecutado", label: "Planeado vs. esperado vs. ejecutado", fn: "planeado" },
  { id: "comportamiento", label: "Comportamiento de conducción", fn: "comportamiento" },
  { id: "ralenti", label: "Ralentí", fn: "ralenti" },
  { id: "evolucion", label: "Evolución histórica", fn: "evolucion" },
  { id: "anomalias", label: "Anomalías y desviaciones", fn: "anomalias" },
  { id: "oportunidades", label: "Oportunidades de ahorro", fn: "oportunidades" },
];

let datos = null;

export function init(servicios) {
  datos = servicios;
  const cont = document.getElementById("COMPARISON_BUTTONS");
  cont.innerHTML = "";
  BOTONES.forEach(b => {
    const btn = document.createElement("button");
    btn.className = "btn";
    btn.textContent = b.label;
    btn.dataset.fn = b.fn;
    btn.addEventListener("click", () => ejecutar(b));
    cont.appendChild(btn);
  });
}

function region(titulo, html) {
  const sec = document.getElementById("R_COMPARISON_RESULTS");
  sec.hidden = false;
  document.getElementById("COMPARISON_TITLE").textContent = titulo;
  document.getElementById("COMPARISON_BODY").innerHTML = html;
}

function tabla(headers, filas) {
  let h = "<tr>" + headers.map(x => `<th>${x}</th>`).join("") + "</tr>";
  let b = filas.map(f => "<tr>" + f.map(x => `<td class="num">${x}</td>`).join("") + "</tr>").join("");
  return `<div class="table-wrap"><table class="ir"><thead>${h}</thead><tbody>${b}</tbody></table></div>`;
}

function ejecutar(b) {
  const fn = b.fn;
  const s = datos;
  const nota = '<p class="ir-meta">Clasificación de escenarios simulados; no constituye una evaluación laboral real.</p>';

  if (fn === "operadores") {
    const orden = [...s].sort((a, b) => b.rendimiento_balance_tanque_kmL - a.rendimiento_balance_tanque_kmL);
    region("Comparar operadores", nota +
      tabla(["Operador", "Servicios", "km/L", "L/100km", "MXN/km", "Ahorro"],
        orden.map(x => [x.operador, 1, x.rendimiento_balance_tanque_kmL, x.consumo_L_100km, x.costo_por_km_MXN, x.ahorro_sobrecosto_MXN])));
  } else if (fn === "rendimientos") {
    region("Mejores rendimientos", tabla(["Folio", "Operador", "km/L", "L/100km"],
      [...s].sort((a, b) => b.rendimiento_balance_tanque_kmL - a.rendimiento_balance_tanque_kmL)
        .map(x => [x.folio, x.operador, x.rendimiento_balance_tanque_kmL, x.consumo_L_100km])));
  } else if (fn === "ahorros") {
    region("Mayores ahorros", tabla(["Folio", "Operador", "Ahorro (MXN)", "Presupuesto", "Costo"],
      [...s].sort((a, b) => b.ahorro_sobrecosto_MXN - a.ahorro_sobrecosto_MXN)
        .map(x => [x.folio, x.operador, x.ahorro_sobrecosto_MXN, x.presupuesto_MXN, x.costo_consumo_MXN])));
  } else if (fn === "consumos") {
    region("Mayores consumos", tabla(["Folio", "Operador", "Litros", "km/L"],
      [...s].sort((a, b) => b.consumo_total_L - a.consumo_total_L)
        .map(x => [x.folio, x.operador, x.consumo_total_L, x.rendimiento_balance_tanque_kmL])));
  } else if (fn === "sobrecostos") {
    region("Mayores sobrecostos", tabla(["Folio", "Operador", "Sobrecosto (MXN)", "Costo por km"],
      [...s].sort((a, b) => a.ahorro_sobrecosto_MXN - b.ahorro_sobrecosto_MXN)
        .map(x => [x.folio, x.operador, -x.ahorro_sobrecosto_MXN, x.costo_por_km_MXN])));
  } else if (fn === "tiempos") {
    region("Comparar tiempos", tabla(["Folio", "Duración (h)", "Movimiento (h)", "Ralentí (h)", "Paradas"],
      s.map(x => [x.folio, x.tiempo_total_h, x.tiempo_movimiento_h, x.tiempo_ralenti_h, x.n_paradas])));
  } else if (fn === "rutas") {
    region("Comparar rutas", '<p class="state-msg">Solo existe una ruta (RUT-0001, Ciudad de México → Monterrey). No hay otras rutas para comparar. No se fabrican rankings de rutas.</p>');
  } else if (fn === "vehiculos") {
    region("Comparar vehículos", '<p class="state-msg">Solo existe un vehículo (VEH-0001, Freightliner M2). No hay otros vehículos para comparar. No se fabrican rankings de vehículos.</p>');
  } else if (fn === "planeado") {
    region("Planeado vs. esperado vs. ejecutado", nota +
      tabla(["Folio", "Litros plan.", "Litros modelo", "Litros balance", "Costo plan.", "Costo ejec."],
        s.map(x => [x.folio, x.litros_presupuestados_L, x.consumo_motor_L, x.consumo_total_L, x.presupuesto_MXN, x.costo_consumo_MXN])));
  } else if (fn === "comportamiento") {
    region("Comportamiento de conducción", nota +
      tabla(["Folio", "Vel. media", "Vel. máx", "Acel. intensas", "Frenados intensos", "Paradas"],
        s.map(x => [x.folio, x.velocidad_promedio_kmh, x.velocidad_maxima_kmh, "-", "-", x.n_paradas])));
  } else if (fn === "ralenti") {
    region("Ralentí", G.g09Ralenti(s).getDom ? "" : "" +
      tabla(["Folio", "Ralentí (h)", "Litros ralentí", "Costo ralentí (MXN)"],
        s.map(x => [x.folio, x.tiempo_ralenti_h, x.consumo_ralenti_L, Math.round(x.consumo_ralenti_L * 28.3)])));
  } else if (fn === "evolucion") {
    region("Evolución histórica", '<div class="chart" id="CHART_CMP"></div>');
    setTimeout(() => {
      const chart = echarts.init(document.getElementById("CHART_CMP"));
      chart.setOption({ grid: { left: 50, right: 20, top: 30, bottom: 40 }, tooltip: { trigger: "axis" },
        xAxis: { type: "category", data: s.map(x => x.fecha) },
        yAxis: { type: "value" },
        series: [{ name: "Rendimiento", type: "line", data: s.map(x => x.rendimiento_balance_tanque_kmL) }] });
    }, 50);
  } else if (fn === "anomalias") {
    region("Anomalías y desviaciones", nota +
      tabla(["Folio", "Diferencia no explicada (L)", "Valor (MXN)"],
        s.map(x => [x.folio, x.diferencia_no_explicada_L, Math.round(x.diferencia_no_explicada_L * 28.3)])) +
      '<p class="ir-meta">La diferencia no explicada no se atribuye automáticamente a robo; requiere evidencia independiente.</p>');
  } else if (fn === "oportunidades") {
    region("Oportunidades de ahorro", nota +
      tabla(["Folio", "Ahorro potencial (MXN)", "Concepto"],
        s.map(x => [x.folio, x.ahorro_sobrecosto_MXN > 0 ? x.ahorro_sobrecosto_MXN : 0,
          x.ahorro_sobrecosto_MXN > 0 ? "Ahorro frente al presupuesto" : "Sin ahorro identificado"])) +
      '<p class="ir-meta">Los ahorros son simulados; no constituyen ahorro real comprobado.</p>');
  }
}

export function restaurar() {
  const sec = document.getElementById("R_COMPARISON_RESULTS");
  sec.hidden = true;
  document.getElementById("COMPARISON_BODY").innerHTML = "";
}
