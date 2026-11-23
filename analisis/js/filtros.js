// SESPATE — Motor de filtros globales y construcción del contexto filtrado.

import { getFiltros, getFiltrosModulo } from "./state.js";

const OPCIONES_GLOBALES = [
  { clave: "fechaInicial", etiqueta: "Fecha inicial", tipo: "date" },
  { clave: "fechaFinal", etiqueta: "Fecha final", tipo: "date" },
  { clave: "mes", etiqueta: "Mes", tipo: "select" },
  { clave: "anio", etiqueta: "Año", tipo: "select" },
  { clave: "clienteId", etiqueta: "Cliente", tipo: "select" },
  { clave: "instalacionId", etiqueta: "Instalación", tipo: "select" },
  { clave: "contratoId", etiqueta: "Contrato", tipo: "select" },
  { clave: "ciudad", etiqueta: "Ciudad", tipo: "select" },
  { clave: "zona", etiqueta: "Zona", tipo: "select" },
  { clave: "tipoServicio", etiqueta: "Tipo de servicio", tipo: "select" },
];

// --- Predicados de fecha ---
function enRangoMes(mes, f) {
  if (!mes) return true;
  if (f.anio && parseInt(mes.slice(0, 4), 10) !== parseInt(f.anio, 10)) return false;
  if (f.mes && mes !== f.mes) return false;
  if (f.fechaInicial && mes < f.fechaInicial.slice(0, 7)) return false;
  if (f.fechaFinal && mes > f.fechaFinal.slice(0, 7)) return false;
  return true;
}

function enRangoFecha(fecha, f) {
  if (!fecha) return true;
  if (!enRangoMes(fecha.slice(0, 7), f)) return false;
  if (f.fechaInicial && fecha < f.fechaInicial) return false;
  if (f.fechaFinal && fecha > f.fechaFinal) return false;
  return true;
}

// --- Construcción de opciones desde datos reales ---
function construirOpciones(datos) {
  const c = datos.catalogos;
  const meses = new Set();
  const anios = new Set();
  for (const r of datos.servicios) { meses.add(r.mes); anios.add(r.anio); }
  return {
    mes: [...meses].sort(),
    anio: [...anios].sort((a, b) => b - a),
    clienteId: c.clientes.map(x => ({ v: x.clienteId, t: `${x.clienteId} — ${x.nombre}` })),
    instalacionId: c.instalaciones.map(x => ({ v: x.instalacionId, t: `${x.instalacionId} — ${x.nombre}` })),
    contratoId: c.contratos.map(x => ({ v: x.contratoId, t: x.contratoId })),
    ciudad: [...new Set(c.instalaciones.map(x => x.ciudad))].sort(),
    zona: [...new Set(c.zonas.map(x => x.nombre))].sort(),
    tipoServicio: [...new Set(c.contratos.map(x => x.tipoServicio))].sort(),
  };
}

function intersectar(a, b) {
  const out = new Set();
  for (const x of a) if (b.has(x)) out.add(x);
  return out;
}

