// SESPATE — Módulo 05: Combustible.

import { renderKpiGrid } from "../kpi.js";
import { renderTabla } from "../tablas.js";
import { renderBarra, renderLineas } from "../charts.js";
import { setFiltroModulo, notificar } from "../state.js";
import { COLORES } from "../config.js";

function sum(arr, fn) { return arr.reduce((a, x) => a + (fn ? fn(x) : x), 0); }

function render(ctx, cont) {
  const c = ctx.catalogos;
  const { cargas, recorridos } = ctx;
  const vehiculos = c.vehiculos.filter(v => ctx.vehiculosPermitidos.has(v.vehiculoId));
  const tipos = [...new Set(cargas.map(x => x.tipo))].sort();

  const litros = sum(cargas, x => x.litros);
  const costoTotal = sum(cargas, x => x.costo);
  const precioProm = litros ? costoTotal / litros : null;
  const km = sum(recorridos, r => r.km);
  const rendimiento = litros ? km / litros : null;
  const l100 = km ? (litros / km) * 100 : null;
  const costoKm = km ? costoTotal / km : null;

  cont.innerHTML = `
    <div class="module-head"><h1>Combustible</h1><p>Consumo, costo y rendimiento de combustible</p></div>
    <div class="region"><div class="region-title">Filtros del módulo</div><div class="region-body">
      <div class="filter-bar">
        <label>Vehículo<select id="m5-f-vehiculo"><option value="">Todos</option>
          ${vehiculos.map(v => `<option value="${v.vehiculoId}" ${ctx.filtrosModulo.vehiculoId === v.vehiculoId ? "selected" : ""}>${v.placa}</option>`).join("")}
        </select></label>
        <label>Tipo de combustible<select id="m5-f-tipo"><option value="">Todos</option>
          ${tipos.map(t => `<option value="${t}" ${ctx.filtrosModulo.tipoCombustible === t ? "selected" : ""}>${t}</option>`).join("")}
        </select></label>
        <span class="muted">La asignación por ruta no está disponible (sin mapeo directo en los datos).</span>
      </div>
    </div></div>
    <div id="m5-kpis"></div>
    <div class="charts-grid">
      <div class="region"><div class="region-title">Litros por mes</div><div class="region-body"><div class="chart" id="m5-c1"></div></div></div>
      <div class="region"><div class="region-title">Costo de combustible por mes</div><div class="region-body"><div class="chart" id="m5-c2"></div></div></div>
      <div class="region"><div class="region-title">Precio por litro por mes</div><div class="region-body"><div class="chart" id="m5-c3"></div></div></div>
      <div class="region"><div class="region-title">Rendimiento mensual</div><div class="region-body"><div class="chart" id="m5-c4"></div></div></div>
      <div class="region"><div class="region-title">Comparación de vehículos</div><div class="region-body"><div class="chart" id="m5-c5"></div></div></div>
    </div>
    <div id="m5-tablas"></div>
  `;

  cont.querySelector("#m5-f-vehiculo").addEventListener("change", (e) => { setFiltroModulo("05", "vehiculoId", e.target.value); notificar(); });
  cont.querySelector("#m5-f-tipo").addEventListener("change", (e) => { setFiltroModulo("05", "tipoCombustible", e.target.value); notificar(); });

  renderKpiGrid(cont.querySelector("#m5-kpis"), [
    { etiqueta: "Litros totales", valor: litros, unidad: "L" },
    { etiqueta: "Costo total", valor: costoTotal, unidad: "MXN" },
    { etiqueta: "Precio promedio", valor: precioProm, unidad: "MXN/L" },
    { etiqueta: "Rendimiento agregado", valor: rendimiento, unidad: "km/L" },
    { etiqueta: "Consumo L/100km", valor: l100, unidad: "L/100km" },
    { etiqueta: "MXN/km combustible", valor: costoKm, unidad: "MXN/km" },
    { etiqueta: "Cargas registradas", valor: cargas.length, unidad: "#" },
  ]);

  const litrosMes = {}; const costoMes = {}; const precioMes = {}; const kmMes = {};
  for (const x of cargas) { litrosMes[x.mes] = (litrosMes[x.mes] || 0) + x.litros; costoMes[x.mes] = (costoMes[x.mes] || 0) + x.costo; }
  for (const x of recorridos) kmMes[x.mes] = (kmMes[x.mes] || 0) + x.km;
  const meses = [...new Set([...Object.keys(litrosMes), ...Object.keys(kmMes)])].sort();
  for (const m of meses) precioMes[m] = litrosMes[m] ? costoMes[m] / litrosMes[m] : null;

  renderBarra(cont.querySelector("#m5-c1"), { titulo: "Litros por mes", categorias: meses, series: [{ nombre: "Litros", datos: meses.map(m => litrosMes[m] || 0), color: COLORES.alerta }], unidad: "L" });
  renderBarra(cont.querySelector("#m5-c2"), { titulo: "Costo de combustible por mes", categorias: meses, series: [{ nombre: "Costo", datos: meses.map(m => costoMes[m] || 0), color: COLORES.primario }], unidad: "MXN" });
  renderLineas(cont.querySelector("#m5-c3"), { titulo: "Precio por litro por mes", categorias: meses, series: [{ nombre: "Precio", datos: meses.map(m => precioMes[m] || null), color: COLORES.exito }], unidad: "MXN/L" });
  renderLineas(cont.querySelector("#m5-c4"), { titulo: "Rendimiento mensual", categorias: meses, series: [{ nombre: "km/L", datos: meses.map(m => (kmMes[m] && litrosMes[m]) ? kmMes[m] / litrosMes[m] : null), color: COLORES.info }], unidad: "km/L" });

  const consumoVehiculo = vehiculos.map(v => ({
    placa: v.placa,
    litros: Math.round(sum(cargas.filter(x => x.vehiculoId === v.vehiculoId), x => x.litros) * 10) / 10,
    costo: Math.round(sum(cargas.filter(x => x.vehiculoId === v.vehiculoId), x => x.costo) * 100) / 100,
  }));
  renderBarra(cont.querySelector("#m5-c5"), {
    titulo: "Comparación de vehículos", categorias: consumoVehiculo.map(x => x.placa),
    series: [
      { nombre: "Litros", datos: consumoVehiculo.map(x => x.litros), color: COLORES.alerta },
      { nombre: "Costo", datos: consumoVehiculo.map(x => x.costo), color: COLORES.primario },
    ], unidad: "MXN",
  });

  const t = cont.querySelector("#m5-tablas");
  t.innerHTML = "";
  renderTabla(t, {
    titulo: "Cargas de combustible", columnas: [
      { titulo: "Vehículo", clave: "vehiculo" }, { titulo: "Fecha", clave: "fecha" }, { titulo: "Tipo", clave: "tipo" },
      { titulo: "Litros", clave: "litros", unidad: "L", num: true }, { titulo: "Precio", clave: "precio", unidad: "MXN/L", num: true },
      { titulo: "Costo", clave: "costo", unidad: "MXN", num: true },
    ], filas: cargas.map(x => ({ vehiculo: (c.vehiculos.find(v => v.vehiculoId === x.vehiculoId) || {}).placa || x.vehiculoId, fecha: x.fecha, tipo: x.tipo, litros: x.litros, precio: x.precioLitro, costo: x.costo })).sort((a, b) => b.fecha.localeCompare(a.fecha)),
    meta: `${cargas.length} cargas en el periodo filtrado.`,
  });

  renderTabla(t, {
    titulo: "Consumo por vehículo", columnas: [
      { titulo: "Vehículo", clave: "placa" }, { titulo: "Litros", clave: "litros", unidad: "L", num: true }, { titulo: "Costo", clave: "costo", unidad: "MXN", num: true },
    ], filas: consumoVehiculo.sort((a, b) => b.litros - a.litros),
  });

  const resumenMes = meses.map(m => ({ mes: m, litros: Math.round((litrosMes[m] || 0) * 10) / 10, costo: Math.round((costoMes[m] || 0) * 100) / 100, precio: precioMes[m] ? Math.round(precioMes[m] * 100) / 100 : null })).reverse();
  renderTabla(t, {
    titulo: "Resumen mensual", columnas: [
      { titulo: "Mes", clave: "mes" }, { titulo: "Litros", clave: "litros", unidad: "L", num: true },
      { titulo: "Costo", clave: "costo", unidad: "MXN", num: true }, { titulo: "Precio promedio", clave: "precio", unidad: "MXN/L", num: true },
    ], filas: resumenMes,
  });
}

export default { id: "05", render };
