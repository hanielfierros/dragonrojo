// SESPATE — Módulo 07: Rutas y Patrullajes.

import { renderTabla } from "../tablas.js";
import { renderComparativos } from "../comparativos.js";
import { renderBarra, renderLineas } from "../charts.js";
import { renderMapa, destruirMapa } from "../mapas.js";
import { setFiltroModulo, notificar } from "../state.js";
import { COLORES } from "../config.js";

function sum(arr, fn) { return arr.reduce((a, x) => a + (fn ? fn(x) : x), 0); }

function render(ctx, cont) {
  const c = ctx.catalogos;
  const { recorridos, servicios, cargas } = ctx;
  const rutas = c.rutas.filter(r => ctx.rutasPermitidas.has(r.rutaId));

  const consumoProm = c.vehiculos.length ? sum(c.vehiculos, v => v.consumoL100km) / c.vehiculos.length : 10;
  const precioProm = cargas.length ? sum(cargas, x => x.precioLitro) / cargas.length : 25;

  const metrics = rutas.map(r => {
    const km = sum(recorridos.filter(x => x.rutaId === r.rutaId), x => x.km);
    const nServ = servicios.filter(s => s.rutaId === r.rutaId).length;
    const completados = servicios.filter(s => s.rutaId === r.rutaId && s.estado === "COMPLETADO").length;
    const costoComb = km * consumoProm / 100 * precioProm; // Estimación DEMO
    const incidentes = Math.round(nServ * 0.015); // Estimación DEMO
    return {
      ruta: r.nombre, distanciaKm: r.distanciaKm, paradas: r.paradas,
      recorridos: recorridos.filter(x => x.rutaId === r.rutaId).length,
      km: Math.round(km * 10) / 10,
      servicios: nServ,
      costoComb: Math.round(costoComb * 100) / 100,
      costoKm: km ? Math.round((costoComb / km) * 100) / 100 : null,
      incidentes,
      cumplimiento: nServ ? Math.round((completados / nServ) * 1000) / 10 : null,
      duracion: Math.round(km / 25 * 10) / 10, // Estimación DEMO (25 km/h)
    };
  });

  cont.innerHTML = `
    <div class="module-head"><h1>Rutas y Patrullajes</h1><p>Actividad y cumplimiento de rutas</p></div>
    <div class="region"><div class="region-title">Filtro del módulo</div><div class="region-body">
      <div class="filter-bar">
        <label>Ruta<select id="m7-f-ruta"><option value="">Todas</option>
          ${rutas.map(r => `<option value="${r.rutaId}" ${ctx.filtrosModulo.rutaId === r.rutaId ? "selected" : ""}>${r.nombre}</option>`).join("")}
        </select></label>
      </div>
    </div></div>
    <div class="charts-grid">
      <div class="region"><div class="region-title">Recorridos por ruta</div><div class="region-body"><div class="chart" id="m7-c1"></div></div></div>
      <div class="region"><div class="region-title">Kilómetros por ruta</div><div class="region-body"><div class="chart" id="m7-c2"></div></div></div>
      <div class="region"><div class="region-title">Costos por ruta</div><div class="region-body"><div class="chart" id="m7-c3"></div></div></div>
      <div class="region"><div class="region-title">Actividad mensual</div><div class="region-body"><div class="chart" id="m7-c4"></div></div></div>
      <div class="region"><div class="region-title">Cumplimiento por ruta</div><div class="region-body"><div class="chart" id="m7-c5"></div></div></div>
    </div>
    <div class="region"><div class="region-title">Mapa de rutas y puntos de referencia</div><div class="region-body"><div id="m7-mapa"></div></div></div>
    <div id="m7-tablas"></div>
    <div id="m7-comparativos"></div>
  `;

  cont.querySelector("#m7-f-ruta").addEventListener("change", (e) => { setFiltroModulo("07", "rutaId", e.target.value); notificar(); });

  renderBarra(cont.querySelector("#m7-c1"), { titulo: "Recorridos por ruta", categorias: metrics.map(m => m.ruta), series: [{ nombre: "Recorridos", datos: metrics.map(m => m.recorridos), color: COLORES.primario }], unidad: "#" });
  renderBarra(cont.querySelector("#m7-c2"), { titulo: "Kilómetros por ruta", categorias: metrics.map(m => m.ruta), series: [{ nombre: "km", datos: metrics.map(m => m.km), color: COLORES.info }], unidad: "km" });
  renderBarra(cont.querySelector("#m7-c3"), { titulo: "Costos por ruta (combustible estimado)", categorias: metrics.map(m => m.ruta), series: [{ nombre: "Costo combustible", datos: metrics.map(m => m.costoComb), color: COLORES.alerta }], unidad: "MXN" });

  const kmMes = {};
  for (const r of recorridos) kmMes[r.mes] = (kmMes[r.mes] || 0) + r.km;
  const mesesAct = Object.keys(kmMes).sort();
  renderLineas(cont.querySelector("#m7-c4"), { titulo: "Actividad mensual (km)", categorias: mesesAct, series: [{ nombre: "km", datos: mesesAct.map(m => Math.round(kmMes[m] * 10) / 10), color: COLORES.primario }], unidad: "km" });
  renderBarra(cont.querySelector("#m7-c5"), { titulo: "Cumplimiento por ruta", categorias: metrics.map(m => m.ruta), series: [{ nombre: "Cumplimiento", datos: metrics.map(m => m.cumplimiento), color: COLORES.exito }], unidad: "%" });

  // Mapa
  renderMapa(cont.querySelector("#m7-mapa"), ctx.mapa);

  const t = cont.querySelector("#m7-tablas");
  t.innerHTML = "";
  renderTabla(t, {
    titulo: "Catálogo de rutas", columnas: [
      { titulo: "Ruta", clave: "ruta" }, { titulo: "Distancia (km)", clave: "distanciaKm", unidad: "km", num: true }, { titulo: "Paradas", clave: "paradas", unidad: "#", num: true },
      { titulo: "Recorridos", clave: "recorridos", unidad: "#", num: true }, { titulo: "Kilómetros", clave: "km", unidad: "km", num: true },
      { titulo: "Servicios", clave: "servicios", unidad: "#", num: true }, { titulo: "Costo combustible", clave: "costoComb", unidad: "MXN", num: true },
      { titulo: "Costo/km", clave: "costoKm", unidad: "MXN/km", num: true }, { titulo: "Incidentes", clave: "incidentes", unidad: "#", num: true },
      { titulo: "Cumplimiento", clave: "cumplimiento", unidad: "%", num: true },
    ], filas: metrics, meta: "Costo combustible, costo/km, incidentes y cumplimiento son estimaciones DEMO a partir de kilómetros y servicios.",
  });

  renderTabla(t, {
    titulo: "Comparación de rutas", columnas: [
      { titulo: "Ruta", clave: "ruta" }, { titulo: "Kilómetros", clave: "km", unidad: "km", num: true }, { titulo: "Recorridos", clave: "recorridos", unidad: "#", num: true }, { titulo: "Cumplimiento", clave: "cumplimiento", unidad: "%", num: true },
    ], filas: metrics.slice().sort((a, b) => b.km - a.km),
  });

  renderTabla(t, {
    titulo: "Historial de recorridos", columnas: [
      { titulo: "Ruta", clave: "ruta" }, { titulo: "Vehículo", clave: "vehiculo" }, { titulo: "Fecha", clave: "fecha" }, { titulo: "km", clave: "km", unidad: "km", num: true },
    ], filas: recorridos.map(r => ({ ruta: (c.rutas.find(x => x.rutaId === r.rutaId) || {}).nombre || r.rutaId, vehiculo: (c.vehiculos.find(v => v.vehiculoId === r.vehiculoId) || {}).placa || r.vehiculoId, fecha: r.fecha, km: r.km })).sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 300),
    meta: "Últimos 300 recorridos del periodo filtrado.",
  });

  const periodo = `${ctx.filtros.fechaInicial || "2024-12-01"} a ${ctx.filtros.fechaFinal || "2026-11-22"}`;
  const comparativos = [
    { id: "CMP-011", nombre: "Ruta que consume más combustible", kpi: "KPI-012", unidad: "MXN", claveValor: "costoComb", esEstimacion: true, datos: metrics.map(m => ({ nombre: m.ruta, costoComb: m.costoComb })).sort((a, b) => b.costoComb - a.costoComb) },
    { id: "CMP-012", nombre: "Ruta con más kilómetros", kpi: "KPI-035", unidad: "km", claveValor: "km", datos: metrics.map(m => ({ nombre: m.ruta, km: m.km })).sort((a, b) => b.km - a.km) },
    { id: "CMP-013", nombre: "Ruta con mayor costo por km", kpi: "KPI-037", unidad: "MXN/km", claveValor: "costoKm", esEstimacion: true, datos: metrics.map(m => ({ nombre: m.ruta, costoKm: m.costoKm })).filter(x => x.costoKm != null).sort((a, b) => b.costoKm - a.costoKm) },
    { id: "CMP-014", nombre: "Ruta con más incidentes", kpi: "KPI-039", unidad: "#", claveValor: "incidentes", esEstimacion: true, datos: metrics.map(m => ({ nombre: m.ruta, incidentes: m.incidentes })).sort((a, b) => b.incidentes - a.incidentes) },
    { id: "CMP-015", nombre: "Ruta con mejor cumplimiento", kpi: "KPI-038", unidad: "%", claveValor: "cumplimiento", esEstimacion: true, datos: metrics.map(m => ({ nombre: m.ruta, cumplimiento: m.cumplimiento })).filter(x => x.cumplimiento != null).sort((a, b) => b.cumplimiento - a.cumplimiento) },
  ];
  renderComparativos(cont.querySelector("#m7-comparativos"), { comparativos, periodo });
}

export default { id: "07", render };