// --- Contexto filtrado ---
function construirContexto(datos, filtros, moduloId) {
  const c = datos.catalogos;
  const f = filtros;
  const activoClienteFamilia =
    f.clienteId || f.instalacionId || f.contratoId || f.ciudad || f.zona || f.tipoServicio;

  // 1) Clientes permitidos
  let clientesPermitidos = new Set(c.clientes.map(x => x.clienteId));
  if (f.clienteId) clientesPermitidos = new Set([f.clienteId]);
  if (f.ciudad) {
    const enCiudad = new Set(c.clientes.filter(x => x.ciudad === f.ciudad).map(x => x.clienteId));
    clientesPermitidos = intersectar(clientesPermitidos, enCiudad);
  }
  if (f.zona) {
    const ciudadesZona = new Set(c.zonas.filter(x => x.nombre === f.zona).map(x => x.ciudad));
    const enZona = new Set(c.clientes.filter(x => ciudadesZona.has(x.ciudad)).map(x => x.clienteId));
    clientesPermitidos = intersectar(clientesPermitidos, enZona);
  }
  if (f.instalacionId) {
    const inst = c.instalaciones.find(x => x.instalacionId === f.instalacionId);
    if (inst) clientesPermitidos = intersectar(clientesPermitidos, new Set([inst.clienteId]));
  }
  if (f.contratoId) {
    const con = c.contratos.find(x => x.contratoId === f.contratoId);
    if (con) clientesPermitidos = intersectar(clientesPermitidos, new Set([con.clienteId]));
  }
  if (f.tipoServicio) {
    const conTipo = new Set(c.contratos.filter(x => x.tipoServicio === f.tipoServicio).map(x => x.clienteId));
    clientesPermitidos = intersectar(clientesPermitidos, conTipo);
  }

  // 2) Contratos e instalaciones permitidos
  const contratosPermitidos = new Set(
    c.contratos.filter(x => clientesPermitidos.has(x.clienteId) &&
      (!f.contratoId || x.contratoId === f.contratoId) &&
      (!f.tipoServicio || x.tipoServicio === f.tipoServicio)).map(x => x.contratoId));
  const instalacionesPermitidas = new Set(
    c.instalaciones.filter(x => clientesPermitidos.has(x.clienteId) &&
      (!f.instalacionId || x.instalacionId === f.instalacionId)).map(x => x.instalacionId));

  // 3) Servicios filtrados (fecha + cliente/contrato)
  const servicios = datos.servicios.filter(r =>
    enRangoFecha(r.fecha, f) && clientesPermitidos.has(r.clienteId) && contratosPermitidos.has(r.contratoId));

  // 4) Vehículos y rutas permitidos
  let vehiculosPermitidos = new Set(c.vehiculos.map(x => x.vehiculoId));
  let rutasPermitidas = new Set(c.rutas.map(x => x.rutaId));
  if (activoClienteFamilia) {
    vehiculosPermitidos = new Set(servicios.map(r => r.vehiculoId));
    rutasPermitidas = new Set(servicios.map(r => r.rutaId));
  }
  const fmod = getFiltrosModulo(moduloId);
  if (fmod.vehiculoId) vehiculosPermitidos = new Set([fmod.vehiculoId]);
  if (fmod.rutaId) rutasPermitidas = new Set([fmod.rutaId]);

  // 5) Conjuntos filtrados por entidad
  const recorridos = datos.recorridos.filter(r =>
    enRangoFecha(r.fecha, f) && vehiculosPermitidos.has(r.vehiculoId) && rutasPermitidas.has(r.rutaId));
  const cargas = datos.cargas.filter(r =>
    enRangoFecha(r.fecha, f) && vehiculosPermitidos.has(r.vehiculoId) &&
    (!fmod.tipoCombustible || r.tipo === fmod.tipoCombustible));
  const mantenimientos = datos.mantenimientos.filter(r =>
    enRangoFecha(r.fecha, f) && vehiculosPermitidos.has(r.vehiculoId));
  const incidentes = datos.incidentes.filter(r =>
    enRangoFecha(r.fecha, f) && (clientesPermitidos.has(r.clienteId)));

  // Personal (filtro de fecha + rol/elemento específico)
  const rolPermitido = fmod.rol || null;
  const personaPermitida = fmod.personaId || null;
  let personasPermitidas = new Set(c.personas.map(x => x.personaId));
  if (rolPermitido) personasPermitidas = new Set(c.personas.filter(x => x.rol === rolPermitido).map(x => x.personaId));
  if (personaPermitida) personasPermitidas = new Set([personaPermitida]);
  const turnos = datos.turnos.filter(r => enRangoMes(r.mes, f) && personasPermitidas.has(r.personaId));
  const asistencias = datos.asistencias.filter(r => enRangoMes(r.mes, f) && personasPermitidas.has(r.personaId));
  const checklists = datos.checklists.filter(r => enRangoFecha(r.fecha, f) && personasPermitidas.has(r.personaId));
  const capacitaciones = datos.capacitaciones.filter(r => enRangoFecha(r.fecha, f) && personasPermitidas.has(r.personaId));
  const evaluaciones = datos.evaluaciones.filter(r => enRangoFecha(r.fecha, f) && personasPermitidas.has(r.personaId));

  // Financiero (mes + cliente)
  const financiero = datos.financiero.filter(r =>
    enRangoMes(r.mes, f) && clientesPermitidos.has(r.clienteId));

  return {
    filtros: f,
    filtrosModulo: fmod,
    activoClienteFamilia,
    catalogos: c,
    costos: datos.costos,
    mapa: datos.mapa,
    clientesPermitidos,
    contratosPermitidos,
    instalacionesPermitidas,
    vehiculosPermitidos,
    rutasPermitidas,
    personasPermitidas,
    servicios,
    recorridos,
    cargas,
    mantenimientos,
    incidentes,
    turnos,
    asistencias,
    checklists,
    capacitaciones,
    evaluaciones,
    financiero,
  };
}

function describirFiltros(f) {
  const partes = [];
  if (f.fechaInicial || f.fechaFinal) partes.push(`Periodo: ${f.fechaInicial || "inicio"} a ${f.fechaFinal || "fin"}`);
  if (f.mes) partes.push(`Mes: ${f.mes}`);
  if (f.anio) partes.push(`Año: ${f.anio}`);
  if (f.clienteId) partes.push(`Cliente: ${f.clienteId}`);
  if (f.instalacionId) partes.push(`Instalación: ${f.instalacionId}`);
  if (f.contratoId) partes.push(`Contrato: ${f.contratoId}`);
  if (f.ciudad) partes.push(`Ciudad: ${f.ciudad}`);
  if (f.zona) partes.push(`Zona: ${f.zona}`);
  if (f.tipoServicio) partes.push(`Tipo: ${f.tipoServicio}`);
  return partes.length ? `Filtros activos: ${partes.join(" · ")}` : "Sin filtros activos.";
}

export { OPCIONES_GLOBALES, construirOpciones, construirContexto, describirFiltros, enRangoMes, enRangoFecha };
