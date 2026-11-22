/* ============================================================
   SECURITYTRANS — Gráficas (Apache ECharts)
   Todas las gráficas usan datos reales/validados y respetan el tema.
   ============================================================ */

const instancias = new Map();

function colores() {
  const oscuro = document.documentElement.getAttribute("data-theme") === "dark";
  return {
    grid: oscuro ? "#414141" : "#D9D9D9",
    text: oscuro ? "#9E9E9E" : "#707070",
    principal: oscuro ? "#7FA3C9" : "#24476A",
    gris: ["#414141", "#707070", "#BDBDBD", "#9E9E9E", "#6E6E6E", "#8A8A8A"],
  };
}

function base(id) {
  const el = document.getElementById(id);
  if (!el) return null;
  if (instancias.has(id)) { instancias.get(id).dispose(); }
  const chart = echarts.init(el);
  instancias.set(id, chart);
  return chart;
}

function ejes(chart, c, xLabel, yLabel) {
  return {
    grid: { left: 50, right: 20, top: 30, bottom: 40 },
    color: c.gris,
    tooltip: { trigger: "axis" },
    legend: { top: 0, textStyle: { color: c.text } },
    xAxis: {
      type: "category", axisLine: { lineStyle: { color: c.grid } },
      axisLabel: { color: c.text, rotate: xLabel && xLabel.length > 12 ? 30 : 0 },
    },
    yAxis: { type: "value", name: yLabel, nameTextStyle: { color: c.text }, axisLabel: { color: c.text }, splitLine: { lineStyle: { color: c.grid } } },
  };
}

/* G01 — Evolución histórica del rendimiento */
export function g01Rendimiento(servicios, adminRef, ponderado) {
  const c = colores();
  const chart = base("CHART_MAIN");
  const opt = ejes(chart, c, "folio", "km/L");
  opt.series = [
    { name: "Rendimiento (balance)", type: "line", data: servicios.map(s => s.rendimiento_balance_tanque_kmL), smooth: true, lineStyle: { width: 2 } },
    { name: "Rendimiento (motor)", type: "line", data: servicios.map(s => s.rendimiento_motor_kmL), lineStyle: { type: "dashed" } },
    { name: "Referencia 3.6", type: "line", data: servicios.map(() => adminRef), lineStyle: { type: "dotted" }, itemStyle: { opacity: 0.6 } },
  ];
  opt.xAxis.data = servicios.map(s => s.folio.slice(-5));
  opt.tooltip = { trigger: "axis" };
  chart.setOption(opt);
  return chart;
}

/* G02 — Combustible por servicio (barras agrupadas) */
export function g02Combustible(servicios) {
  const c = colores();
  const chart = base("CHART_MAIN");
  const opt = ejes(chart, c, "folio", "L");
  opt.legend = { top: 0, textStyle: { color: c.text } };
  opt.xAxis.data = servicios.map(s => s.folio.slice(-5));
  opt.series = [
    { name: "Litros presupuestados", type: "bar", data: servicios.map(s => s.litros_presupuestados_L) },
    { name: "Litros motor (modelo)", type: "bar", data: servicios.map(s => s.consumo_motor_L) },
    { name: "Salida según balance", type: "bar", data: servicios.map(s => s.consumo_total_L) },
    { name: "Litros abastecidos", type: "bar", data: servicios.map(s => s.litros_cargados_L) },
  ];
  chart.setOption(opt);
  return chart;
}

/* G03 — Presupuesto frente a costo */
export function g03Presupuesto(servicios) {
  const c = colores();
  const chart = base("CHART_MAIN");
  const opt = ejes(chart, c, "folio", "MXN");
  opt.xAxis.data = servicios.map(s => s.folio.slice(-5));
  opt.series = [
    { name: "Presupuesto", type: "bar", data: servicios.map(s => s.presupuesto_MXN) },
    { name: "Costo consumo", type: "bar", data: servicios.map(s => s.costo_consumo_MXN) },
  ];
  chart.setOption(opt);
  return chart;
}

/* G06 — Rendimiento por operador (barras horizontales) */
export function g06Operadores(servicios) {
  const c = colores();
  const chart = base("CHART_MAIN");
  const orden = [...servicios].sort((a, b) => b.rendimiento_balance_tanque_kmL - a.rendimiento_balance_tanque_kmL);
  chart.setOption({
    grid: { left: 140, right: 30, top: 20, bottom: 30 },
    tooltip: { trigger: "axis" },
    xAxis: { type: "value", name: "km/L", axisLabel: { color: c.text }, splitLine: { lineStyle: { color: c.grid } } },
    yAxis: { type: "category", data: orden.map(s => s.operador.split(" ").slice(0, 2).join(" ")), axisLabel: { color: c.text } },
    series: [{ name: "Rendimiento", type: "bar", data: orden.map(s => s.rendimiento_balance_tanque_kmL), color: c.gris }],
  });
  return chart;
}

