// SESPATE — Módulo 01: Resumen Ejecutivo.

import { renderKpiGrid } from "../kpi.js";
import { renderTabla } from "../tablas.js";
import { renderComparativos } from "../comparativos.js";
import { renderLineas, renderBarra } from "../charts.js";
import { COLORES } from "../config.js";

const FACTOR_LABORAL = 1.35 * 1.25; // prestaciones + patronal
const SALARIO = 45;

function sum(arr, fn) { return arr.reduce((a, x) => a + (fn ? fn(x) : x), 0); }

function mesesPeriodo(f) {
  if (f.mes) return 1;
  let ini = f.fechaInicial ? new Date(f.fechaInicial + "T00:00:00") : new Date("2024-12-01T00:00:00");
  let fin = f.fechaFinal ? new Date(f.fechaFinal + "T00:00:00") : new Date("2026-11-22T00:00:00");
  const n = (fin.getFullYear() - ini.getFullYear()) * 12 + (fin.getMonth() - ini.getMonth()) + 1;
  return Math.max(1, n);
}

function agrupar(arr, clave, fn) {
  const m = {};
  for (const x of arr) {
    const k = clave(x);
    m[k] = (m[k] || 0) + fn(x);
  }
  return m;
}

function clavesOrdenadas(obj) { return Object.keys(obj).sort(); }

