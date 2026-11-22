/* ============================================================
   SESPATE — Capa de datos simulada (DEMO) con persistencia local.
   Todos los datos son FICTICIOS. No se conecta a Wix ni a SECURITYTRANS.
   Persistencia: localStorage (mismo navegador). NO es sincronización
   real entre computadoras.
   ============================================================ */

import { choferes, patrullas, rutas, EXCEL_SHA256, ES_DEMO } from "./sesp-master-data.js";

export const DEPARTAMENTOS = {
  ASIGNACIONES: "Asignaciones",
  PERSONAL_SEGURIDAD: "Personal de Seguridad",
  MANTENIMIENTO: "Mantenimiento",
  DIRECCION_SEGURIDAD: "Dirección de Seguridad",
};

export const ETAPAS_SERVICIO = [
  { etapaId: "INICIO_TURNO", nombre: "Inicio de Turno", orden: 1 },
  { etapaId: "INICIO_RECORRIDO", nombre: "Inicio de Recorrido", orden: 2 },
  { etapaId: "FIN_RECORRIDO", nombre: "Fin de Recorrido", orden: 3 },
  { etapaId: "ENTREGA_REPORTES", nombre: "Entrega de Reportes", orden: 4 },
  { etapaId: "ENTREGA_UNIDAD", nombre: "Entrega de Unidad", orden: 5 },
  { etapaId: "FIN_TURNO", nombre: "Fin de Turno", orden: 6 },
];

const CATEGORIAS = {
  ASIGNACIONES: ["Documento Administrativo", "Mensaje General", "Aviso Urgente"],
  PERSONAL_SEGURIDAD: [
    "Mensaje General", "Evidencia de Asignación a Lugar", "Evidencia de Percance Vehicular",
    "Recogida de auto", "Paso por Caseta", "Carga de combustible",
    "Kilometraje y combustible inicial", "Kilometraje y combustible final",
    "Evidencia de Accidente", "Evidencia de Asistencia a Emergencia",
  ],
  MANTENIMIENTO: ["Mensaje General"],
  DIRECCION_SEGURIDAD: ["Mensaje General"],
};

// Maestros desde Excel (siempre frescos; no se persisten).
const personal = choferes.map(ch => ({
  _id: ch.id, nombreCompleto: ch.nombreCompleto,
  identificadorAcceso: ch.nombre.toUpperCase(), departamento: "PERSONAL_SEGURIDAD",
  curp: ch.curp, licencia: ch.licencia, contactoEmergencia: ch.contactoEmergencia,
  telContacto: ch.telContacto, tipoSangre: ch.tipoSangre, poliza: ch.poliza,
}));

const unidades = patrullas.map(p => ({
  _id: p.id, numeroUnidad: p.placa, placas: p.placa,
  marca: p.marca, modelo: p.modelo, anio: p.anio,
  capacidadCombustibleL: p.capacidadCombustibleL, consumoL100km: p.consumoL100km,
  rendimientoKmL: p.rendimientoKmL, costoHoraMxn: p.costoHoraMxn,
  estado: "DISPONIBLE", activa: true,
}));

const recorridos = rutas.map(r => ({
  _id: r.id, nombre: r.nombre, distanciaKm: r.distanciaKm,
  paradasObligatorias: r.paradasObligatorias, esLibre: r.esLibre,
}));

