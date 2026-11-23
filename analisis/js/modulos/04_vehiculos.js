// SESPATE — Módulo 04: Inteligencia Vehicular.

import { renderTabla } from "../tablas.js";
import { renderComparativos } from "../comparativos.js";
import { renderBarra, renderLineas } from "../charts.js";
import { setFiltroModulo, notificar } from "../state.js";
import { COLORES } from "../config.js";

function sum(arr, fn) { return arr.reduce((a, x) => a + (fn ? fn(x) : x), 0); }

function metricasVehiculo(v, ctx) {
  const { recorridos, cargas, mantenimientos } = ctx;
  const km = sum(recorridos.filter(r => r.vehiculoId === v.vehiculoId), r => r.km);
  const litros = sum(cargas.filter(r => r.vehiculoId === v.vehiculoId), r => r.litros);
  const costoComb = sum(cargas.filter(r => r.vehiculoId === v.vehiculoId), r => r.costo);
  const mant = sum(mantenimientos.filter(r => r.vehiculoId === v.vehiculoId), r => r.costo);
  const correctivos = mantenimientos.filter(r => r.vehiculoId === v.vehiculoId && r.tipo === "Correctivo").length;
  const rendimiento = litros ? km / litros : null;
  const diasFuera = correctivos * 2.5; // Estimación DEMO
  return {
    placa: v.placa, modelo: v.modelo, anio: v.anio,
    km: Math.round(km * 10) / 10, litros: Math.round(litros * 10) / 10,
    costoComb, mant: Math.round(mant * 100) / 100,
    rendimiento: rendimiento == null ? null : Math.round(rendimiento * 100) / 100,
    l100: litros && km ? Math.round((litros / km * 100) * 100) / 100 : null,
    costoKm: km ? Math.round(((costoComb + mant) / km) * 100) / 100 : null,
    disponibilidad: Math.max(0, 100 - correctivos * 1.5), diasFuera: Math.round(diasFuera * 10) / 10,
  };
}

