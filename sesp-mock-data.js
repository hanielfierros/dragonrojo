/* ============================================================
   SESPATE — Capa de datos simulada (DEMO) integrada al Excel maestro.
   Todos los datos son FICTICIOS. No se conecta a Wix ni a SECURITYTRANS.
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
    "Mensaje General",
    "Evidencia de Asignación a Lugar",
    "Evidencia de Percance Vehicular",
    "Recogida de auto",
    "Paso por Caseta",
    "Carga de combustible",
    "Kilometraje y combustible inicial",
    "Kilometraje y combustible final",
    "Evidencia de Accidente",
    "Evidencia de Asistencia a Emergencia",
  ],
  MANTENIMIENTO: ["Mensaje General"],
  DIRECCION_SEGURIDAD: ["Mensaje General"],
};

const DB = {
  personal: [
  {
    "_id": "CHOFER-DEMO-001",
    "nombreCompleto": "Juan Hernández López",
    "identificadorAcceso": "JUAN",
    "departamento": "PERSONAL_SEGURIDAD",
    "curp": "CURP-DEMO-001",
    "licencia": "LIC-DEMO-001",
    "contactoEmergencia": "María López",
    "telContacto": "TEL-DEMO-001",
    "tipoSangre": "O+",
    "poliza": "POL-DEMO-001"
  },
  {
    "_id": "CHOFER-DEMO-002",
    "nombreCompleto": "Carlos García Martínez",
    "identificadorAcceso": "CARLOS",
    "departamento": "PERSONAL_SEGURIDAD",
    "curp": "CURP-DEMO-002",
    "licencia": "LIC-DEMO-002",
    "contactoEmergencia": "Ana García",
    "telContacto": "TEL-DEMO-002",
    "tipoSangre": "A+",
    "poliza": "POL-DEMO-002"
  },
  {
    "_id": "CHOFER-DEMO-003",
    "nombreCompleto": "Luis Martínez Sánchez",
    "identificadorAcceso": "LUIS",
    "departamento": "PERSONAL_SEGURIDAD",
    "curp": "CURP-DEMO-003",
    "licencia": "LIC-DEMO-003",
    "contactoEmergencia": "Lucía Sánchez",
    "telContacto": "TEL-DEMO-003",
    "tipoSangre": "O-",
    "poliza": "POL-DEMO-003"
  },
  {
    "_id": "CHOFER-DEMO-004",
    "nombreCompleto": "Miguel Rodríguez Gómez",
    "identificadorAcceso": "MIGUEL",
    "departamento": "PERSONAL_SEGURIDAD",
    "curp": "CURP-DEMO-004",
    "licencia": "LIC-DEMO-004",
    "contactoEmergencia": "Rosa Gómez",
    "telContacto": "TEL-DEMO-004",
    "tipoSangre": "B+",
    "poliza": "POL-DEMO-004"
  },
  {
    "_id": "CHOFER-DEMO-005",
    "nombreCompleto": "José López Díaz",
    "identificadorAcceso": "JOSÉ",
    "departamento": "PERSONAL_SEGURIDAD",
    "curp": "CURP-DEMO-005",
    "licencia": "LIC-DEMO-005",
    "contactoEmergencia": "Carmen Díaz",
    "telContacto": "TEL-DEMO-005",
    "tipoSangre": "A-",
    "poliza": "POL-DEMO-005"
  },
  {
    "_id": "CHOFER-DEMO-006",
    "nombreCompleto": "Francisco Pérez Ramírez",
    "identificadorAcceso": "FRANCISCO",
    "departamento": "PERSONAL_SEGURIDAD",
    "curp": "CURP-DEMO-006",
    "licencia": "LIC-DEMO-006",
    "contactoEmergencia": "Elena Ramírez",
    "telContacto": "TEL-DEMO-006",
    "tipoSangre": "AB+",
    "poliza": "POL-DEMO-006"
  },
  {
    "_id": "CHOFER-DEMO-007",
    "nombreCompleto": "Alejandro Torres Flores",
    "identificadorAcceso": "ALEJANDRO",
    "departamento": "PERSONAL_SEGURIDAD",
    "curp": "CURP-DEMO-007",
    "licencia": "LIC-DEMO-007",
    "contactoEmergencia": "Sofía Flores",
    "telContacto": "TEL-DEMO-007",
    "tipoSangre": "B-",
    "poliza": "POL-DEMO-007"
  },
  {
    "_id": "CHOFER-DEMO-008",
    "nombreCompleto": "Jorge Sánchez Cruz",
    "identificadorAcceso": "JORGE",
    "departamento": "PERSONAL_SEGURIDAD",
    "curp": "CURP-DEMO-008",
    "licencia": "LIC-DEMO-008",
    "contactoEmergencia": "Paola Cruz",
    "telContacto": "TEL-DEMO-008",
    "tipoSangre": "AB-",
    "poliza": "POL-DEMO-008"
  },
  {
    "_id": "CHOFER-DEMO-009",
    "nombreCompleto": "David Ramírez Morales",
    "identificadorAcceso": "DAVID",
    "departamento": "PERSONAL_SEGURIDAD",
    "curp": "CURP-DEMO-009",
    "licencia": "LIC-DEMO-009",
    "contactoEmergencia": "Laura Morales",
    "telContacto": "TEL-DEMO-009",
    "tipoSangre": "O+",
    "poliza": "POL-DEMO-009"
  },
  {
    "_id": "CHOFER-DEMO-010",
    "nombreCompleto": "Fernando Flores Reyes",
    "identificadorAcceso": "FERNANDO",
    "departamento": "PERSONAL_SEGURIDAD",
    "curp": "CURP-DEMO-010",
    "licencia": "LIC-DEMO-010",
    "contactoEmergencia": "Karla Reyes",
    "telContacto": "TEL-DEMO-010",
    "tipoSangre": "A+",
    "poliza": "POL-DEMO-010"
  }
],
  unidades: [
  {
    "_id": "PATRULLA-DEMO-001",
    "numeroUnidad": "PAT-DEMO-01",
    "placas": "PAT-DEMO-01",
    "marca": "Nissan",
    "modelo": "Versa",
    "anio": 2022,
    "capacidadCombustibleL": 41.0,
    "consumoL100km": 8.0,
    "rendimientoKmL": 12.5,
    "costoHoraMxn": 135.0,
    "estado": "DISPONIBLE",
    "activa": true
  },
  {
    "_id": "PATRULLA-DEMO-002",
    "numeroUnidad": "PAT-DEMO-02",
    "placas": "PAT-DEMO-02",
    "marca": "Chevrolet",
    "modelo": "Aveo",
    "anio": 2021,
    "capacidadCombustibleL": 45.0,
    "consumoL100km": 7.5,
    "rendimientoKmL": 13.33,
    "costoHoraMxn": 124.25,
    "estado": "DISPONIBLE",
    "activa": true
  },
  {
    "_id": "PATRULLA-DEMO-003",
    "numeroUnidad": "PAT-DEMO-03",
    "placas": "PAT-DEMO-03",
    "marca": "Nissan",
    "modelo": "Frontier",
    "anio": 2022,
    "capacidadCombustibleL": 80.0,
    "consumoL100km": 12.0,
    "rendimientoKmL": 8.33,
    "costoHoraMxn": 206.0,
    "estado": "DISPONIBLE",
    "activa": true
  },
  {
    "_id": "PATRULLA-DEMO-004",
    "numeroUnidad": "PAT-DEMO-04",
    "placas": "PAT-DEMO-04",
    "marca": "Ford",
    "modelo": "Ranger",
    "anio": 2023,
    "capacidadCombustibleL": 80.0,
    "consumoL100km": 11.5,
    "rendimientoKmL": 8.7,
    "costoHoraMxn": 196.25,
    "estado": "DISPONIBLE",
    "activa": true
  }
],
  recorridos: [
  {
    "_id": "RUTA-DEMO-001",
    "nombre": "Ruta 1",
    "distanciaKm": 15,
    "paradasObligatorias": 3,
    "esLibre": false
  },
  {
    "_id": "RUTA-DEMO-002",
    "nombre": "Ruta 2",
    "distanciaKm": 30,
    "paradasObligatorias": 5,
    "esLibre": false
  },
  {
    "_id": "RUTA-DEMO-003",
    "nombre": "Ruta 3",
    "distanciaKm": 45,
    "paradasObligatorias": 7,
    "esLibre": false
  },
  {
    "_id": "RUTA-DEMO-LIBRE",
    "nombre": "Libre",
    "distanciaKm": null,
    "paradasObligatorias": null,
    "esLibre": true
  }
],
  servicios: [
  {
    "_id": "SRV-001",
    "folio": "SESP-2026-0001",
    "nombreServicio": "Patrullaje zona norte",
    "tipoServicio": "PATRULLAJE",
    "estado": "ABIERTO",
    "responsable": "CHOFER-DEMO-001",
    "unidad": "PATRULLA-DEMO-001",
    "ruta": "RUTA-DEMO-001",
    "ubicacionInicial": "Base Norte",
    "ubicacionFinal": "Zona Norte",
    "fechaProgramada": "2026-11-22T08:00:00Z",
    "observaciones": "Servicio ficticio de demostración."
  },
  {
    "_id": "SRV-002",
    "folio": "SESP-2026-0002",
    "nombreServicio": "Custodia de instalación",
    "tipoServicio": "CUSTODIA",
    "estado": "ABIERTO",
    "responsable": "CHOFER-DEMO-002",
    "unidad": "PATRULLA-DEMO-002",
    "ruta": "RUTA-DEMO-002",
    "ubicacionInicial": "Base Sur",
    "ubicacionFinal": "Planta Industrial",
    "fechaProgramada": "2026-11-22T09:00:00Z",
    "observaciones": ""
  },
  {
    "_id": "SRV-003",
    "folio": "SESP-2026-0003",
    "nombreServicio": "Traslado de valores",
    "tipoServicio": "TRASLADO",
    "estado": "CERRADO",
    "responsable": "CHOFER-DEMO-003",
    "unidad": "PATRULLA-DEMO-003",
    "ruta": "RUTA-DEMO-003",
    "ubicacionInicial": "Oficina Central",
    "ubicacionFinal": "Banco",
    "fechaProgramada": "2026-11-21T10:00:00Z",
    "observaciones": "Servicio finalizado."
  },
  {
    "_id": "SRV-004",
    "folio": "SESP-2026-0004",
    "nombreServicio": "Patrullaje libre",
    "tipoServicio": "PATRULLAJE",
    "estado": "ABIERTO",
    "responsable": "CHOFER-DEMO-004",
    "unidad": "PATRULLA-DEMO-004",
    "ruta": "RUTA-DEMO-LIBRE",
    "ubicacionInicial": "Base Central",
    "ubicacionFinal": "Pendiente de recorrido",
    "fechaProgramada": "2026-11-22T07:30:00Z",
    "observaciones": "Recorrido libre: distancia por definir."
  }
],
  mensajes: { "SRV-001": [
    { _id: "MSG-001", servicio: "SRV-001", remitente: "CHOFER-DEMO-001", departamento: "ASIGNACIONES", contenido: "Documento administrativo: se asigna la patrulla para el patrullaje.", urgente: false, fechaEnvio: "2026-11-22T08:05:00Z" },
    { _id: "MSG-002", servicio: "SRV-001", remitente: "CHOFER-DEMO-001", departamento: "PERSONAL_SEGURIDAD", contenido: "Inicio de turno registrado.", urgente: false, fechaEnvio: "2026-11-22T08:10:00Z" },
  ], "SRV-002": [], "SRV-003": [], "SRV-004": [] },
  evidencias: { "SRV-001": [
    { _id: "EVID-001", servicio: "SRV-001", tipoEvidencia: "RECOGIDA_AUTO", descripcion: "Recogida de auto", fechaCaptura: "2026-11-22T08:00:00Z", latitud: 19.43, longitud: -99.13, estado: "REGISTRADA" },
  ], "SRV-002": [], "SRV-003": [], "SRV-004": [] },
  ubicaciones: { "SRV-001": [
    { _id: "UBI-001", servicio: "SRV-001", latitud: 19.4326, longitud: -99.1332, precisionMetros: 15, fechaUbicacion: "2026-11-22T08:05:00Z", origen: "GPS", tipoEvento: "INICIO_TURNO" },
  ], "SRV-002": [], "SRV-003": [], "SRV-004": [] },
};

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
  return { personal: DB.personal, unidades: DB.unidades, recorridos: DB.recorridos };
}

export function listaServicios() { return DB.servicios.slice(); }

export function servicioPorId(id) {
  const s = DB.servicios.find(x => x._id === id);
  if (!s) return null;
  return {
    servicio: s,
    responsable: DB.personal.find(p => p._id === s.responsable) || null,
    unidad: DB.unidades.find(u => u._id === s.unidad) || null,
    recorrido: DB.recorridos.find(r => r._id === s.ruta) || null,
    soloLectura: s.estado === "CERRADO",
  };
}

export function mensajesDe(id) { return (DB.mensajes[id] || []).slice(); }
export function evidenciasDe(id) { return (DB.evidencias[id] || []).slice(); }
export function ubicacionesDe(id) { return (DB.ubicaciones[id] || []).slice(); }

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
  DB.servicios.push(s); DB.mensajes[s._id] = []; DB.evidencias[s._id] = []; DB.ubicaciones[s._id] = [];
  return s;
}

export function enviarMensaje(servicioId, contenido, departamento, usuario) {
  const m = { _id: "MSG-" + Date.now(), servicio: servicioId, remitente: usuario, departamento, contenido, urgente: false, fechaEnvio: new Date().toISOString() };
  (DB.mensajes[servicioId] = DB.mensajes[servicioId] || []).push(m);
  return m;
}

export function registrarEvidenciaDemo(servicioId, datos) {
  const e = { _id: "EVID-" + Date.now(), servicio: servicioId, tipoEvidencia: datos.categoria || "EVIDENCIA", descripcion: datos.mensaje || "", fechaCaptura: new Date().toISOString(), latitud: datos.latitud, longitud: datos.longitud, estado: "REGISTRADA" };
  (DB.evidencias[servicioId] = DB.evidencias[servicioId] || []).push(e);
  return e;
}

export function registrarUbicacionDemo(servicioId, datos) {
  const u = { _id: "UBI-" + Date.now(), servicio: servicioId, latitud: datos.latitud, longitud: datos.longitud, precisionMetros: datos.precisionMetros || 0, fechaUbicacion: new Date().toISOString(), origen: "GPS", tipoEvento: datos.tipoEvento || "REFERENCIA" };
  (DB.ubicaciones[servicioId] = DB.ubicaciones[servicioId] || []).push(u);
  return u;
}

export function cerrarServicioDemo(id) {
  const s = DB.servicios.find(x => x._id === id);
  if (s) s.estado = "CERRADO";
  return s;
}