// Servicios precargados (ficticios).
const SERVICIOS_PRELOAD = [
  { _id: "SRV-001", folio: "SESP-2026-0001", nombreServicio: "Patrullaje zona norte", tipoServicio: "PATRULLAJE", estado: "ABIERTO", responsable: "CHOFER-DEMO-001", unidad: "PATRULLA-DEMO-001", ruta: "RUTA-DEMO-001", ubicacionInicial: "Base Norte", ubicacionFinal: "Zona Norte", fechaProgramada: "2026-11-22T08:00:00Z", observaciones: "Servicio ficticio de demostración." },
  { _id: "SRV-002", folio: "SESP-2026-0002", nombreServicio: "Custodia de instalación", tipoServicio: "CUSTODIA", estado: "ABIERTO", responsable: "CHOFER-DEMO-002", unidad: "PATRULLA-DEMO-002", ruta: "RUTA-DEMO-002", ubicacionInicial: "Base Sur", ubicacionFinal: "Planta Industrial", fechaProgramada: "2026-11-22T09:00:00Z", observaciones: "" },
  { _id: "SRV-003", folio: "SESP-2026-0003", nombreServicio: "Traslado de valores", tipoServicio: "TRASLADO", estado: "CERRADO", responsable: "CHOFER-DEMO-003", unidad: "PATRULLA-DEMO-003", ruta: "RUTA-DEMO-003", ubicacionInicial: "Oficina Central", ubicacionFinal: "Banco", fechaProgramada: "2026-11-21T10:00:00Z", observaciones: "Servicio finalizado." },
  { _id: "SRV-004", folio: "SESP-2026-0004", nombreServicio: "Patrullaje libre", tipoServicio: "PATRULLAJE", estado: "ABIERTO", responsable: "CHOFER-DEMO-004", unidad: "PATRULLA-DEMO-004", ruta: "RUTA-DEMO-LIBRE", ubicacionInicial: "Base Central", ubicacionFinal: "Pendiente de recorrido", fechaProgramada: "2026-11-22T07:30:00Z", observaciones: "Recorrido libre: distancia por definir." },
];

function mensaje(id, folio, depto, contenido, fecha) {
  return { _id: id, servicio: null, folio, area: depto, departamento: depto, autorVisible: DEPARTAMENTOS[depto] || depto, contenido, urgente: false, fechaEnvio: fecha, tipo: "MENSAJE" };
}

// Datos de usuario (localStorage).
const STORAGE_KEY = "sesp_demo_db_v1";

function cargarUsuario() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (d && d.version === 1) return d;
  } catch (e) { /* datos corruptos: se ignoran */ }
  return null;
}

const usuarioGuardado = cargarUsuario() || {};

// Base de datos en memoria (servicios, mensajes, evidencias, ubicaciones, marcadores).
const DB = {
  servicios: [
    ...SERVICIOS_PRELOAD.filter(p => !(usuarioGuardado.servicios || []).some(u => u._id === p._id)),
    ...(usuarioGuardado.servicios || []),
  ],
  mensajes: {
    "SRV-001": [ mensaje("MSG-001", "SESP-2026-0001", "ASIGNACIONES", "Documento administrativo: se asigna la patrulla para el patrullaje.", "2026-11-22T08:05:00Z"), mensaje("MSG-002", "SESP-2026-0001", "PERSONAL_SEGURIDAD", "Inicio de turno registrado.", "2026-11-22T08:10:00Z") ],
    ...(usuarioGuardado.mensajes || {}),
  },
  evidencias: { "SRV-001": [{ _id: "EVID-001", servicio: "SRV-001", tipoEvidencia: "RECOGIDA_AUTO", descripcion: "Recogida de auto", fechaCaptura: "2026-11-22T08:00:00Z", latitud: 19.43, longitud: -99.13, estado: "REGISTRADA" }], ...(usuarioGuardado.evidencias || {}) },
  ubicaciones: { "SRV-001": [{ _id: "UBI-001", servicio: "SRV-001", latitud: 19.4326, longitud: -99.1332, precisionMetros: 15, fechaUbicacion: "2026-11-22T08:05:00Z", origen: "GPS", tipoEvento: "INICIO_TURNO" }], ...(usuarioGuardado.ubicaciones || {}) },
  marcadores: { ...(usuarioGuardado.marcadores || {}) },
};

function guardarUsuario() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: 1,
      servicios: DB.servicios.filter(s => !SERVICIOS_PRELOAD.some(p => p._id === s._id)),
      mensajes: DB.mensajes, evidencias: DB.evidencias,
      ubicaciones: DB.ubicaciones, marcadores: DB.marcadores,
    }));
  } catch (e) { /* cuota o error: se mantiene en memoria */ }
}

export { EXCEL_SHA256, ES_DEMO };

export function sesionDemo(usuario, departamento) {
  return {
    usuario, area: departamento, departamento,
    sesionId: "DEMO-" + Date.now(),
    categorias: CATEGORIAS[departamento] || ["Mensaje General"],
    permisos: [],
  };
}

export function normalizarCatalogo() {
  return { personal, unidades, recorridos };
}

export function listaServicios() { return DB.servicios.slice(); }

