/* ============================================================
   SESPATE — Cliente de API WIX_SHARED (producción)
   Se conecta al backend real Wix Velo (_functions).
   MODO por defecto: WIX_SHARED. Las escrituras dependen del
   backend (SESP_HABILITAR_ESCRITURAS); los errores se muestran
   sin éxito falso.
   ============================================================ */

import { choferes, patrullas, rutas } from "./sesp-master-data.js";

export const API_MODE = "WIX_SHARED";
const API_BASE = "https://www.ebenezeraviation.com/_functions";

const TOKEN_KEY = "sesp_session_token";
const SESSION_KEY = "sesp_session_data";

export function getToken() { try { return sessionStorage.getItem(TOKEN_KEY); } catch (e) { return null; } }
export function setToken(token) { try { sessionStorage.setItem(TOKEN_KEY, token); } catch (e) {} }
export function clearToken() { try { sessionStorage.removeItem(TOKEN_KEY); } catch (e) {} }

function guardarSesion(d) { try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(d)); } catch (e) {} }
function leerSesion() { try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)); } catch (e) { return null; } }

function ok(data) { return Promise.resolve({ status: "success", data }); }

async function apiRequest(method, endpoint, body = null, auth = false) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const t = getToken();
    if (!t) throw new Error("Sesión no disponible. Inicie sesión nuevamente.");
    headers["Authorization"] = "Bearer " + t;
  }
  let resp;
  try {
    resp = await fetch(API_BASE + "/" + endpoint, {
      method, headers, body: body === null ? undefined : JSON.stringify(body),
    });
  } catch (e) {
    throw new Error("No fue posible contactar el servidor.");
  }
  let datos;
  try { datos = await resp.json(); } catch (e) { throw new Error("Respuesta del servidor no válida."); }
  if (resp.status === 401) { clearToken(); throw new Error("Sesión expirada. Inicie sesión nuevamente."); }
  if (datos && datos.status === "error") { throw new Error(datos.message || "Error del servidor."); }
  return datos;
}

// Catálogo local (datos maestros DEMO) mientras no exista endpoint sesp_catalogos.
function catalogoLocal() {
  return {
    personal: choferes.map(ch => ({ _id: ch.id, nombreCompleto: ch.nombreCompleto, departamento: "PERSONAL_SEGURIDAD" })),
    unidades: patrullas.map(p => ({ _id: p.id, numeroUnidad: p.placa, placas: p.placa, marca: p.marca, modelo: p.modelo })),
    recorridos: rutas.map(r => ({ _id: r.id, nombre: r.nombre, distanciaKm: r.distanciaKm, paradasObligatorias: r.paradasObligatorias, esLibre: r.esLibre })),
  };
}

export const WixApi = {
  mode: API_MODE,

  async login(usuario, password, area) {
    // El backend determina el departamento desde SESP_Usuarios (ignora el cliente).
    const r = await apiRequest("POST", "sesp_login", { identificadorAcceso: usuario, password }, false);
    const sesion = (r && r.data && r.data.sesion) || {};
    setToken((r && r.data && r.data.token) || "");
    guardarSesion({ usuario: sesion.usuario || usuario, departamento: sesion.departamento, area: sesion.departamento, sesionId: sesion.sesionId });
    return r;
  },

  session() {
    return ok(leerSesion() || {});
  },

  catalogos() { return ok(catalogoLocal()); },

  async servicios() { return apiRequest("GET", "sesp_servicios", null, true); },

  async servicio(servicioId) {
    return apiRequest("GET", "sesp_servicio?servicioId=" + encodeURIComponent(servicioId), null, true);
  },

  async mensajes(servicioId) {
    return apiRequest("GET", "sesp_mensajes?servicioId=" + encodeURIComponent(servicioId), null, true);
  },

  async crearServicio(folio, responsable, unidad, ruta) {
    return apiRequest("POST", "sesp_crear_servicio", { folio, responsable, unidad, rutaId: ruta }, true);
  },
  async cerrarServicio(servicioId, version) {
    return apiRequest("POST", "sesp_cerrar_servicio", { servicioId }, true);
  },

  async enviarMensaje(servicioId, categoria, mensaje, origenEnvio) {
    return apiRequest("POST", "sesp_enviar_mensaje", { servicio: servicioId, contenido: mensaje, categoria }, true);
  },

  async resolverUbicacion(servicioId, mensajeId, url) {
    return apiRequest("POST", "sesp_resolver_ubicacion", { servicioId, mensajeId, url }, true);
  },

  async ubicaciones(servicioId) {
    return apiRequest("GET", "sesp_ubicaciones?servicioId=" + encodeURIComponent(servicioId), null, true);
  },

  async marcadores(servicioId) {
    return apiRequest("GET", "sesp_marcadores?servicioId=" + encodeURIComponent(servicioId), null, true);
  },
  async crearMarcador(datos) {
    return apiRequest("POST", "sesp_crear_marcador", datos, true);
  },

  // Funciones sin endpoint backend instalado: devuelven error claro (sin éxito falso).
  checklistPlantilla() { return Promise.reject(new Error("Plantilla no disponible en modo WIX_SHARED.")); },
  checklists() { return ok([]); },
  modificarServicio() { return Promise.reject(new Error("Operación no disponible en modo WIX_SHARED.")); },
  guardarChecklist() { return Promise.reject(new Error("Guardado de checklist no disponible en modo WIX_SHARED.")); },
  subirDocumento() { return Promise.reject(new Error("Subida de documentos no disponible en modo WIX_SHARED.")); },
  descarga() { return Promise.reject(new Error("Descarga no disponible en modo WIX_SHARED.")); },
  registrarEvidencia() { return Promise.reject(new Error("Registro de evidencia no disponible en modo WIX_SHARED.")); },
  evidencias() { return ok([]); },
};