function render(ctx, cont) {
  const { servicios, recorridos, cargas, mantenimientos, incidentes, turnos, financiero, costos } = ctx;
  const c = ctx.catalogos;

  const km = sum(recorridos, r => r.km);
  const litros = sum(cargas, r => r.litros);
  const costoCombustible = sum(cargas, r => r.costo);
  const costoMantenimiento = sum(mantenimientos, r => r.costo);
  const horasOrd = sum(turnos, r => r.horas);
  const horasExtra = sum(turnos, r => r.horasExtra);

  const laborIntegral = (horasOrd * SALARIO + horasExtra * SALARIO * 2) * FACTOR_LABORAL;
  const factorPeriodo = mesesPeriodo(ctx.filtros) / 24;
  const costoEstimado = costos.costo_estimado_fijo * factorPeriodo;
  const costoDirecto = laborIntegral + costoCombustible + costoMantenimiento;
  const costoIndirecto = (costoDirecto + costoEstimado) * 0.15;
  const costoOperativo = costoDirecto + costoEstimado + costoIndirecto;

  const ingresos = sum(financiero.filter(x => x.tipo === "INGRESO"), x => x.monto);
  const utilidad = ingresos - costoOperativo;
  const margen = ingresos ? (utilidad / ingresos) * 100 : null;

  const clientesActivos = c.clientes.filter(x => ctx.clientesPermitidos.has(x.clienteId) && x.activo).length;
  const instalaciones = ctx.instalacionesPermitidas.size;
  const completados = servicios.filter(s => s.estado === "COMPLETADO").length;
  const cumplimiento = servicios.length ? (completados / servicios.length) * 100 : null;

  cont.innerHTML = `
    <div class="module-head">
      <h1>Resumen Ejecutivo</h1>
      <p>Indicadores globales de la operación</p>
    </div>
    <div id="m1-kpis"></div>
    <div class="section-title">Gráficas</div>
    <div class="charts-grid">
      <div class="region"><div class="region-title">Ingresos y costos por mes</div><div class="region-body"><div class="chart" id="m1-chart1"></div></div></div>
      <div class="region"><div class="region-title">Margen operativo por mes</div><div class="region-body"><div class="chart" id="m1-chart2"></div></div></div>
      <div class="region"><div class="region-title">Servicios realizados por mes</div><div class="region-body"><div class="chart" id="m1-chart3"></div></div></div>
      <div class="region"><div class="region-title">Consumo de combustible por mes</div><div class="region-body"><div class="chart" id="m1-chart4"></div></div></div>
      <div class="region"><div class="region-title">Incidentes por mes</div><div class="region-body"><div class="chart" id="m1-chart5"></div></div></div>
    </div>
    <div id="m1-tablas"></div>
    <div id="m1-comparativos"></div>
  `;

  renderKpiGrid(cont.querySelector("#m1-kpis"), [
    { etiqueta: "Clientes activos", valor: clientesActivos, unidad: "clientes" },
    { etiqueta: "Instalaciones atendidas", valor: instalaciones, unidad: "#" },
    { etiqueta: "Servicios realizados", valor: servicios.length, unidad: "servicios" },
    { etiqueta: "Recorridos", valor: recorridos.length, unidad: "#" },
    { etiqueta: "Kilómetros recorridos", valor: km, unidad: "km" },
    { etiqueta: "Litros consumidos", valor: litros, unidad: "L" },
    { etiqueta: "Costo combustible", valor: costoCombustible, unidad: "MXN" },
    { etiqueta: "Costo operativo", valor: costoOperativo, unidad: "MXN", nota: "Estimación DEMO" },
    { etiqueta: "Ingresos", valor: ingresos, unidad: "MXN" },
    { etiqueta: "Utilidad operativa", valor: utilidad, unidad: "MXN" },
    { etiqueta: "Margen operativo", valor: margen, unidad: "%" },
    { etiqueta: "Incidentes", valor: incidentes.length, unidad: "#" },
    { etiqueta: "Cumplimiento operativo", valor: cumplimiento, unidad: "%" },
  ]);

  // Series mensuales
  const ingresosMes = agrupar(financiero.filter(x => x.tipo === "INGRESO"), x => x.mes, x => x.monto);
  const laborMes = {};
  for (const t of turnos) laborMes[t.mes] = (laborMes[t.mes] || 0) + (t.horas * SALARIO + t.horasExtra * SALARIO * 2) * FACTOR_LABORAL;
  const combMes = agrupar(cargas, x => x.mes, x => x.costo);
  const mantMes = agrupar(mantenimientos, x => x.mes, x => x.costo);
  const servMes = agrupar(servicios, x => x.mes, () => 1);
  const incMes = agrupar(incidentes, x => x.mes, () => 1);
  const litrosMes = agrupar(cargas, x => x.mes, x => x.litros);

  const todosMeses = new Set([...Object.keys(ingresosMes), ...Object.keys(laborMes), ...Object.keys(servMes)]);
  const meses = clavesOrdenadas({ ...Object.fromEntries([...todosMeses].map(m => [m, 1])) });
  const estimadoMes = costos.costo_estimado_fijo / 24;

  const costosMes = meses.map(m => {
    const d = (laborMes[m] || 0) + (combMes[m] || 0) + (mantMes[m] || 0);
    return d + estimadoMes + (d + estimadoMes) * 0.15;
  });
  const ingresosSerie = meses.map(m => ingresosMes[m] || 0);
  const margenSerie = meses.map((m, i) => ingresosSerie[i] ? ((ingresosSerie[i] - costosMes[i]) / ingresosSerie[i]) * 100 : null);

  renderLineas(cont.querySelector("#m1-chart1"), {
    titulo: "Ingresos y costos por mes", categorias: meses,
    series: [
      { nombre: "Ingresos", datos: ingresosSerie, color: COLORES.exito },
      { nombre: "Costos", datos: costosMes, color: COLORES.error },
    ], unidad: "MXN",
  });
  renderLineas(cont.querySelector("#m1-chart2"), {
    titulo: "Margen operativo por mes", categorias: meses,
    series: [{ nombre: "Margen", datos: margenSerie, color: COLORES.primario }], unidad: "%",
  });
  renderBarra(cont.querySelector("#m1-chart3"), {
    titulo: "Servicios realizados por mes", categorias: meses,
    series: [{ nombre: "Servicios", datos: meses.map(m => servMes[m] || 0), color: COLORES.primario }], unidad: "#",
  });
  renderBarra(cont.querySelector("#m1-chart4"), {
    titulo: "Consumo de combustible por mes", categorias: meses,
    series: [{ nombre: "Litros", datos: meses.map(m => litrosMes[m] || 0), color: COLORES.alerta }], unidad: "L",
  });
  renderBarra(cont.querySelector("#m1-chart5"), {
    titulo: "Incidentes por mes", categorias: meses,
    series: [{ nombre: "Incidentes", datos: meses.map(m => incMes[m] || 0), color: COLORES.error }], unidad: "#",
  });

  // Tablas
  const t = cont.querySelector("#m1-tablas");
  t.innerHTML = "";
  const resumenMensual = meses.map(m => ({
    mes: m, ingresos: ingresosMes[m] || 0, costos: Math.round(costosMes[meses.indexOf(m)]),
    servicios: servMes[m] || 0, litros: Math.round(litrosMes[m] || 0), incidentes: incMes[m] || 0,
  })).reverse();
  renderTabla(t, {
    titulo: "Resumen mensual", columnas: [
      { titulo: "Mes", clave: "mes" },
      { titulo: "Ingresos", clave: "ingresos", unidad: "MXN", num: true },
      { titulo: "Costos", clave: "costos", unidad: "MXN", num: true },
      { titulo: "Servicios", clave: "servicios", unidad: "#", num: true },
      { titulo: "Litros", clave: "litros", unidad: "L", num: true },
      { titulo: "Incidentes", clave: "incidentes", unidad: "#", num: true },
    ], filas: resumenMensual, meta: "Costos por mes según modelo calibrado (Estimación DEMO).",
  });

  const clientesPrincipales = c.clientes
    .filter(x => ctx.clientesPermitidos.has(x.clienteId))
    .map(x => ({ nombre: x.nombre, ingresos: sum(financiero.filter(f => f.clienteId === x.clienteId && f.tipo === "INGRESO"), f => f.monto) }))
    .sort((a, b) => b.ingresos - a.ingresos)
    .slice(0, 10);
  renderTabla(t, {
    titulo: "Clientes principales", columnas: [
      { titulo: "Cliente", clave: "nombre" }, { titulo: "Ingresos", clave: "ingresos", unidad: "MXN", num: true },
    ], filas: clientesPrincipales,
  });

  const vehiculosCosto = c.vehiculos
    .filter(v => ctx.vehiculosPermitidos.has(v.vehiculoId))
    .map(v => ({
      vehiculo: v.placa,
      combustible: sum(cargas.filter(x => x.vehiculoId === v.vehiculoId), x => x.costo),
      mantenimiento: sum(mantenimientos.filter(x => x.vehiculoId === v.vehiculoId), x => x.costo),
    }))
    .map(v => ({ vehiculo: v.vehiculo, costo: v.combustible + v.mantenimiento, combustible: v.combustible, mantenimiento: v.mantenimiento }))
    .sort((a, b) => b.costo - a.costo);
  renderTabla(t, {
    titulo: "Vehículos con mayor costo", columnas: [
      { titulo: "Vehículo", clave: "vehiculo" }, { titulo: "Combustible", clave: "combustible", unidad: "MXN", num: true },
      { titulo: "Mantenimiento", clave: "mantenimiento", unidad: "MXN", num: true }, { titulo: "Costo total", clave: "costo", unidad: "MXN", num: true },
    ], filas: vehiculosCosto,
  });

  const rutasActividad = c.rutas
    .filter(r => ctx.rutasPermitidas.has(r.rutaId))
    .map(r => ({ ruta: r.nombre, servicios: servicios.filter(s => s.rutaId === r.rutaId).length, km: Math.round(sum(recorridos.filter(x => x.rutaId === r.rutaId), x => x.km)) }))
    .sort((a, b) => b.servicios - a.servicios);
  renderTabla(t, {
    titulo: "Rutas con mayor actividad", columnas: [
      { titulo: "Ruta", clave: "ruta" }, { titulo: "Servicios", clave: "servicios", unidad: "#", num: true }, { titulo: "Kilómetros", clave: "km", unidad: "km", num: true },
    ], filas: rutasActividad,
  });

  // Comparativos
  const periodo = `${ctx.filtros.fechaInicial || "2024-12-01"} a ${ctx.filtros.fechaFinal || "2026-11-22"}`;
  const comparativos = [
    { id: "CMP-016", nombre: "Cliente con más ingresos", kpi: "KPI-049", unidad: "MXN", claveValor: "ingresos",
      datos: clientesPrincipales.map(x => ({ nombre: x.nombre, ingresos: x.ingresos })) },
    { id: "CMP-017", nombre: "Cliente más rentable", kpi: "KPI-051", unidad: "MXN", claveValor: "rentabilidad", esEstimacion: true,
      datos: clientesPrincipales.map(x => ({ nombre: x.nombre, rentabilidad: Math.round(x.ingresos * 0.43) })) },
    { id: "CMP-020", nombre: "Mes con mayor margen", kpi: "KPI-054", unidad: "%", claveValor: "margen",
      datos: resumenMensual.filter(r => r.ingresos > 0).map(r => ({ nombre: r.mes, margen: Math.round(((r.ingresos - r.costos) / r.ingresos) * 10000) / 100 })) },
  ];
  renderComparativos(cont.querySelector("#m1-comparativos"), { comparativos, periodo });
}

export default { id: "01", render };
