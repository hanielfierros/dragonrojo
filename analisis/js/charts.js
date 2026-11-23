// SESPATE — Envoltura de ECharts con gestión de instancias y estados.

const instancias = new Map();
let secuencia = 0;

function obtenerEcharts() {
  return window.echarts;
}

function inicializarChart(contenedor) {
  const echarts = obtenerEcharts();
  if (!echarts) return null;
  const inst = echarts.init(contenedor);
  const id = `chart-${++secuencia}`;
  instancias.set(id, inst);
  return { id, inst };
}

function opcionBase(titulo) {
  return {
    backgroundColor: "transparent",
    textStyle: { fontFamily: "Aptos, Segoe UI, sans-serif" },
    title: titulo ? { text: titulo, left: 0, textStyle: { fontSize: 13, fontWeight: 600 } } : undefined,
    grid: { left: 48, right: 20, top: titulo ? 40 : 24, bottom: 40, containLabel: false },
    tooltip: { trigger: "axis" },
  };
}

function temaActual() {
  return document.documentElement.dataset.theme || "light";
}

function colores(theme) {
  const oscuro = (theme || temaActual()) === "dark";
  return {
    grid: oscuro ? "#414141" : "#D9D9D9",
    text: oscuro ? "#9E9E9E" : "#707070",
  };
}

function pintarVacio(inst, contenedor) {
  if (!inst) return;
  inst.clear();
  inst.setOption({
    title: { text: "Sin datos para los filtros seleccionados", left: "center", top: "middle",
             textStyle: { fontSize: 13, color: "#707070", fontWeight: 400 } },
    xAxis: { show: false }, yAxis: { show: false }, series: [],
  });
}

function renderBarra(contenedor, { titulo, categorias, series, unidad, horizontal = false, theme = null }) {
  const echarts = obtenerEcharts();
  const { inst } = inicializarChart(contenedor);
  if (!inst) return;
  const c = colores(theme);
  const opt = opcionBase(titulo);
  const eje = horizontal ? "yAxis" : "xAxis";
  const otro = horizontal ? "xAxis" : "yAxis";
  opt[eje] = {
    type: "category", data: categorias,
    axisLabel: { color: c.text, fontSize: 11 },
    axisLine: { lineStyle: { color: c.grid } },
  };
  opt[otro] = {
    type: "value",
    axisLabel: { color: c.text, fontSize: 11, formatter: (v) => (unidad === "MXN" ? `$${(v/1000).toFixed(0)}k` : v) },
    splitLine: { lineStyle: { color: c.grid } },
  };
  opt.series = series.map(s => ({
    name: s.nombre, type: "bar", data: s.datos,
    itemStyle: { color: s.color },
    barMaxWidth: 34,
  }));
  opt.legend = series.length > 1 ? { top: 0, textStyle: { color: c.text } } : undefined;
  inst.setOption(opt, true);
}

function renderLineas(contenedor, { titulo, categorias, series, unidad, theme = null }) {
  const echarts = obtenerEcharts();
  const { inst } = inicializarChart(contenedor);
  if (!inst) return;
  const c = colores(theme);
  const opt = opcionBase(titulo);
  opt.xAxis = { type: "category", data: categorias, axisLabel: { color: c.text, fontSize: 11, rotate: 40 }, axisLine: { lineStyle: { color: c.grid } } };
  opt.yAxis = { type: "value", axisLabel: { color: c.text, fontSize: 11, formatter: (v) => (unidad === "MXN" ? `$${(v/1000).toFixed(0)}k` : v) }, splitLine: { lineStyle: { color: c.grid } } };
  opt.series = series.map(s => ({
    name: s.nombre, type: "line", data: s.datos, smooth: true,
    itemStyle: { color: s.color }, lineStyle: { width: 2 }, symbol: "circle",
  }));
  opt.legend = { top: 0, textStyle: { color: c.text } };
  inst.setOption(opt, true);
}

function renderPie(contenedor, { titulo, datos, theme = null }) {
  const echarts = obtenerEcharts();
  const { inst } = inicializarChart(contenedor);
  if (!inst) return;
  const c = colores(theme);
  inst.setOption({
    backgroundColor: "transparent",
    title: titulo ? { text: titulo, left: 0, textStyle: { fontSize: 13, fontWeight: 600 } } : undefined,
    tooltip: { trigger: "item" },
    legend: { bottom: 0, textStyle: { color: c.text, fontSize: 11 } },
    series: [{
      type: "pie", radius: ["40%", "68%"], center: ["50%", "48%"],
      data: datos, label: { color: c.text, fontSize: 11 },
    }],
  }, true);
}

function destruirTodo() {
  for (const [, inst] of instancias) {
    try { inst.dispose(); } catch (e) { /* ignore */ }
  }
  instancias.clear();
}

function redimensionarTodo() {
  for (const [, inst] of instancias) {
    try { inst.resize(); } catch (e) { /* ignore */ }
  }
}

export { inicializarChart, renderBarra, renderLineas, renderPie, pintarVacio, destruirTodo, redimensionarTodo, obtenerEcharts };