/* G07 — Ahorros y sobrecostos (barras divergentes) */
export function g07Ahorros(servicios) {
  const c = colores();
  const chart = base("CHART_MAIN");
  chart.setOption({
    grid: { left: 60, right: 30, top: 30, bottom: 50 },
    tooltip: { trigger: "axis" },
    xAxis: { type: "category", data: servicios.map(s => s.folio.slice(-5)), axisLabel: { color: c.text, rotate: 30 }, axisLine: { lineStyle: { color: c.grid } } },
    yAxis: { type: "value", name: "MXN", axisLabel: { color: c.text }, splitLine: { lineStyle: { color: c.grid } } },
    series: [{ name: "Ahorro/Sobrecosto", type: "bar", data: servicios.map(s => s.ahorro_sobrecosto_MXN),
      itemStyle: { color: (p) => p.value >= 0 ? "#6BB5A8" : "#E08A8A" } }],
  });
  return chart;
}

/* G08 — Tiempo de operación (barras apiladas) */
export function g08Tiempo(servicios) {
  const c = colores();
  const chart = base("CHART_MAIN");
  const opt = ejes(chart, c, "folio", "h");
  opt.xAxis.data = servicios.map(s => s.folio.slice(-5));
  opt.series = [
    { name: "En movimiento", type: "bar", stack: "t", data: servicios.map(s => s.tiempo_movimiento_h) },
    { name: "Detenido", type: "bar", stack: "t", data: servicios.map(s => s.tiempo_total_h - s.tiempo_movimiento_h) },
  ];
  chart.setOption(opt);
  return chart;
}

/* G09 — Consumo asociado al ralentí */
export function g09Ralenti(servicios) {
  const c = colores();
  const chart = base("CHART_MAIN");
  chart.setOption({
    grid: { left: 50, right: 40, top: 20, bottom: 50 },
    tooltip: { trigger: "axis" },
    xAxis: { type: "category", data: servicios.map(s => s.folio.slice(-5)), axisLabel: { color: c.text, rotate: 30 }, axisLine: { lineStyle: { color: c.grid } } },
    yAxis: { type: "value", name: "h", axisLabel: { color: c.text }, splitLine: { lineStyle: { color: c.grid } } },
    series: [{ name: "Ralentí (h)", type: "bar", data: servicios.map(s => s.tiempo_ralenti_h), color: c.gris }],
  });
  return chart;
}

/* G12 — Velocidad vs consumo (dispersión) */
export function g12VelocidadConsumo(servicios) {
  const c = colores();
  const chart = base("CHART_MAIN");
  chart.setOption({
    grid: { left: 50, right: 20, top: 30, bottom: 40 },
    tooltip: { trigger: "item" },
    xAxis: { type: "value", name: "km/h", axisLabel: { color: c.text }, splitLine: { lineStyle: { color: c.grid } } },
    yAxis: { type: "value", name: "L/100km", axisLabel: { color: c.text }, splitLine: { lineStyle: { color: c.grid } } },
    series: [{ name: "Servicio", type: "scatter", data: servicios.map(s => [s.velocidad_promedio_kmh, s.consumo_L_100km]),
      symbolSize: 14, color: c.principal }],
  });
  return chart;
}

/* G05 — Costo por km */
export function g05CostoKm(servicios) {
  const c = colores();
  const chart = base("CHART_MAIN");
  const opt = ejes(chart, c, "folio", "MXN/km");
  opt.xAxis.data = servicios.map(s => s.folio.slice(-5));
  opt.series = [
    { name: "Costo por km", type: "line", data: servicios.map(s => s.costo_por_km_MXN), smooth: true },
  ];
  chart.setOption(opt);
  return chart;
}

/* G04 — Kilometraje acumulado */
export function g04Kilometraje(historial) {
  const c = colores();
  const chart = base("CHART_MAIN");
  const svcs = historial.servicios;
  chart.setOption({
    grid: { left: 70, right: 20, top: 30, bottom: 40 },
    tooltip: { trigger: "axis" },
    xAxis: { type: "category", data: svcs.map(s => s.fecha), axisLabel: { color: c.text }, axisLine: { lineStyle: { color: c.grid } } },
    yAxis: { type: "value", name: "km", axisLabel: { color: c.text }, splitLine: { lineStyle: { color: c.grid } } },
    series: [{ name: "Odómetro final", type: "line", data: svcs.map(s => s.odo_final_km), step: "end", color: c.principal }],
  });
  return chart;
}

/* G13 — Ralentí vs costo */
export function g13RalentiCosto(servicios) {
  const c = colores();
  const chart = base("CHART_MAIN");
  chart.setOption({
    grid: { left: 50, right: 20, top: 30, bottom: 40 },
    tooltip: { trigger: "item" },
    xAxis: { type: "value", name: "h ralentí", axisLabel: { color: c.text }, splitLine: { lineStyle: { color: c.grid } } },
    yAxis: { type: "value", name: "MXN", axisLabel: { color: c.text }, splitLine: { lineStyle: { color: c.grid } } },
    series: [{ name: "Servicio", type: "scatter", data: servicios.map(s => [s.tiempo_ralenti_h, s.consumo_ralenti_L * 28.3]), symbolSize: 14, color: c.principal }],
  });
  return chart;
}

export function actualizarTema() {
  // Re-renderiza las gráficas activas tras cambio de tema
  window.dispatchEvent(new CustomEvent("securitytrans:redraw"));
}

export function disposeAll() {
  instancias.forEach((ch) => ch.dispose());
  instancias.clear();
}