function render(ctx, cont) {
  const c = ctx.catalogos;
  const vehiculos = c.vehiculos.filter(v => ctx.vehiculosPermitidos.has(v.vehiculoId));
  const metrics = vehiculos.map(v => ({ ...metricasVehiculo(v, ctx), vehiculoId: v.vehiculoId }));

  cont.innerHTML = `
    <div class="module-head"><h1>Inteligencia Vehicular</h1><p>Rendimiento y costos de las patrullas</p></div>
    <div class="region"><div class="region-title">Filtro del módulo</div><div class="region-body">
      <div class="filter-bar">
        <label>Vehículo<select id="m4-filtro-vehiculo"><option value="">Todos</option>
          ${vehiculos.map(v => `<option value="${v.vehiculoId}" ${ctx.filtrosModulo.vehiculoId === v.vehiculoId ? "selected" : ""}>${v.placa} — ${v.modelo}</option>`).join("")}
        </select></label>
      </div>
    </div></div>
    <div class="section-title">Perfil de patrullas</div>
    <div class="charts-grid">
      <div class="region"><div class="region-title">Kilometraje por vehículo</div><div class="region-body"><div class="chart" id="m4-c1"></div></div></div>
      <div class="region"><div class="region-title">Consumo por vehículo</div><div class="region-body"><div class="chart" id="m4-c2"></div></div></div>
      <div class="region"><div class="region-title">Rendimiento por vehículo</div><div class="region-body"><div class="chart" id="m4-c3"></div></div></div>
      <div class="region"><div class="region-title">Costos por vehículo</div><div class="region-body"><div class="chart" id="m4-c4"></div></div></div>
      <div class="region"><div class="region-title">Mantenimiento mensual</div><div class="region-body"><div class="chart" id="m4-c5"></div></div></div>
    </div>
    <div id="m4-tablas"></div>
    <div id="m4-comparativos"></div>
  `;

  cont.querySelector("#m4-filtro-vehiculo").addEventListener("change", (e) => {
    setFiltroModulo("04", "vehiculoId", e.target.value);
    notificar();
  });

  renderBarra(cont.querySelector("#m4-c1"), { titulo: "Kilometraje por vehículo", categorias: metrics.map(m => m.placa), series: [{ nombre: "km", datos: metrics.map(m => m.km), color: COLORES.primario }], unidad: "km" });
  renderBarra(cont.querySelector("#m4-c2"), { titulo: "Consumo por vehículo", categorias: metrics.map(m => m.placa), series: [{ nombre: "Litros", datos: metrics.map(m => m.litros), color: COLORES.alerta }], unidad: "L" });
  renderBarra(cont.querySelector("#m4-c3"), { titulo: "Rendimiento por vehículo", categorias: metrics.map(m => m.placa), series: [{ nombre: "km/L", datos: metrics.map(m => m.rendimiento), color: COLORES.exito }], unidad: "km/L" });
  renderBarra(cont.querySelector("#m4-c4"), {
    titulo: "Costos por vehículo", categorias: metrics.map(m => m.placa),
    series: [
      { nombre: "Combustible", datos: metrics.map(m => m.costoComb), color: COLORES.alerta },
      { nombre: "Mantenimiento", datos: metrics.map(m => m.mant), color: COLORES.primario },
    ], unidad: "MXN",
  });

  const mantMes = {};
  for (const m of ctx.mantenimientos) mantMes[m.mes] = (mantMes[m.mes] || 0) + m.costo;
  const mesesMant = Object.keys(mantMes).sort();
  renderLineas(cont.querySelector("#m4-c5"), { titulo: "Mantenimiento mensual", categorias: mesesMant, series: [{ nombre: "Costo", datos: mesesMant.map(m => mantMes[m]), color: COLORES.primario }], unidad: "MXN" });

  const t = cont.querySelector("#m4-tablas");
  t.innerHTML = "";
  renderTabla(t, {
    titulo: "Comparación de patrullas", columnas: [
      { titulo: "Vehículo", clave: "placa" }, { titulo: "Modelo", clave: "modelo" }, { titulo: "Año", clave: "anio" },
      { titulo: "Kilometraje", clave: "km", unidad: "km", num: true }, { titulo: "Litros", clave: "litros", unidad: "L", num: true },
      { titulo: "Rendimiento", clave: "rendimiento", unidad: "km/L", num: true }, { titulo: "L/100km", clave: "l100", unidad: "L/100km", num: true },
      { titulo: "Costo combustible", clave: "costoComb", unidad: "MXN", num: true }, { titulo: "Mantenimiento", clave: "mant", unidad: "MXN", num: true },
      { titulo: "Disponibilidad", clave: "disponibilidad", unidad: "%", num: true }, { titulo: "Costo/km", clave: "costoKm", unidad: "MXN/km", num: true },
    ], filas: metrics, meta: "Disponibilidad estimada a partir de mantenimientos correctivos (Estimación DEMO).",
  });

  renderTabla(t, {
    titulo: "Historial de mantenimientos", columnas: [
      { titulo: "Vehículo", clave: "vehiculo" }, { titulo: "Fecha", clave: "fecha" }, { titulo: "Tipo", clave: "tipo" }, { titulo: "Costo", clave: "costo", unidad: "MXN", num: true },
    ], filas: ctx.mantenimientos.map(m => ({ vehiculo: (c.vehiculos.find(v => v.vehiculoId === m.vehiculoId) || {}).placa || m.vehiculoId, fecha: m.fecha, tipo: m.tipo, costo: m.costo })).sort((a, b) => b.fecha.localeCompare(a.fecha)),
  });

  renderTabla(t, {
    titulo: "Historial de recorridos", columnas: [
      { titulo: "Vehículo", clave: "vehiculo" }, { titulo: "Fecha", clave: "fecha" }, { titulo: "Ruta", clave: "ruta" }, { titulo: "km", clave: "km", unidad: "km", num: true },
    ], filas: ctx.recorridos.map(r => ({ vehiculo: (c.vehiculos.find(v => v.vehiculoId === r.vehiculoId) || {}).placa || r.vehiculoId, fecha: r.fecha, ruta: (c.rutas.find(x => x.rutaId === r.rutaId) || {}).nombre || r.rutaId, km: r.km })).sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 300),
    meta: "Últimos 300 recorridos del periodo filtrado.",
  });

  const periodo = `${ctx.filtros.fechaInicial || "2024-12-01"} a ${ctx.filtros.fechaFinal || "2026-11-22"}`;
  const comparativos = [
    { id: "CMP-001", nombre: "Consume más combustible", kpi: "KPI-011", unidad: "L", claveValor: "litros", datos: metrics.map(m => ({ nombre: m.placa, litros: m.litros })).sort((a, b) => b.litros - a.litros) },
    { id: "CMP-002", nombre: "Peor rendimiento", kpi: "KPI-003", unidad: "km/L", claveValor: "rendimiento", datos: metrics.map(m => ({ nombre: m.placa, rendimiento: m.rendimiento })).filter(x => x.rendimiento != null).sort((a, b) => a.rendimiento - b.rendimiento) },
    { id: "CMP-003", nombre: "Mayor costo por km", kpi: "KPI-008", unidad: "MXN/km", claveValor: "costoKm", datos: metrics.map(m => ({ nombre: m.placa, costoKm: m.costoKm })).filter(x => x.costoKm != null).sort((a, b) => b.costoKm - a.costoKm) },
    { id: "CMP-004", nombre: "Más mantenimiento", kpi: "KPI-017", unidad: "MXN", claveValor: "mant", datos: metrics.map(m => ({ nombre: m.placa, mant: m.mant })).sort((a, b) => b.mant - a.mant) },
    { id: "CMP-005", nombre: "Más días fuera de servicio", kpi: "KPI-021", unidad: "días", claveValor: "diasFuera", esEstimacion: true, datos: metrics.map(m => ({ nombre: m.placa, diasFuera: m.diasFuera })).sort((a, b) => b.diasFuera - a.diasFuera) },
  ];
  renderComparativos(cont.querySelector("#m4-comparativos"), { comparativos, periodo });
}

export default { id: "04", render };
