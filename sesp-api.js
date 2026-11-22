/* ============================================================
   SESPATE — Cliente de API en modo DEMO (MOCK_DEMO)
   No se conecta a Wix ni a SECURITYTRANS. No hay autenticación
   real ni escritura en bases de datos. Todos los datos son
   ficticios y locales (memoria + sessionStorage + localStorage).
   ============================================================ */

import {
  sesionDemo, normalizarCatalogo, listaServicios, servicioPorId,
  mensajesDe, evidenciasDe, ubicacionesDe, marcadoresDe,
  crearServicio, enviarMensaje, registrarEvidenciaDemo, registrarUbicacionDemo,
  crearMarcadorDemo, cerrarServicioDemo,
} from "./sesp-mock-data.js";

export const API_MODE = "MOCK_DEMO"; // "WIX_SHARED" deshabilitado (backend no instalado).

const TOKEN_KEY = "sesp_session_token";
const SESSION_KEY = "sesp_session_data";

export function getToken() { try { return sessionStorage.getItem(TOKEN_KEY); } catch (e) { return null; } }
export function setToken(token) { try { sessionStorage.setItem(TOKEN_KEY, token); } catch (e) {} }
export function clearToken() { try { sessionStorage.removeItem(TOKEN_KEY); } catch (e) {} }

function guardarSesion(d) { try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(d)); } catch (e) {} }
function leerSesion() { try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)); } catch (e) { return null; } }

function ok(data) { return Promise.resolve({ status: "success", data }); }
function departamentoActual() {
  const s = leerSesion() || {};
  return s.departamento || s.area || "ASIGNACIONES";
}

// Plantilla DEMO del check de salida.
const CHECKLIST_DEMO = [
  { grupoId: "PERSONAL", titulo: "Documentación personal", puntos: [
    { puntoId: "P01", descripcion: "Permiso de portación de arma" },
    { puntoId: "P02", descripcion: "Credencial vigente" },
    { puntoId: "P03", descripcion: "Licencia de conducir vigente" },
  ]},
  { grupoId: "VEHICULAR", titulo: "Documentación vehicular", puntos: [
    { puntoId: "V01", descripcion: "Tarjeta de circulación" },
    { puntoId: "V02", descripcion: "Póliza de seguro vigente" },
  ]},
  { grupoId: "VEHICULO", titulo: "Inspección del vehículo", puntos: [
    { puntoId: "I01", descripcion: "Luces en Tablero Principal" },
    { puntoId: "I02", descripcion: "Niveles de fluidos" },
    { puntoId: "I03", descripcion: "Llantas y presión" },
    { puntoId: "I04", descripcion: "Frenos" },
  ]},
  { grupoId: "SEGURIDAD", titulo: "Material y equipo de seguridad", puntos: [
    { puntoId: "S01", descripcion: "Chaleco reflejante" },
    { puntoId: "S02", descripcion: "Triángulos de seguridad" },
    { puntoId: "S03", descripcion: "Extintor vigente" },
  ]},
];

export const WixApi = {
  mode: API_MODE,

  login(usuario, password, area) {
    const sesion = sesionDemo(usuario || "DEMO", area);
    guardarSesion(sesion);
    return ok({ token: "demo-token-" + Date.now(), sesion });
  },

  session() {
    return ok(leerSesion() || { usuario: "DEMO", area: "ASIGNACIONES" });
  },

  catalogos() { return ok(normalizarCatalogo()); },

  servicios() { return ok(listaServicios()); },

  servicio(servicioId) {
    const d = servicioPorId(servicioId);
    if (!d) return Promise.resolve({ status: "error", message: "Servicio no encontrado." });
    return ok(d);
  },

  mensajes(servicioId) { return ok(mensajesDe(servicioId)); },

  checklistPlantilla() { return ok(CHECKLIST_DEMO); },
  checklists(servicioId) { return ok([]); },

  crearServicio(folio, responsable, unidad, ruta) {
    const s = crearServicio({ folio, responsable, unidad, ruta }, {});
    return ok({ servicioId: s._id, folio: s.folio });
  },
  modificarServicio(servicioId, version, cambios) { return ok({ servicioId }); },
  cerrarServicio(servicioId, version) {
    cerrarServicioDemo(servicioId);
    return ok({ servicioId });
  },

  enviarMensaje(servicioId, categoria, mensaje, origenEnvio) {
    const m = enviarMensaje(servicioId, mensaje, departamentoActual());
    return ok({ mensajeId: m._id });
  },

  guardarChecklist(servicioId, version, items) { return ok({}); },

  subirDocumento() { return ok({ mensajeId: "MSG-DEMO-" + Date.now() }); },
  descarga() { return ok({ descarga: "" }); },

  resolverUbicacion(servicioId, mensajeId, url) {
    // Extrae coordenadas si el enlace las incluye de forma explícita.
    const c = parsearCoordenadas(url);
    if (c) return ok({ resuelto: true, latitud: c.lat, longitud: c.lon, mensajeId });
    return ok({ resuelto: false, mensajeId, motivo: "No fue posible identificar una ubicación exacta en este enlace." });
  },

  registrarEvidencia(datos) {
    const e = registrarEvidenciaDemo(datos.servicioId, datos);
    return ok({ evidenciaId: e._id, mensajeId: "", ubicacionId: "" });
  },

  ubicaciones(servicioId) { return ok(ubicacionesDe(servicioId)); },
  evidencias(servicioId) { return ok(evidenciasDe(servicioId)); },

  marcadores(servicioId) { return ok(marcadoresDe(servicioId)); },
  crearMarcador(datos) {
    const m = crearMarcadorDemo(datos.servicioId, datos, departamentoActual());
    return ok({ marcadorId: m._id });
  },
};

function parsearCoordenadas(url) {
  try {
    const u = new URL(url);
    const q = u.searchParams.get("q") || u.searchParams.get("query") || "";
    const m = q.match(/^(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)$/);
    if (m) {
      const lat = parseFloat(m[1]), lon = parseFloat(m[2]);
      if (Number.isFinite(lat) && Number.isFinite(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
        return { lat, lon };
      }
    }
  } catch (e) {}
  return null;
}
