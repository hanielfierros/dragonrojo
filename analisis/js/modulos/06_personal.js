// SESPATE — Módulo 06: Personal de Seguridad.

import { renderKpiGrid } from "../kpi.js";
import { renderTabla } from "../tablas.js";
import { renderComparativos } from "../comparativos.js";
import { renderBarra } from "../charts.js";
import { setFiltroModulo, notificar } from "../state.js";
import { COLORES } from "../config.js";

const FACTOR_LABORAL = 1.35 * 1.25;
const SALARIO = 45;

const ETIQUETA_ROL = { GUARDIA: "Elemento de seguridad", CHOFER: "Chofer", SUPERVISOR: "Supervisor" };

function sum(arr, fn) { return arr.reduce((a, x) => a + (fn ? fn(x) : x), 0); }

function render(ctx, cont) {
  const c = ctx.catalogos;
  const { turnos, asistencias, checklists, capacitaciones, evaluaciones } = ctx;
  const personas = c.personas.filter(p => ctx.personasPermitidas.has(p.personaId));

  const horas = sum(turnos, t => t.horas);
  const horasExtra = sum(turnos, t => t.horasExtra);
  const costoBase = horas * SALARIO;
  const costoIntegral = (horas * SALARIO + horasExtra * SALARIO * 2) * FACTOR_LABORAL;
  const totalAsistencias = sum(asistencias, a => a.asistencias);
  const tardanzas = sum(asistencias, a => a.tardanzas);
  const puntualidad = totalAsistencias ? (1 - tardanzas / totalAsistencias) * 100 : null;

  cont.innerHTML = `
    <div class="module-head"><h1>Personal de Seguridad</h1><p>Horas, costos y desempeño del personal</p></div>
    <div class="region"><div class="region-title">Filtros del módulo</div><div class="region-body">
      <div class="filter-bar">
        <label>Rol<select id="m6-f-rol"><option value="">Todos</option>
          <option value="GUARDIA" ${ctx.filtrosModulo.rol === "GUARDIA" ? "selected" : ""}>Elementos de seguridad</option>
          <option value="CHOFER" ${ctx.filtrosModulo.rol === "CHOFER" ? "selected" : ""}>Choferes</option>
          <option value="SUPERVISOR" ${ctx.filtrosModulo.rol === "SUPERVISOR" ? "selected" : ""}>Supervisores</option>
        </select></label>
        <label>Elemento<select id="m6-f-persona"><option value="">Todos</option>
          ${personas.map(p => `<option value="${p.personaId}" ${ctx.filtrosModulo.personaId === p.personaId ? "selected" : ""}>${p.nombre}</option>`).join("")}
        </select></label>
      </div>
    </div></div>
    <div id="m6-kpis"></div>
    <div class="charts-grid">
      <div class="region"><div class="region-title">Horas por mes</div><div class="region-body"><div class="chart" id="m6-c1"></div></div></div>
      <div class="region"><div class="region-title">Horas extra por mes</div><div class="region-body"><div class="chart" id="m6-c2"></div></div></div>
      <div class="region"><div class="region-title">Costo laboral mensual</div><div class="region-body"><div class="chart" id="m6-c3"></div></div></div>
      <div class="region"><div class="region-title">Puntualidad por periodo</div><div class="region-body"><div class="chart" id="m6-c4"></div></div></div>
      <div class="region"><div class="region-title">Capacitaciones por periodo</div><div class="region-body"><div class="chart" id="m6-c5"></div></div></div>
    </div>
    <div id="m6-tablas"></div>
    <div id="m6-comparativos"></div>
  `;

  cont.querySelector("#m6-f-rol").addEventListener("change", (e) => { setFiltroModulo("06", "rol", e.target.value); setFiltroModulo("06", "personaId", ""); notificar(); });
  cont.querySelector("#m6-f-persona").addEventListener("change", (e) => { setFiltroModulo("06", "personaId", e.target.value); notificar(); });

  renderKpiGrid(cont.querySelector("#m6-kpis"), [
    { etiqueta: "Personal activo", valor: personas.length, unidad: "#" },
    { etiqueta: "Horas trabajadas", valor: horas, unidad: "h" },
    { etiqueta: "Horas extra", valor: horasExtra, unidad: "h" },
    { etiqueta: "Costo laboral base", valor: costoBase, unidad: "MXN" },
    { etiqueta: "Costo laboral integral", valor: costoIntegral, unidad: "MXN", nota: "Estimación DEMO" },
    { etiqueta: "Asistencias", valor: totalAsistencias, unidad: "#" },
    { etiqueta: "Puntualidad", valor: puntualidad, unidad: "%" },
    { etiqueta: "Capacitaciones", valor: capacitaciones.length, unidad: "#" },
    { etiqueta: "Evaluaciones", valor: evaluaciones.length, unidad: "#" },
  ]);

  const horasMes = {}; const extraMes = {}; const costoMes = {};
  for (const t of turnos) { horasMes[t.mes] = (horasMes[t.mes] || 0) + t.horas; extraMes[t.mes] = (extraMes[t.mes] || 0) + t.horasExtra; }
  const asistMes = {}; const tardMes = {};
  for (const a of asistencias) { asistMes[a.mes] = (asistMes[a.mes] || 0) + a.asistencias; tardMes[a.mes] = (tardMes[a.mes] || 0) + a.tardanzas; }
  const capMes = {};
  for (const x of capacitaciones) capMes[x.mes] = (capMes[x.mes] || 0) + 1;

  const meses = [...new Set([...Object.keys(horasMes), ...Object.keys(asistMes), ...Object.keys(capMes)])].sort();
  const costoSerie = meses.map(m => ((horasMes[m] || 0) * SALARIO + (extraMes[m] || 0) * SALARIO * 2) * FACTOR_LABORAL);
  const puntSerie = meses.map(m => asistMes[m] ? (1 - (tardMes[m] || 0) / asistMes[m]) * 100 : null);

  renderBarra(cont.querySelector("#m6-c1"), { titulo: "Horas por mes", categorias: meses, series: [{ nombre: "Horas", datos: meses.map(m => Math.round((horasMes[m] || 0) * 10) / 10), color: COLORES.primario }], unidad: "h" });
  renderBarra(cont.querySelector("#m6-c2"), { titulo: "Horas extra por mes", categorias: meses, series: [{ nombre: "Horas extra", datos: meses.map(m => Math.round((extraMes[m] || 0) * 10) / 10), color: COLORES.alerta }], unidad: "h" });
  renderBarra(cont.querySelector("#m6-c3"), { titulo: "Costo laboral mensual", categorias: meses, series: [{ nombre: "Costo integral", datos: costoSerie.map(v => Math.round(v)), color: COLORES.exito }], unidad: "MXN" });
  renderBarra(cont.querySelector("#m6-c4"), { titulo: "Puntualidad por periodo", categorias: meses, series: [{ nombre: "Puntualidad", datos: puntSerie.map(v => v == null ? null : Math.round(v * 10) / 10), color: COLORES.info }], unidad: "%" });
  renderBarra(cont.querySelector("#m6-c5"), { titulo: "Capacitaciones por periodo", categorias: meses, series: [{ nombre: "Capacitaciones", datos: meses.map(m => capMes[m] || 0), color: COLORES.simulado }], unidad: "#" });

  // Tablas
  const t = cont.querySelector("#m6-tablas");
  t.innerHTML = "";
  const filasPersonal = personas.map(p => {
    const h = sum(turnos.filter(x => x.personaId === p.personaId), x => x.horas);
    const he = sum(turnos.filter(x => x.personaId === p.personaId), x => x.horasExtra);
    const as = sum(asistencias.filter(x => x.personaId === p.personaId), x => x.asistencias);
    const td = sum(asistencias.filter(x => x.personaId === p.personaId), x => x.tardanzas);
    return {
      nombre: p.nombre, rol: ETIQUETA_ROL[p.rol] || p.rol, salarioHora: p.salarioHora,
      horas: Math.round(h * 10) / 10, horasExtra: Math.round(he * 10) / 10,
      costoIntegral: Math.round((h * SALARIO + he * SALARIO * 2) * FACTOR_LABORAL),
      puntualidad: as ? Math.round((1 - td / as) * 1000) / 10 : null,
    };
  });
  renderTabla(t, {
    titulo: "Personal", columnas: [
      { titulo: "Nombre", clave: "nombre" }, { titulo: "Rol", clave: "rol" }, { titulo: "Salario/h", clave: "salarioHora", unidad: "MXN/h", num: true },
      { titulo: "Horas", clave: "horas", unidad: "h", num: true }, { titulo: "Horas extra", clave: "horasExtra", unidad: "h", num: true },
      { titulo: "Costo integral", clave: "costoIntegral", unidad: "MXN", num: true }, { titulo: "Puntualidad", clave: "puntualidad", unidad: "%", num: true },
    ], filas: filasPersonal, meta: "Costo integral = (horas + horas extra ×2) × salario × 1.6875 (Estimación DEMO).",
  });

  renderTabla(t, {
    titulo: "Asistencias", columnas: [
      { titulo: "Elemento", clave: "nombre" }, { titulo: "Mes", clave: "mes" }, { titulo: "Asistencias", clave: "asistencias", unidad: "#", num: true },
      { titulo: "Tardanzas", clave: "tardanzas", unidad: "#", num: true }, { titulo: "Ausencias", clave: "ausencias", unidad: "#", num: true },
    ], filas: asistencias.map(a => ({ nombre: (c.personas.find(p => p.personaId === a.personaId) || {}).nombre || a.personaId, mes: a.mes, asistencias: a.asistencias, tardanzas: a.tardanzas, ausencias: a.ausencias })).sort((a, b) => b.mes.localeCompare(a.mes)).slice(0, 300),
    meta: "Últimos 300 registros del periodo filtrado.",
  });

  renderTabla(t, {
    titulo: "Evaluaciones", columnas: [
      { titulo: "Elemento", clave: "nombre" }, { titulo: "Fecha", clave: "fecha" }, { titulo: "Puntaje", clave: "puntaje", num: true },
    ], filas: evaluaciones.map(e => ({ nombre: (c.personas.find(p => p.personaId === e.personaId) || {}).nombre || e.personaId, fecha: e.fecha, puntaje: e.puntaje })).sort((a, b) => b.fecha.localeCompare(a.fecha)),
  });

  renderTabla(t, {
    titulo: "Capacitaciones", columnas: [
      { titulo: "Elemento", clave: "nombre" }, { titulo: "Fecha", clave: "fecha" }, { titulo: "Horas", clave: "horas", unidad: "h", num: true }, { titulo: "Aprobado", clave: "aprobado" },
    ], filas: capacitaciones.map(x => ({ nombre: (c.personas.find(p => p.personaId === x.personaId) || {}).nombre || x.personaId, fecha: x.fecha, horas: x.horas, aprobado: x.aprobado ? "Sí" : "No" })).sort((a, b) => b.fecha.localeCompare(a.fecha)),
  });

  // Comparativos
  const periodo = `${ctx.filtros.fechaInicial || "2024-12-01"} a ${ctx.filtros.fechaFinal || "2026-11-22"}`;
  const filasComparativo = filasPersonal.map(f => {
    const p = c.personas.find(x => x.nombre === f.nombre);
    const reportes = checklists.filter(x => x.personaId === (p ? p.personaId : "")).length;
    return { ...f, personaId: p ? p.personaId : "", reportes, incidentes: Math.round(reportes * 0.12) };
  });
  const comparativos = [
    { id: "CMP-006", nombre: "Elemento con más reportes", kpi: "KPI-031", unidad: "#", claveValor: "reportes", datos: filasComparativo.map(x => ({ nombre: x.nombre, reportes: x.reportes })).sort((a, b) => b.reportes - a.reportes) },
    { id: "CMP-007", nombre: "Elemento que atiende más incidentes", kpi: "KPI-041", unidad: "#", claveValor: "incidentes", esEstimacion: true, datos: filasComparativo.map(x => ({ nombre: x.nombre, incidentes: x.incidentes })).sort((a, b) => b.incidentes - a.incidentes) },
    { id: "CMP-008", nombre: "Más horas extra", kpi: "KPI-025", unidad: "h", claveValor: "horasExtra", datos: filasComparativo.map(x => ({ nombre: x.nombre, horasExtra: x.horasExtra })).sort((a, b) => b.horasExtra - a.horasExtra) },
    { id: "CMP-009", nombre: "Mayor costo laboral", kpi: "KPI-027", unidad: "MXN", claveValor: "costoIntegral", datos: filasComparativo.map(x => ({ nombre: x.nombre, costoIntegral: x.costoIntegral })).sort((a, b) => b.costoIntegral - a.costoIntegral) },
    { id: "CMP-010", nombre: "Mejor puntualidad", kpi: "KPI-029", unidad: "%", claveValor: "puntualidad", datos: filasComparativo.map(x => ({ nombre: x.nombre, puntualidad: x.puntualidad })).filter(x => x.puntualidad != null).sort((a, b) => b.puntualidad - a.puntualidad) },
  ];
  renderComparativos(cont.querySelector("#m6-comparativos"), { comparativos, periodo });
}

export default { id: "06", render };