export function servicioPorId(id) {
  const s = DB.servicios.find(x => x._id === id);
  if (!s) return null;
  return {
    servicio: s,
    responsable: personal.find(p => p._id === s.responsable) || null,
    unidad: unidades.find(u => u._id === s.unidad) || null,
    recorrido: recorridos.find(r => r._id === s.ruta) || null,
    soloLectura: s.estado === "CERRADO",
  };
}

export function mensajesDe(id) { return (DB.mensajes[id] || []).slice(); }
export function evidenciasDe(id) { return (DB.evidencias[id] || []).slice(); }
export function ubicacionesDe(id) { return (DB.ubicaciones[id] || []).slice(); }
export function marcadoresDe(id) { return (DB.marcadores[id] || []).slice(); }

function folioDe(servicioId) {
  const s = DB.servicios.find(x => x._id === servicioId);
  return s ? s.folio : "";
}

export function crearServicio(datos, sesion) {
  const s = {
    _id: "SRV-" + Date.now(),
    folio: datos.folio || ("SESP-" + Date.now()),
    nombreServicio: datos.nombreServicio || datos.folio,
    tipoServicio: "DEMO", estado: "ABIERTO",
    responsable: datos.responsable || "", unidad: datos.unidad || "",
    ruta: datos.ruta || "RUTA-DEMO-LIBRE",
    ubicacionInicial: "", ubicacionFinal: "", fechaProgramada: new Date().toISOString(), observaciones: "",
  };
  DB.servicios.push(s);
  DB.mensajes[s._id] = []; DB.evidencias[s._id] = []; DB.ubicaciones[s._id] = []; DB.marcadores[s._id] = [];
  guardarUsuario();
  return s;
}

export function enviarMensaje(servicioId, contenido, departamento) {
  const depto = departamento || "";
  const m = {
    _id: "MSG-" + Date.now(), servicio: servicioId, folio: folioDe(servicioId),
    area: depto, departamento: depto, autorVisible: DEPARTAMENTOS[depto] || depto,
    contenido, urgente: false, fechaEnvio: new Date().toISOString(), tipo: "MENSAJE",
  };
  (DB.mensajes[servicioId] = DB.mensajes[servicioId] || []).push(m);
  guardarUsuario();
  return m;
}

export function registrarEvidenciaDemo(servicioId, datos) {
  const e = { _id: "EVID-" + Date.now(), servicio: servicioId, tipoEvidencia: datos.categoria || "EVIDENCIA", descripcion: datos.mensaje || "", fechaCaptura: new Date().toISOString(), latitud: datos.latitud, longitud: datos.longitud, estado: "REGISTRADA" };
  (DB.evidencias[servicioId] = DB.evidencias[servicioId] || []).push(e);
  guardarUsuario();
  return e;
}

export function registrarUbicacionDemo(servicioId, datos) {
  const u = { _id: "UBI-" + Date.now(), servicio: servicioId, latitud: datos.latitud, longitud: datos.longitud, precisionMetros: datos.precisionMetros || 0, fechaUbicacion: new Date().toISOString(), origen: "GPS", tipoEvento: datos.tipoEvento || "REFERENCIA" };
  (DB.ubicaciones[servicioId] = DB.ubicaciones[servicioId] || []).push(u);
  guardarUsuario();
  return u;
}

export function crearMarcadorDemo(servicioId, datos, departamento) {
  const depto = departamento || "";
  const m = {
    _id: "MARK-" + Date.now(), servicio: servicioId, folio: folioDe(servicioId),
    latitud: datos.latitud, longitud: datos.longitud,
    titulo: datos.titulo || "Ubicación", notas: datos.notas || "",
    urlOriginal: datos.urlOriginal || "", tipoMarcador: datos.tipoMarcador || "UBICACION",
    autorVisible: DEPARTAMENTOS[depto] || depto, departamento: depto,
    fechaRegistro: new Date().toISOString(), activo: true,
  };
  (DB.marcadores[servicioId] = DB.marcadores[servicioId] || []).push(m);
  guardarUsuario();
  return m;
}

export function cerrarServicioDemo(id) {
  const s = DB.servicios.find(x => x._id === id);
  if (s) { s.estado = "CERRADO"; guardarUsuario(); }
  return s;
}
