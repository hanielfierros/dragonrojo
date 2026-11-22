/* ============================================================
   SECURITYTRANS — FILE MANAGEMENT (lógica)

   Propósito:
     Gestión documental y operativa de servicios con Wix: login, catálogos,
     servicios, detalle con tarjeta de información, check de salida (46
     puntos), chat compartido estilo mensajería y cierre de servicio.

   Seguridad:
     - XSS: todo contenido del backend se renderiza con textContent.
     - Sin eval, sin credenciales hardcodeadas, sin console de secretos.
     - Token solo en sessionStorage.

   Restricciones:
     - La carga de documentos/fotos permanece deshabilitada (backend pendiente).
   ============================================================ */

import { WixApi, getToken, setToken, clearToken, API_MODE } from "./sesp-api.js";
import { emergencySettings } from "./sespate-config.js";

const SESSION_KEY = "sesp_session_data";
const AREAS = {
  ASIGNACIONES: { nombre: "Asignaciones", color: "#2563EB" },
  MANTENIMIENTO: { nombre: "Mantenimiento", color: "#7C3AED" },
  PERSONAL_SEGURIDAD: { nombre: "Personal de Seguridad", color: "#15803D" },
  DIRECCION_SEGURIDAD: { nombre: "Dirección de Seguridad", color: "#0891B2" },
};


// Compatibilidad histórica: los registros antiguos de ADMINISTRACION se muestran como AUDITORÍA.
const AREA_COMPAT = { ADMINISTRACION: "MANTENIMIENTO" };
function areaCanon(area) { const a = (area || "").toUpperCase(); return AREA_COMPAT[a] || a; }
function areaInfo(area) {
  const canon = areaCanon(area);
  return AREAS[canon] || { nombre: canon || "Sistema", color: "#64748B" };
}

const GRUPOS_FALLBACK = {
  PERSONAL: "Documentación personal",
  VEHICULAR: "Documentación vehicular",
  VEHICULO: "Inspección del vehículo",
  SEGURIDAD: "Material y equipo de seguridad",
};

// Plantilla DEMO del check de salida adaptada a patrullas de seguridad privada.
// La plantilla real (46 puntos) se carga desde el backend SESPATE (pendiente de integración).
const CHECKLIST_DEMO = [
  { grupoId: "PERSONAL", titulo: "Documentación personal", puntos: [
    { puntoId: "P01", descripcion: "Permiso de portación de arma" },
    { puntoId: "P02", descripcion: "Credencial vigente" },
    { puntoId: "P03", descripcion: "Licencia de conducir vigente" },
  ]},
  { grupoId: "VEHICULAR", titulo: "Documentación vehicular", puntos: [
    { puntoId: "V01", descripcion: "Tarjeta de circulación" },
    { puntoId: "V02", descripcion: "Póliza de seguro vigente" },
    { puntoId: "V03", descripcion: "Verificación vehicular" },
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

const ESTADOS_CHECK = ["PENDIENTE", "VERIFICADO", "ANOMALIA", "NO_APLICA"];
const TIPOS_SISTEMA = { CREACION: "Servicio creado", CAMBIO: "Actualización del servicio",
  CHECKLIST: "Check de salida registrado", CIERRE: "Servicio cerrado" };

const ETAPAS = [
  { id: "INICIO_TURNO", nombre: "Inicio de Turno" },
  { id: "INICIO_RECORRIDO", nombre: "Inicio de Recorrido" },
  { id: "FIN_RECORRIDO", nombre: "Fin de Recorrido" },
  { id: "ENTREGA_REPORTES", nombre: "Entrega de Reportes" },
  { id: "ENTREGA_UNIDAD", nombre: "Entrega de Unidad" },
  { id: "FIN_TURNO", nombre: "Fin de Turno" },
];

// ---------------------------------------------------------------------------
// Utilidades de sesión
// ---------------------------------------------------------------------------
function guardarSesion(d) { try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(d)); } catch (e) {} }
function leerSesion() { try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)); } catch (e) { return null; } }
function limpiarSesion() { clearToken(); try { sessionStorage.removeItem(SESSION_KEY); } catch (e) {} }
function $id(id) { return document.getElementById(id); }
function areaDesdeURL() { return new URLSearchParams(location.search).get("area") || ""; }

// ---------------------------------------------------------------------------
// Utilidades de texto / DOM (seguras)
// ---------------------------------------------------------------------------
function el(tag, cls, texto) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (texto !== undefined) e.textContent = texto;   // textContent: sin XSS
  return e;
}

// Convierte cualquier valor (cadena u objeto) a texto legible (nunca [object Object]).
function textoDe(v) {
  if (v === undefined || v === null) return "";
  if (typeof v === "string" || typeof v === "number") return String(v);
  if (typeof v === "object") {
    return v.title || v.nombre || v.nombreCompleto || v.name || v.descripcion
      || v.origen || v.destino || v.numeroUnidad || v.folio || "";
  }
  return String(v);
}

function iniciales(nombre) {
  const n = (nombre || "").toString().trim();
  if (!n) return "?";
  return n.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]).join("").toUpperCase();
}

function fechaHora(v) {
  if (!v) return "";
  try {
    return new Date(v).toLocaleString("es-MX", { timeZone: "America/Mexico_City",
      day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit",
      minute: "2-digit", second: "2-digit", hour12: false });
  } catch (e) { return String(v); }
}
function diaClave(v) {
  if (!v) return "";
  try {
    return new Date(v).toLocaleDateString("es-MX", { timeZone: "America/Mexico_City" });
  } catch (e) { return String(v); }
}
function horaCorta() { return new Date().toLocaleTimeString("es-MX", { hour12: false }); }

// Renderiza texto convirtiendo las URLs en enlaces seguros (sin innerHTML, sin XSS).
function renderCuerpoMensaje(contenedor, texto) {
  const t = texto || "";
  const regex = /(https?:\/\/[^\s<>]+)/g;
  let last = 0, m;
  while ((m = regex.exec(t)) !== null) {
    if (m.index > last) contenedor.appendChild(document.createTextNode(t.slice(last, m.index)));
    const a = document.createElement("a");
    a.href = m[1]; a.textContent = m[1]; a.target = "_blank"; a.rel = "noopener noreferrer";
    contenedor.appendChild(a);
    last = m.index + m[1].length;
  }
  if (last < t.length) contenedor.appendChild(document.createTextNode(t.slice(last)));
  else if (!t) contenedor.appendChild(document.createTextNode(""));
}

// Clasifica errores de login (no todo error HTTP 400 es contraseña).
function clasificarError(e) {
  const msg = (e && e.message) ? String(e.message) : "";
  if (/acceso demo|contrase|password|incorrect/i.test(msg)) return "Contraseña incorrecta. Verifique su acceso.";
  if (/sesi.n expirada|token|401|no autentic/i.test(msg)) return "Su sesión ha expirado. Inicie sesión nuevamente.";
  if (/contactar|conectar|servidor|fetch|red|network|cors|origin|failed|fall/i.test(msg)) return "No fue posible conectar con el servidor.";
  return msg || "No fue posible conectar con el servidor.";
}

// ===========================================================================
// LOGIN
// ===========================================================================
function flujoLogin() {
  const canon = areaCanon(areaDesdeURL());
  const info = areaInfo(canon);
  if (!AREAS[canon]) { const b = $id("LOGIN_ERROR"); b.textContent = "Área no reconocida."; b.hidden = false; return; }
  $id("AREA_TITLE").textContent = info.nombre;
  $id("AREA_SUB").textContent = "Área: " + canon;
  document.body.classList.add("fm-area-" + canon);
  $id("BTN_VOLVER").addEventListener("click", () => location.href = "./file-management.html");
  $id("BTN_INGRESAR").addEventListener("click", ingresar);

  async function ingresar() {
    const usuario = $id("USERNAME").value.trim();
    const passwordRaw = $id("PASSWORD").value;
    if (!usuario) { mostrarError("Ingrese su nombre de usuario."); return; }
    if (!passwordRaw || passwordRaw.trim() === "") { mostrarError("Ingrese su contraseña."); return; }
    $id("BTN_INGRESAR").disabled = true;
    $id("LOGIN_LOADING").hidden = false;
    $id("LOGIN_ERROR").hidden = true;
    try {
      const resp = await WixApi.login(usuario, passwordRaw, canon);
      const token = resp?.data?.token || resp?.token || resp?.data?.sessionToken;
      if (!token) { mostrarError("El servidor no devolvió un token de sesión."); return; }
      setToken(token);
      try { sessionStorage.setItem("sesp_usuario", usuario); } catch (e) {}
      location.href = "./file-panel.html";
    } catch (e) {
      mostrarError(clasificarError(e));
    } finally {
      $id("BTN_INGRESAR").disabled = false;
      $id("LOGIN_LOADING").hidden = true;
    }
  }
  function mostrarError(m) { const b = $id("LOGIN_ERROR"); b.textContent = m; b.hidden = false; }
}

// ===========================================================================
// PANEL
// ===========================================================================
let sesion = null;
let servicioIdActual = null;
let versionActual = 1;
let timer = null;
let cargandoMensajes = false;
let esMovil = () => window.innerWidth <= 900;
const vistos = new Map();  // servicioId -> Set(mensajeId)
let adjunto = null;        // { file, objectUrl, nombreArchivo, tipoArchivo, base64 }
let enviando = false;      // evita envíos concurrentes
let visorUrl = null;       // URL del adjunto abierto en el visor
let visorNombre = null;    // nombre del adjunto abierto en el visor
let visorZoom = 1;
let mensajesActuales = []; // últimos mensajes del servicio (para el panel de documentos)

function flujoPanel() {
  if (!getToken()) { location.href = "./file-management.html"; return; }
  (async () => {
    try { sesion = (await WixApi.session())?.data || {}; guardarSesion(sesion); }
    catch (e) { sesion = leerSesion(); if (!sesion) { limpiarSesion(); location.href = "./file-management.html"; return; } }
    const area = areaCanon(sesion.area || areaDesdeURL() || "");
    let usuarioLocal = null; try { usuarioLocal = sessionStorage.getItem("sesp_usuario"); } catch (e) {}
    sesion.usuario = sesion.usuario || sesion.nombre || sesion.user || usuarioLocal || "—";
    document.body.classList.add("fm-area-" + area);
    $id("TOP_AREA").textContent = areaInfo(area).nombre;
    $id("TOP_USER").textContent = sesion.usuario;
    $id("BTN_LOGOUT").addEventListener("click", cerrarSesion);
    $id("BTN_ENVIAR").addEventListener("click", enviarMensaje);
    $id("MENSAJE").addEventListener("keydown", onTeclaMensaje);
    $id("BTN_ADJUNTAR").addEventListener("click", () => { $id("FILE_INPUT").removeAttribute("capture"); $id("FILE_INPUT").click(); });
    if (area === "PERSONAL_SEGURIDAD") {
      $id("BTN_CAMARA").addEventListener("click", abrirCamara);
      configurarCamara();
    } else {
      $id("BTN_CAMARA").hidden = true;
    }
    $id("FILE_INPUT").addEventListener("change", (e) => seleccionarAdjunto(e.target.files && e.target.files[0]));
    configurarVisor();
    document.addEventListener("click", manejarBotonesMoviles);
    poblarCategorias();
    configurarMapa();
    configurarEmergencia();
    marcarModoDemo();
    await cargarCatalogosYServicios(area);
    iniciarPolling(area);
  })();
}

function cerrarSesion() { detenerPolling(); limpiarSesion(); location.href = "./file-management.html"; }

function manejarBotonesMoviles(e) {
  const t = e.target.closest("[data-accion]"); if (!t) return;
  const accion = t.dataset.accion;
  if (accion === "chat") {
    if (esMovil()) { $id("PANEL").classList.add("hidden-mobile"); $id("CHAT").classList.remove("hidden-mobile"); }
    $id("CHAT").scrollIntoView({ behavior: "smooth" });
  } else if (accion === "panel") {
    if (esMovil()) { $id("CHAT").classList.add("hidden-mobile"); $id("PANEL").classList.remove("hidden-mobile"); }
    $id("PANEL").scrollIntoView({ behavior: "smooth" });
  }
}

const CATEGORIAS_CHAT = {
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

function poblarCategorias() {
  const sel = $id("CATEGORIA");
  // DEMO local: los nuevos tipos de mensaje aún no existen en el backend Wix.
  const area = areaCanon(sesion?.area || "");
  const cats = CATEGORIAS_CHAT[area] || sesion?.categorias || ["Mensaje General"];
  sel.innerHTML = "";
  (Array.isArray(cats) ? cats : []).forEach(c => {
    sel.appendChild(new Option(c, c));
  });
}

// ===========================================================================
// Timeline de progreso del servicio (solo local, sin Backend)
// ===========================================================================
function claveTimeline() {
  const u = sesion?.usuario || "anonimo";
  return "securitytrans:fm:timeline:v1:" + servicioIdActual + ":" + (sesion?.area || "") + ":" + u;
}

function leerEtapas() {
  try {
    const raw = localStorage.getItem(claveTimeline());
    if (raw) { const d = JSON.parse(raw); if (d && d.etapas) return d.etapas; }
  } catch (e) { /* dato corrupto: se recupera el valor por defecto */ }
  // Por defecto: "Alta de servicio" ya está completada (el servicio existe).
  return { INICIO_TURNO: true, INICIO_RECORRIDO: false, FIN_RECORRIDO: false, ENTREGA_REPORTES: false, ENTREGA_UNIDAD: false, FIN_TURNO: false };
}

function guardarEtapas(etapas) {
  try {
    localStorage.setItem(claveTimeline(), JSON.stringify({ version: 1, etapas, actualizadoLocal: new Date().toISOString() }));
  } catch (e) { /* degradación a memoria (sin persistencia) */ }
}

function renderTimeline(soloLectura) {
  const cont = $id("TIMELINE"); if (!cont) return;
  cont.innerHTML = "";
  if (!servicioIdActual) { cont.hidden = true; return; }
  cont.hidden = false;
  cont.dataset.readonly = soloLectura ? "1" : "0";
  const etapas = leerEtapas();

  const track = el("div", "fm-timeline-track");
  ETAPAS.forEach(et => {
    const completado = !!etapas[et.id];
    const step = el("div", "fm-step" + (completado ? " completado" : ""));
    step.dataset.etapa = et.id;
    const btn = el("button", "dot", completado ? "✓" : "");
    btn.type = "button";
    btn.setAttribute("aria-pressed", String(completado));
    btn.setAttribute("aria-label", et.nombre + (completado ? " (completada)" : " (pendiente)"));
    btn.title = et.nombre;
    if (soloLectura) {
      btn.disabled = true;
    } else {
      btn.addEventListener("click", () => {
        const e2 = leerEtapas();
        e2[et.id] = !e2[et.id];
        guardarEtapas(e2);
        renderTimeline(false);  // solo re-renderiza el Timeline (no toca el Backend)
      });
    }
    step.appendChild(btn);
    step.appendChild(el("span", "label", et.nombre));
    track.appendChild(step);
  });
  cont.appendChild(track);

  const completadas = ETAPAS.filter(et => etapas[et.id]).length;
  const pct = Math.round(completadas / 6 * 100);
  const info = el("div", "fm-timeline-info");
  info.appendChild(el("span", "", "Progreso del servicio · " + completadas + " de 6 etapas"));
  info.appendChild(el("span", "pct", pct + "% completado"));
  cont.appendChild(info);
  cont.appendChild(el("div", "fm-timeline-note", "Seguimiento local — Las marcaciones se guardan únicamente en este navegador."));
}

// ---------------------------------------------------------------------------
// Catálogos y servicios
// ---------------------------------------------------------------------------
let catalogo = { personal: [], unidades: [], recorridos: [] };

async function cargarCatalogosYServicios(area) {
  $id("PANEL_CONTENT").innerHTML = "";
  try { const c = await WixApi.catalogos(); catalogo = normalizarCatalogo(c?.data); } catch (e) { catalogo = { personal: [], unidades: [], recorridos: [] }; }
  const servicios = await obtenerServicios();
  renderPanel(area, servicios);
}

function normalizarCatalogo(d) {
  d = d || {};
  return {
    personal: d.personal || d.conductores || [],
    unidades: d.unidades || d.vehiculos || [],
    recorridos: d.recorridos || d.rutas || [],
  };
}

async function obtenerServicios() {
  try { const r = await WixApi.servicios(); return Array.isArray(r?.data) ? r.data : (r?.data?.servicios || []); }
  catch (e) { return []; }
}

function renderPanel(area, servicios) {
  const cont = $id("PANEL_CONTENT");
  cont.innerHTML = "";

  if (area === "ASIGNACIONES") cont.appendChild(cardCrearServicio());

  cont.appendChild(cardServicioSeleccionado(area));
  if (area === "PERSONAL_SEGURIDAD") cont.appendChild(cardChecklist());
  cont.appendChild(cardDocumentos());
  cont.appendChild(cardServicios(area, servicios));

  const btnChat = el("button", "fm-btn primary", "Abrir chat");
  btnChat.dataset.accion = "chat";
  btnChat.style.marginTop = "12px";
  cont.appendChild(btnChat);
}

// --- AJ-06: Crear servicio ---
function cardCrearServicio() {
  const card = el("div", "fm-card");
  card.appendChild(el("h3", "", "Crear servicio"));

  const folio = campo("Folio del servicio", "input", "text");
  const responsable = campo("Responsable", "select");
  const unidad = campo("Unidad", "select");
  const ruta = campo("Ruta", "select");

  llenarSelect(responsable.input, catalogo.personal, "_id");
  llenarSelect(unidad.input, catalogo.unidades, "_id");
  llenarSelect(ruta.input, catalogo.recorridos, "_id");
  
  const msg = el("p", "fm-error", ""); msg.hidden = true;
  const btn = el("button", "fm-btn primary", "Crear servicio");
  btn.addEventListener("click", async () => {
    const f = folio.input.value.trim();
    if (!f) { msg.textContent = "Ingrese el folio del servicio."; msg.hidden = false; return; }
    if (!responsable.input.value || !unidad.input.value || !ruta.input.value) {
      msg.textContent = "Seleccione responsable, unidad y ruta."; msg.hidden = false; return;
    }
    btn.disabled = true; btn.textContent = "Creando…"; msg.hidden = true;
    try {
      const resp = await WixApi.crearServicio(f, responsable.input.value, unidad.input.value, ruta.input.value);
      const sid = resp?.data?.servicioId || resp?.data?.id || resp?.data?._id;
      if (!sid) throw new Error("No se recibió el identificador del servicio.");
      // limpiar y refrescar
      folio.input.value = ""; responsable.input.value = ""; unidad.input.value = ""; ruta.input.value = "";
      msg.textContent = "Servicio creado correctamente."; msg.hidden = false; msg.style.color = "var(--fm-success)";
      await seleccionarServicio(sid);
      await refrescarServicios();
    } catch (e) {
      msg.textContent = "No fue posible confirmar el resultado. Consulte el servicio antes de intentar nuevamente.";
      msg.hidden = false; msg.style.color = "var(--fm-danger)";
      await refrescarServicios();
    } finally { btn.disabled = false; btn.textContent = "Crear servicio"; }
  });

  card.append(folio.wrap, responsable.wrap, unidad.wrap, ruta.wrap, msg, btn);
  return card;
}

function campo(label, tipo, tipoInput) {
  const wrap = el("div", "fm-field");
  const l = el("label", "", label);
  const input = el(tipo, "", "");
  if (tipoInput) input.type = tipoInput;
  wrap.append(l, input);
  return { wrap, input };
}

function llenarSelect(sel, items, idKey) {
  sel.appendChild(new Option("— seleccione —", ""));
  (Array.isArray(items) ? items : []).forEach(it => {
    const id = it[idKey] || it.id || it._id || "";
    const nombre = textoDe(it) || id;
    sel.appendChild(new Option(nombre, id));
  });
}

// --- AJ-02..05: Tarjeta de servicio seleccionado ---
function cardServicioSeleccionado(area) {
  const card = el("div", "fm-card");
  card.appendChild(el("h3", "", "Servicio seleccionado"));
  const body = el("div", "fm-empty", "Seleccione un servicio para ver su detalle.");
  body.id = "SERVICIO_DETALLE";
  card.appendChild(body);
  return card;
}

async function seleccionarServicio(sid) {
  servicioIdActual = sid;
  vistos.set(sid, vistos.get(sid) || new Set());
  try {
    const resp = await WixApi.servicio(sid);
    const d = resp?.data || {};
    versionActual = d.version || d.Version || d.servicio?.version || 1;
    renderInfoCard(d);
    const estado = textoDe(d.estado || d.servicio?.estado || "").toUpperCase();
    folioActual = textoDe(d.folio || d.servicio?.folio) || "";
    $id("TOP_FOLIO").textContent = "Folio: " + (folioActual || sid);
    $id("TOP_STATUS").textContent = estado || "";
    actualizarChatHeader(d);
    actualizarModoLectura(estado === "CERRADO");
    renderTimeline(estado === "CERRADO");
    iniciarMapa();
    resetearMapa();
    if (sesion.area === "PERSONAL_SEGURIDAD") await cargarChecklist();
    await cargarMensajes();
  } catch (e) { $id("SERVICIO_DETALLE").textContent = e.message; }
}

function renderInfoCard(d) {
  const cont = $id("SERVICIO_DETALLE"); if (!cont) return;
  cont.innerHTML = "";
  const s = d.servicio || d;

  // Cabecera del servicio
  const head = el("div", "fm-service-head");
  const folio = el("span", "folio", textoDe(s.folio) || "—");
  const estado = textoDe(s.estado || "").toUpperCase();
  const chip = el("span", "estado fm-estado-" + estado, estado || "—");
  head.append(folio, chip);
  cont.appendChild(head);

  const meta = el("div", "fm-service-meta");
  meta.textContent = "Creado: " + fechaHora(s.fechaCreacion || s.createdAt)
    + (s.creadoPor ? " · Por: " + textoDe(s.creadoPor) : "")
    + (s.fechaCierre ? " · Cierre: " + fechaHora(s.fechaCierre) : "")
    + (s.cerradoPor ? " · Por: " + textoDe(s.cerradoPor) : "");
  cont.appendChild(meta);

  const grid = el("div", "fm-info-grid");

  // Operador
  const responsable = d.responsable || s.responsable || {};
  grid.appendChild(bloqueInfo("👮", textoDe(responsable) || "Responsable",
    ["Nombre: " + textoDe(responsable.nombreCompleto || responsable._id || "No disponible"),
     "Departamento: " + textoDe(responsable.departamento || "No disponible")]));

  // Vehículo
  const unidad = d.unidad || s.unidad || {};
  grid.appendChild(bloqueInfo("🚓", textoDe(unidad) || "Unidad",
    ["Unidad: " + textoDe(unidad.numeroUnidad || unidad._id || "No disponible"),
     "Placas: " + textoDe(unidad.placas || "No disponible"),
     "Marca/Modelo: " + textoDe(unidad.marca || "") + " " + textoDe(unidad.modelo || "")]));

  cont.appendChild(grid);

  // Cierre (solo ASIGNACIONES, servicio abierto)
  if (sesion.area === "ASIGNACIONES" && (estado !== "CERRADO")) {
    const btn = el("button", "fm-btn", "Cerrar servicio");
    btn.style.cssText = "margin-top:14px;color:var(--fm-danger);border-color:var(--fm-danger)";
    btn.addEventListener("click", () => confirmarCierre(sid, s));
    cont.appendChild(btn);
  }
  if (estado === "CERRADO") {
    cont.appendChild(el("div", "fm-readonly", "Servicio cerrado · Solo lectura"));
  }
}

function bloqueInfo(icono, nombre, detalles) {
  const b = el("div", "fm-info-block");
  b.appendChild(el("span", "ico", icono));
  const d = el("div", "datos");
  d.appendChild(el("div", "nombre", nombre));
  detalles.forEach(t => d.appendChild(el("div", "detalle", t)));
  b.appendChild(d);
  return b;
}

async function confirmarCierre(sid, s) {
  const ok = confirm("Al cerrar este servicio, ninguna de las áreas podrá agregar información, modificar datos ni enviar mensajes. Esta acción no puede revertirse.");
  if (!ok) return;
  try {
    await WixApi.cerrarServicio(sid, versionActual);
    await seleccionarServicio(sid);
    await refrescarServicios();
  } catch (e) {
    alert("No fue posible confirmar el resultado. Consulte el servicio antes de intentar nuevamente.\n" + e.message);
  }
}

// --- Documentos del servicio (panel) ---
function cardDocumentos() {
  const card = el("div", "fm-card");
  card.appendChild(el("h3", "", "Documentos del servicio"));
  const body = el("div", "fm-empty", "Seleccione un servicio para ver sus documentos.");
  body.id = "DOCUMENTOS";
  card.appendChild(body);
  return card;
}

function renderDocumentos(lista) {
  const cont = $id("DOCUMENTOS"); if (!cont) return;
  const docs = (Array.isArray(lista) ? lista : []).filter(m => m.tieneArchivo);
  cont.innerHTML = "";
  if (!docs.length) { cont.appendChild(el("div", "fm-empty", "Sin documentos en este servicio.")); return; }
  const grid = el("div", "fm-docs-grid");
  docs.forEach(m => {
    const fila = el("div", "fm-doc-row");
    fila.appendChild(el("span", "ico", (m.tipoArchivo || "").toLowerCase() === "application/pdf" ? "📄" : "🖼️"));
    const datos = el("div", "datos");
    datos.appendChild(el("div", "nombre", m.nombreArchivo || "documento"));
    datos.appendChild(el("div", "meta", textoDe(m.categoria || "") + " · " + textoDe(m.usuario || "") + " · " + fechaHora(m.fechaEnvio) + " · " + formatoTamano(m.tamanoArchivo)));
    fila.appendChild(datos);
    const acc = el("div", "acciones");
    const bVer = el("button", "", "Ver"); bVer.addEventListener("click", () => verAdjunto(m));
    const bDes = el("button", "", "Descargar"); bDes.addEventListener("click", () => descargarAdjunto(m));
    acc.append(bVer, bDes);
    fila.appendChild(acc);
    grid.appendChild(fila);
  });
  cont.appendChild(grid);
}

// --- AJ-07..10: Lista de servicios ---
function cardServicios(area, servicios) {
  const card = el("div", "fm-card");
  card.appendChild(el("h3", "", "Servicios registrados"));

  const filtros = el("div", "fm-filtros");
  const buscar = el("input", "", ""); buscar.type = "search"; buscar.placeholder = "Buscar folio u operador…";
  const estSel = el("select", "", "");
  ["Todos", "Abiertos", "Cerrados"].forEach(o => estSel.appendChild(new Option(o, o)));
  filtros.append(buscar, estSel);
  card.appendChild(filtros);

  const resumen = el("div", "fm-progress", "");
  const tabla = el("div", "table-wrap");
  const tbl = el("table", "fm-table");
  tabla.appendChild(tbl);
  card.appendChild(resumen); card.appendChild(tabla);

  const render = () => {
    const term = buscar.value.toLowerCase();
    const fEstado = estSel.value;
    const lista = (Array.isArray(servicios) ? servicios : [])
      .filter(s => !term || (textoDe(s.folio).toLowerCase().includes(term) || textoDe(s.responsable).toLowerCase().includes(term)))
      .filter(s => {
        const e = textoDe(s.estado).toUpperCase();
        if (fEstado === "Abiertos") return e === "ABIERTO";
        if (fEstado === "Cerrados") return e === "CERRADO";
        return true;
      });
    const abiertos = lista.filter(s => textoDe(s.estado).toUpperCase() === "ABIERTO").length;
    const cerrados = lista.length - abiertos;
    resumen.textContent = `Abiertos: ${abiertos} · Cerrados: ${cerrados} · Total: ${lista.length}`;

    tbl.innerHTML = "";
    const th = el("tr");
    ["Folio", "Responsable", "Unidad", "Estado", "Creación", ""].forEach(h => th.appendChild(el("th", "", h)));
    tbl.appendChild(th);
    lista.forEach(s => {
      const tr = el("tr");
      tr.appendChild(td(textoDe(s.folio) || s._id || ""));
      tr.appendChild(td(textoDe(s.responsable) || ""));
      tr.appendChild(td(textoDe(s.unidad) || ""));
      tr.appendChild(td(textoDe(s.estado) || ""));
      tr.appendChild(td(fechaHora(s.fechaCreacion || s.createdAt)));
      const tacc = el("td");
      const b = el("button", "fm-btn", "Ver detalle");
      b.addEventListener("click", () => seleccionarServicio(s.servicioId || s.id || s._id));
      tacc.appendChild(b);
      tr.appendChild(tacc);
      tbl.appendChild(tr);
    });
  };
  buscar.addEventListener("input", render);
  estSel.addEventListener("change", render);
  render();
  return card;
}
function td(t) { const d = el("td", "", ""); d.textContent = t === undefined || t === null ? "" : String(t); return d; }

// --- AJ-01: Checklist (46 puntos, 6 grupos) ---
function cardChecklist() {
  const card = el("div", "fm-card");
  card.appendChild(el("h3", "", "Check de salida"));
  const body = el("div", "fm-empty", "Seleccione un servicio para cargar su check de salida.");
  body.id = "CHECKLIST";
  card.appendChild(body);
  return card;
}

async function cargarChecklist() {
  const cont = $id("CHECKLIST"); if (!cont) return;
  cont.innerHTML = "";
  try {
    const r = await WixApi.checklistPlantilla();
    const plantilla = normalizarPlantilla(r?.data);
    renderChecklist(cont, plantilla);
  } catch (e) {
    // DEMO local: plantilla adaptada mientras el backend Wix no esté disponible.
    renderChecklist(cont, CHECKLIST_DEMO);
  }
}

function normalizarPlantilla(d) {
  if (!d) return [];
  if (Array.isArray(d)) return d;                       // grupos o items
  if (Array.isArray(d.grupos)) return d.grupos;
  if (Array.isArray(d.items)) return d.items;
  if (Array.isArray(d.puntos)) return d.puntos;
  if (Array.isArray(d.data)) return d.data;
  return [];
}

function renderChecklist(cont, plantilla) {
  // Determinar si es estructura de grupos o plana
  const esGrupos = plantilla.some(g => g && Array.isArray(g.puntos));
  let grupos;
  if (esGrupos) {
    grupos = plantilla.map(g => ({ grupoId: g.grupoId, titulo: g.titulo || GRUPOS_FALLBACK[g.grupoId] || "Grupo", puntos: g.puntos || [] }));
  } else {
    // plana: agrupar por grupoId o un solo grupo
    const porGrupo = {};
    plantilla.forEach(it => {
      const g = it.grupoId || it.grupo || "GENERAL";
      (porGrupo[g] = porGrupo[g] || []).push(it);
    });
    grupos = Object.keys(porGrupo).map(g => ({ grupoId: g, titulo: GRUPOS_FALLBACK[g] || g, puntos: porGrupo[g] }));
  }

  const total = grupos.reduce((a, g) => a + g.puntos.length, 0);
  const estados = new Map();

  // Barra de progreso global
  const prog = el("div", "fm-progress", "");
  const barra = el("div", "fm-progress-bar"); barra.appendChild(el("div"));
  cont.append(prog, barra);

  const actualizar = () => {
    const n = estados.size;
    const v = [...estados.values()].filter(x => x === "VERIFICADO").length;
    const p = [...estados.values()].filter(x => x === "PENDIENTE").length;
    const a = [...estados.values()].filter(x => x === "ANOMALIA").length;
    const na = [...estados.values()].filter(x => x === "NO_APLICA").length;
    const respondidos = n - p;
    prog.textContent = `Total: ${n} · Respondidos: ${respondidos} · Sin responder: ${p} · Verificados: ${v} · Pendientes: ${p} · Anomalías: ${a} · No aplica: ${na} · Avance: ${n ? Math.round(respondidos / n * 100) : 0}%`;
    barra.firstChild.style.width = (n ? respondidos / n * 100 : 0) + "%";
    // actualizar progreso por grupo
    document.querySelectorAll("[data-grupo]").forEach(det => {
      const gid = det.dataset.grupo;
      const pts = det.querySelectorAll("select").length;
      const vs = [...det.querySelectorAll("select")].filter(s => s.value === "VERIFICADO").length;
      const pdot = det.querySelector(".prog");
      if (pdot) pdot.textContent = `${vs}/${pts}`;
    });
  };

  grupos.forEach(g => {
    const det = el("details", "fm-check-grupo");
    det.dataset.grupo = g.grupoId;
    const sum = el("summary");
    sum.appendChild(el("span", "", g.titulo));
    sum.appendChild(el("span", "prog", `0/${g.puntos.length}`));
    det.appendChild(sum);
    (g.puntos || []).forEach(p => {
      const id = p.puntoId || p.id || p._id || Math.random().toString(36);
      estados.set(id, "PENDIENTE");
      const fila = el("div", "fm-check-item");
      fila.appendChild(el("span", "desc", p.descripcion || p.nombre || p.item || ""));
      const sel = el("select");
      ESTADOS_CHECK.forEach(e => sel.appendChild(new Option(e, e)));
      sel.value = "PENDIENTE";
      const obs = el("input", "obs", ""); obs.type = "text"; obs.placeholder = "Observaciones (obligatoria para Anomalía y No aplica)";
      sel.addEventListener("change", () => {
        estados.set(id, sel.value);
        obs.required = (sel.value === "ANOMALIA" || sel.value === "NO_APLICA");
        actualizar();
      });
      fila.append(sel, obs);
      det.appendChild(fila);
    });
    cont.appendChild(det);
  });

  const btn = el("button", "fm-btn primary", "Enviar checklist");
  btn.style.marginTop = "14px";
  btn.addEventListener("click", async () => {
    if (!servicioIdActual) { alert("Seleccione un servicio primero."); return; }
    // validar ANOMALIA/NO_APLICA con observación
    for (const fila of cont.querySelectorAll(".fm-check-item")) {
      const sel = fila.querySelector("select");
      const obs = fila.querySelector(".obs");
      if ((sel.value === "ANOMALIA" || sel.value === "NO_APLICA") && !obs.value.trim()) {
        alert("Los puntos en Anomalía o No aplica requieren una observación.");
        obs.focus(); return;
      }
    }
    const items = [...estados.entries()].map(([id, est]) => {
      const fila = [...cont.querySelectorAll(".fm-check-item")].find(f => f.querySelector("select") && estados.get(id));
      const obs = fila ? fila.querySelector(".obs").value : "";
      return { puntoId: id, estado: est, observacion: obs };
    });
    btn.disabled = true;
    try {
      await WixApi.guardarChecklist(servicioIdActual, versionActual, items);
      alert("Checklist enviado correctamente.");
      await seleccionarServicio(servicioIdActual);
    } catch (e) {
      alert("No fue posible confirmar el resultado. Consulte el servicio antes de intentar nuevamente.\n" + e.message);
    } finally { btn.disabled = false; }
  });
  cont.appendChild(btn);
  actualizar();
}

async function refrescarServicios() {
  const servicios = await obtenerServicios();
  // re-render solo la tarjeta de servicios
  const cont = $id("PANEL_CONTENT");
  const nueva = cardServicios(sesion.area, servicios);
  const existente = [...cont.children].find(c => c.querySelector && c.querySelector("h3") && c.querySelector("h3").textContent === "Servicios registrados");
  if (existente) cont.replaceChild(nueva, existente);
}

// ---------------------------------------------------------------------------
// AJ-12: Chat compartido
// ---------------------------------------------------------------------------
function actualizarChatHeader(d) {
  const s = d.servicio || d;
  $id("CHAT_TITULO").textContent = "Folio: " + (textoDe(s.folio) || servicioIdActual || "—");
  $id("CHAT_SUB").textContent = textoDe(s.nombreServicio) || textoDe(s.tipoServicio) || "";
  const estado = textoDe(s.estado || "").toUpperCase();
  $id("CHAT_ESTADO").textContent = estado || "";
  $id("CHAT_AVATAR").textContent = iniciales(textoDe(s.folio) || "S");
}

function actualizarModoLectura(cerrado) {
  $id("COMPOSER").hidden = cerrado;
  $id("READONLY_BANNER").hidden = !cerrado;
  if (cerrado) $id("CHAT_EMPTY").textContent = "Servicio cerrado. Consulta disponible en modo de solo lectura.";
}

async function cargarMensajes() {
  if (!servicioIdActual || cargandoMensajes) return;
  cargandoMensajes = true;
  try {
    const r = await WixApi.mensajes(servicioIdActual);
    const lista = Array.isArray(r?.data) ? r.data : (r?.data?.mensajes || []);
    mensajesActuales = lista;
    renderMensajes(lista);
    renderDocumentos(lista);
    procesarUbicaciones(lista);
    renderProtocolo();
    renderCronologico();
    $id("CHAT_STATUS").textContent = "Sincronizado " + horaCorta();
  } catch (e) {
    $id("CHAT_STATUS").textContent = "Sin conexión";
  } finally { cargandoMensajes = false; }
}

function renderMensajes(lista) {
  const cont = $id("MESSAGES"); if (!cont) return;
  const set = vistos.get(servicioIdActual) || new Set();
  const nuevos = [];
  lista.forEach(m => {
    const id = m.mensajeId || m.id || m._id || "";
    if (id && set.has(id)) return;
    if (id) set.add(id);
    nuevos.push(m);
  });
  vistos.set(servicioIdActual, set);

  let ultimoDia = cont.dataset.ultimoDia || "";
  nuevos.forEach(m => {
    const dia = diaClave(m.fecha || m.fechaServidor || m.fechaEnvio);
    if (dia && dia !== ultimoDia) {
      cont.appendChild(sepDia(dia));
      ultimoDia = dia;
    }
    cont.appendChild(renderMensaje(m));
  });
  cont.dataset.ultimoDia = ultimoDia;

  // autoscroll solo si estaba abajo
  const cercaDeAbajo = cont.scrollHeight - cont.scrollTop - cont.clientHeight < 160;
  if (nuevos.length && (cercaDeAbajo || !cont.dataset.scrolled)) {
    cont.scrollTop = cont.scrollHeight;
    cont.dataset.scrolled = "1";
  }
  if (!lista.length && cont.children.length === 0) {
    cont.appendChild(el("div", "fm-empty", "No hay mensajes en este servicio."));
  }
}

function sepDia(dia) {
  const d = el("div", "fm-date-sep");
  d.appendChild(el("span", "", dia));
  return d;
}

function renderMensaje(m) {
  const tipo = (m.tipo || m.recordType || m.tipoRegistro || "MENSAJE").toUpperCase();
  const area = areaCanon(m.area || m.departamento || m.Area || "SISTEMA");
  const esSistema = TIPOS_SISTEMA[tipo] !== undefined;
  const autor = esSistema ? "Sistema" : (m.autorVisible || areaInfo(area).nombre);
  const propio = !esSistema && area === areaCanon(sesion?.area || sesion?.departamento || "");

  const msg = el("div", "fm-msg fm-area-" + area);
  if (esSistema) msg.classList.add("sistema");
  if (propio) msg.classList.add("own");

  if (!esSistema) {
    const av = el("span", "avatar", iniciales(autor));
    msg.appendChild(av);
  }

  const bubble = el("div", "fm-bubble");
  const meta = el("div", "meta");
  if (!esSistema) {
    meta.appendChild(el("span", "area", autor));
    if (m.categoria) meta.appendChild(el("span", "", "· " + textoDe(m.categoria)));
  }
  meta.appendChild(el("span", "", fechaHora(m.fecha || m.fechaServidor || m.fechaEnvio)));
  bubble.appendChild(meta);

  const cuerpo = el("div", "cuerpo");
  const textoMensaje = textoDe(m.mensaje || m.contenido || m.texto || "");
  if (esSistema) {
    cuerpo.textContent = TIPOS_SISTEMA[tipo] + " — " + textoMensaje;
  } else {
    renderCuerpoMensaje(cuerpo, textoMensaje);
  }
  bubble.appendChild(cuerpo);
  if (m.tieneArchivo) renderAdjunto(m, bubble);

  // Chip de ubicación para mensajes "Mensaje General" con enlace de Google Maps.
  if (!esSistema && esMensajeGeneral(m.categoria) && enlacesGoogle(textoMensaje).length) {
    const chip = el("div", "fm-ubicacion-chip");
    chip.appendChild(el("span", "", "Identificando ubicación…"));
    bubble.appendChild(chip);
    const mensajeId = m.mensajeId || m.id || m._id || "";
    mapaChips.set(mensajeId, chip);
  }

  msg.appendChild(bubble);
  return msg;
}

function onTeclaMensaje(e) {
  // Enter envía (sin Shift); Shift+Enter salto de línea. En móvil, Enter = salto de línea.
  if (e.key === "Enter" && !e.shiftKey && !esMovil()) {
    e.preventDefault();
    enviarMensaje();
  }
}

// ===========================================================================
// ADJUNTOS (documentos e imágenes) — integración con Wix
// ===========================================================================
const MIMES_OK = { "application/pdf": true, "image/jpeg": true, "image/png": true };
const EXTS_OK = ["pdf", "jpg", "jpeg", "png"];
const MAX_BYTES = 10485760; // 10 MiB
const cacheDescarga = new Map(); // mensajeId -> URL autorizada

function extensionDe(file) { return (file.name.split(".").pop() || "").toLowerCase(); }

function mimeDeArchivo(file) {
  if (file.type && MIMES_OK[file.type]) return file.type;
  const ext = extensionDe(file);
  if (ext === "pdf") return "application/pdf";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  return "";
}

function formatoTamano(bytes) {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
}

function esHttps(url) {
  try { const p = new URL(url).protocol; return p === "https:" || p === "blob:"; } catch (e) { return false; }
}

function leerDataUrl(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(file);
  });
}

function validarArchivo(file) {
  const ext = extensionDe(file);
  const mime = mimeDeArchivo(file);
  if (!EXTS_OK.includes(ext) || !mime) return "Formato no permitido. Use PDF, JPG, JPEG o PNG.";
  if (file.size === 0) return "El archivo está vacío.";
  if (file.size > MAX_BYTES) return "El archivo supera el límite de 10 MiB.";
  if (file.name.length > 255) return "El nombre del archivo es demasiado largo.";
  return null;
}

async function seleccionarAdjunto(file) {
  $id("FILE_INPUT").value = "";
  if (!file) return;
  const error = validarArchivo(file);
  if (error) { $id("CHAT_STATUS").textContent = error; return; }
  let base64 = "";
  try { base64 = (await leerDataUrl(file)).split(",")[1] || ""; }
  catch (e) { $id("CHAT_STATUS").textContent = "No se pudo leer el archivo."; return; }
  limpiarAdjunto();
  adjunto = { file, objectUrl: URL.createObjectURL(file), nombreArchivo: file.name, tipoArchivo: mimeDeArchivo(file), base64 };
  renderPreviewAdjunto();
  $id("ATTACH_PREVIEW").hidden = false;
  $id("CHAT_STATUS").textContent = "";
}

function renderPreviewAdjunto() {
  const cont = $id("ATTACH_PREVIEW"); if (!cont || !adjunto) return;
  cont.innerHTML = "";
  const chip = el("div", "fm-attach-chip");
  if (adjunto.tipoArchivo === "application/pdf") {
    chip.appendChild(el("span", "pdfico", "PDF"));
    const bPrev = el("button", "fm-btn", "Vista previa");
    bPrev.addEventListener("click", () => abrirVisor({ nombreArchivo: adjunto.nombreArchivo, url: adjunto.objectUrl, tipoArchivo: adjunto.tipoArchivo }));
    chip.appendChild(bPrev);
  } else {
    const img = document.createElement("img");
    img.className = "thumb"; img.src = adjunto.objectUrl; img.alt = adjunto.nombreArchivo;
    chip.appendChild(img);
  }
  const datos = el("div", "datos");
  datos.appendChild(el("div", "nombre", adjunto.nombreArchivo));
  datos.appendChild(el("div", "tamano", formatoTamano(adjunto.file.size)));
  chip.appendChild(datos);
  const cancel = el("button", "fm-btn", "✕");
  cancel.title = "Quitar adjunto"; cancel.setAttribute("aria-label", "Quitar adjunto");
  cancel.addEventListener("click", limpiarAdjunto);
  chip.appendChild(cancel);
  cont.appendChild(chip);
}

function limpiarAdjunto() {
  if (adjunto && adjunto.objectUrl) URL.revokeObjectURL(adjunto.objectUrl);
  adjunto = null;
  const cont = $id("ATTACH_PREVIEW"); if (cont) cont.hidden = true;
}

// Visor de imagen y PDF
function configurarVisor() {
  $id("VIEWER_CLOSE").addEventListener("click", cerrarVisor);
  $id("VIEWER_DOWNLOAD").addEventListener("click", () => { if (visorUrl) descargarUrl(visorUrl, visorNombre || "documento"); });
  $id("VIEWER_OPEN").addEventListener("click", () => { if (visorUrl) window.open(visorUrl, "_blank", "noopener,noreferrer"); });
  $id("VIEWER_ZOOM_IN").addEventListener("click", () => zoomVisor(1.25));
  $id("VIEWER_ZOOM_OUT").addEventListener("click", () => zoomVisor(0.8));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") cerrarVisor(); });
}

function abrirVisor({ nombreArchivo, url, tipoArchivo }) {
  if (!esHttps(url)) { $id("CHAT_STATUS").textContent = "Enlace de descarga no válido."; return; }
  visorUrl = url; visorNombre = nombreArchivo; visorZoom = 1;
  $id("VIEWER_TITLE").textContent = nombreArchivo;
  const body = $id("VIEWER_BODY"); body.innerHTML = "";
  if (tipoArchivo === "application/pdf") {
    const iframe = document.createElement("iframe");
    iframe.src = url; iframe.title = nombreArchivo;
    body.appendChild(iframe);
    $id("VIEWER_ZOOM_IN").hidden = true; $id("VIEWER_ZOOM_OUT").hidden = true;
  } else {
    const img = document.createElement("img");
    img.src = url; img.alt = nombreArchivo; img.id = "VIEWER_IMG";
    body.appendChild(img);
    $id("VIEWER_ZOOM_IN").hidden = false; $id("VIEWER_ZOOM_OUT").hidden = false;
  }
  $id("VIEWER").hidden = false;
}

function zoomVisor(f) {
  visorZoom = Math.min(5, Math.max(0.2, visorZoom * f));
  const img = $id("VIEWER_IMG"); if (img) img.style.transform = "scale(" + visorZoom + ")";
}

function cerrarVisor() {
  $id("VIEWER").hidden = true;
  $id("VIEWER_BODY").innerHTML = "";
  visorUrl = null; visorNombre = null; visorZoom = 1;
}

function descargarUrl(url, nombre) {
  if (!esHttps(url)) return;
  const a = document.createElement("a");
  a.href = url; a.download = nombre || ""; a.target = "_blank"; a.rel = "noopener noreferrer";
  document.body.appendChild(a); a.click(); a.remove();
}

async function obtenerDescarga(mensajeId) {
  if (!mensajeId) return "";
  if (cacheDescarga.has(mensajeId)) return cacheDescarga.get(mensajeId);
  const r = await WixApi.descarga(servicioIdActual, mensajeId);
  const url = r?.data?.descarga || r?.data?.url || "";
  if (url) cacheDescarga.set(mensajeId, url);
  return url;
}

async function verAdjunto(m) {
  try {
    const url = await obtenerDescarga(m.mensajeId || m.id || m._id);
    if (!url) { $id("CHAT_STATUS").textContent = "No se pudo obtener el enlace de descarga."; return; }
    abrirVisor({ nombreArchivo: m.nombreArchivo || "documento", url, tipoArchivo: m.tipoArchivo });
  } catch (e) { $id("CHAT_STATUS").textContent = e.message; }
}

async function descargarAdjunto(m) {
  try {
    const url = await obtenerDescarga(m.mensajeId || m.id || m._id);
    if (!url) { $id("CHAT_STATUS").textContent = "No se pudo obtener el enlace de descarga."; return; }
    descargarUrl(url, m.nombreArchivo || "documento");
  } catch (e) { $id("CHAT_STATUS").textContent = e.message; }
}

function renderAdjunto(m, contenedor) {
  const tipo = (m.tipoArchivo || "").toLowerCase();
  if (tipo === "application/pdf") {
    const card = el("div", "fm-doc-card");
    card.appendChild(el("span", "pdfico", "PDF"));
    const datos = el("div", "datos");
    datos.appendChild(el("div", "nombre", m.nombreArchivo || "documento.pdf"));
    datos.appendChild(el("div", "tamano", formatoTamano(m.tamanoArchivo)));
    card.appendChild(datos);
    const acc = el("div", "acciones");
    const bVer = el("button", "", "Ver documento"); bVer.addEventListener("click", () => verAdjunto(m));
    const bDes = el("button", "", "Descargar"); bDes.addEventListener("click", () => descargarAdjunto(m));
    acc.append(bVer, bDes);
    card.appendChild(acc);
    contenedor.appendChild(card);
  } else {
    const card = el("div", "fm-img-card");
    const mini = document.createElement("img"); mini.className = "mini"; mini.alt = m.nombreArchivo || "imagen";
    card.appendChild(mini);
    const datos = el("div", "datos");
    datos.appendChild(el("div", "nombre", m.nombreArchivo || "imagen"));
    datos.appendChild(el("div", "tamano", formatoTamano(m.tamanoArchivo)));
    card.appendChild(datos);
    const acc = el("div", "acciones");
    const bVer = el("button", "", "Ver"); bVer.addEventListener("click", () => verAdjunto(m));
    const bDes = el("button", "", "Descargar"); bDes.addEventListener("click", () => descargarAdjunto(m));
    acc.append(bVer, bDes);
    card.appendChild(acc);
    contenedor.appendChild(card);
    // miniatura con carga perezosa (URL on-demand, cacheada)
    obtenerDescarga(m.mensajeId || m.id || m._id).then(url => { if (url && esHttps(url)) mini.src = url; }).catch(() => {});
  }
}

async function enviarMensaje() {
  if (!servicioIdActual || enviando) return;
  const cat = $id("CATEGORIA").value;
  const texto = $id("MENSAJE").value.trim();
  if (!cat) { $id("CHAT_STATUS").textContent = "Seleccione una categoría."; return; }
  if (!texto && !adjunto) return;
  const teniaAdjunto = !!adjunto;
  enviando = true;
  const btn = $id("BTN_ENVIAR");
  btn.disabled = true;
  $id("CHAT_STATUS").textContent = teniaAdjunto ? "Subiendo archivo…" : "Enviando…";
  try {
    if (adjunto) {
      // Un solo mensaje con adjunto (texto opcional) vía subirDocumento (DEMO local).
      await WixApi.subirDocumento(servicioIdActual, cat, texto,
        adjunto.nombreArchivo, adjunto.tipoArchivo, adjunto.base64, "CHAT");
    } else {
      await WixApi.enviarMensaje(servicioIdActual, cat, texto, "CHAT");
    }
    $id("MENSAJE").value = "";
    limpiarAdjunto();
    $id("CHAT_STATUS").textContent = teniaAdjunto ? "Archivo enviado correctamente" : "";
    await cargarMensajes();
  } catch (e) {
    // conservar borrador (texto y adjunto) en caso de error
    $id("CHAT_STATUS").textContent = "La carga pudo haberse completado. Actualiza el historial antes de volver a enviar. (" + e.message + ")";
  } finally {
    enviando = false; btn.disabled = false;
  }
}

// ---------------------------------------------------------------------------
// Polling
// ---------------------------------------------------------------------------
function iniciarPolling(area) {
  if (timer) return;
  timer = setInterval(() => { if (!document.hidden && servicioIdActual) cargarMensajes(); }, 3000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden && servicioIdActual) cargarMensajes(); });
}
function detenerPolling() { if (timer) { clearInterval(timer); timer = null; } }

// ===========================================================================
// MAPA DEL SERVICIO (Leaflet + OpenStreetMap)
// ===========================================================================
const RE_GMAPS = /(https?:\/\/(?:maps\.app\.goo\.gl|goo\.gl\/maps|maps\.google\.com|www\.google\.com\/maps)[^\s<>]+)/g;

let folioActual = "";
let mapaLeaflet = null;
let mapaInicializado = false;
let mapaMarcadores = [];
let mapaMarcadorPorId = new Map();
let mapaCache = new Map();
let mapaRecorrido = null;
let mapaFiltroArea = "";
let mapaMostrarRecorrido = false;
let mapaChips = new Map();
let procesandoUbicaciones = false;

function esMensajeGeneral(categoria) {
  const c = String(categoria || "").trim().toLowerCase();
  return c === "mensaje general" || c === "general";
}

function enlacesGoogle(texto) {
  const t = texto || "";
  const out = [];
  let m; RE_GMAPS.lastIndex = 0;
  while ((m = RE_GMAPS.exec(t)) !== null) out.push(m[0]);
  return out;
}

function parsearCoordenadas(url) {
  try {
    const u = new URL(url);
    const q = u.searchParams.get("q") || u.searchParams.get("query") || "";
    if (q) {
      const m = q.match(/^(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)$/);
      if (m) {
        const lat = parseFloat(m[1]), lon = parseFloat(m[2]);
        if (Number.isFinite(lat) && Number.isFinite(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
          return { lat, lon };
        }
      }
    }
  } catch (e) {}
  return null;
}

function tituloDeMensaje(texto) {
  const lineas = (texto || "").split(/\n+/).map(s => s.trim()).filter(Boolean);
  for (const l of lineas) {
    if (!/^https?:\/\//.test(l) && !enlacesGoogle(l).length) return l;
  }
  return "Ubicación compartida";
}

function anotacionSinUrl(texto) {
  return (texto || "").replace(RE_GMAPS, "").replace(/\n{3,}/g, "\n\n").trim();
}

function claveUbicacion(mensajeId, indice) {
  return servicioIdActual + "|" + (mensajeId || "") + "|" + indice;
}

function iniciarMapa() {
  const cont = $id("map");
  if (!cont || typeof L === "undefined") return;
  if (mapaInicializado && mapaLeaflet) { setTimeout(() => mapaLeaflet.invalidateSize(), 50); return; }
  mapaLeaflet = L.map("map").setView([23.6, -102.5], 5);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors", maxZoom: 18,
  }).addTo(mapaLeaflet);
  mapaInicializado = true;
  actualizarLeyenda();
}

function actualizarLeyenda() {
  const ley = $id("MAP_LEGEND");
  if (!ley) return;
  ley.innerHTML = "";
  Object.keys(AREAS).forEach(a => {
    const item = el("span", "item");
    const punto = el("span", "punto"); punto.style.background = AREAS[a].color;
    item.appendChild(punto);
    item.appendChild(document.createTextNode(AREAS[a].nombre));
    ley.appendChild(item);
  });
}

function resetearMapa() {
  if (mapaLeaflet) {
    mapaMarcadores.forEach(u => { if (u.marker) mapaLeaflet.removeLayer(u.marker); });
    if (mapaRecorrido) { mapaLeaflet.removeLayer(mapaRecorrido); mapaRecorrido = null; }
  }
  mapaMarcadores = [];
  mapaMarcadorPorId.clear();
  mapaChips.clear();
  mapaMostrarRecorrido = false;
  $id("MAP_RECORRIDO").textContent = "Mostrar recorrido";
  $id("MAP_HISTORIAL_LISTA").hidden = true;
  actualizarMapaInfo();
}

function actualizarMapaInfo() {
  const n = mapaMarcadores.length;
  $id("MAP_SUB").textContent = "Ubicaciones reportadas · " + n + (n === 1 ? " ubicación" : " ubicaciones") + " · Servicio " + (folioActual || "—");
  const nota = $id("MAP_NOTA");
  if (!folioActual) nota.textContent = "Selecciona un servicio para consultar sus ubicaciones.";
  else if (!n) nota.textContent = "Aún no se han compartido ubicaciones para este servicio.";
  else nota.textContent = "Línea entre ubicaciones reportadas. No representa el recorrido real del vehículo.";
}

function crearMarcador(u) {
  if (!mapaLeaflet) return;
  const color = areaInfo(u.area).color;
  const icono = L.divIcon({
    className: "",
    html: `<div style="width:16px;height:16px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 0 3px rgba(0,0,0,0.4)"></div>`,
    iconSize: [16, 16], iconAnchor: [8, 8], popupAnchor: [0, -8],
  });
  const marker = L.marker([u.lat, u.lon], { icon: icono }).addTo(mapaLeaflet);

  // Popup seguro: se construye con DOM/textContent (sin innerHTML con datos de usuario).
  const cont = document.createElement("div");
  cont.appendChild(el("strong", "", tituloDeMensaje(u.mensaje)));
  cont.appendChild(document.createElement("br"));
  const cuerpo = anotacionSinUrl(u.mensaje || "");
  cuerpo.split("\n").forEach((linea, i) => {
    if (i) cont.appendChild(document.createElement("br"));
    cont.appendChild(document.createTextNode(linea));
  });
  cont.appendChild(document.createElement("br"));
  cont.appendChild(el("span", "lbl", "Folio: " + (u.folio || "—") + " · " + areaInfo(u.area).nombre + " · " + (u.usuario || "—")));
  cont.appendChild(document.createElement("br"));
  cont.appendChild(document.createTextNode(u.fecha || ""));
  cont.appendChild(document.createElement("br"));
  cont.appendChild(document.createTextNode(u.lat + ", " + u.lon));
  cont.appendChild(document.createElement("br"));
  const enlace = document.createElement("a");
  enlace.href = u.url; enlace.textContent = "Abrir en Google Maps";
  enlace.target = "_blank"; enlace.rel = "noopener noreferrer";
  cont.appendChild(enlace);

  marker.bindPopup(cont);
  u.marker = marker;
  return marker;
}

function aplicarFiltroArea() {
  if (!mapaLeaflet) return;
  mapaMarcadores.forEach(u => {
    if (!u.marker) return;
    const visible = !mapaFiltroArea || areaCanon(u.area) === mapaFiltroArea;
    if (visible) u.marker.addTo(mapaLeaflet); else mapaLeaflet.removeLayer(u.marker);
  });
  if (mapaRecorrido) {
    if (mapaFiltroArea) mapaLeaflet.removeLayer(mapaRecorrido);
    else if (mapaMostrarRecorrido) mapaRecorrido.addTo(mapaLeaflet);
  }
}

function alternarRecorrido() {
  if (!mapaLeaflet) return;
  mapaMostrarRecorrido = !mapaMostrarRecorrido;
  $id("MAP_RECORRIDO").textContent = mapaMostrarRecorrido ? "Ocultar recorrido" : "Mostrar recorrido";
  if (mapaRecorrido) { mapaLeaflet.removeLayer(mapaRecorrido); mapaRecorrido = null; }
  if (mapaMostrarRecorrido && !mapaFiltroArea) {
    const pts = [...mapaMarcadores].sort((a, b) => (a.fecha || "").localeCompare(b.fecha || "")).map(u => [u.lat, u.lon]);
    if (pts.length >= 2) mapaRecorrido = L.polyline(pts, { color: "#64748B", weight: 2, dashArray: "5 5" }).addTo(mapaLeaflet);
  }
}

function centrarTodas() {
  if (!mapaLeaflet || !mapaMarcadores.length) return;
  mapaLeaflet.fitBounds(L.latLngBounds(mapaMarcadores.map(u => [u.lat, u.lon])), { padding: [40, 40] });
}

function centrarUltima() {
  if (!mapaLeaflet || !mapaMarcadores.length) return;
  const u = [...mapaMarcadores].sort((a, b) => (a.fecha || "").localeCompare(b.fecha || ""))[mapaMarcadores.length - 1];
  mapaLeaflet.setView([u.lat, u.lon], 13);
  if (u.marker) u.marker.openPopup();
}

function alternarHistorial() {
  const lista = $id("MAP_HISTORIAL_LISTA");
  lista.hidden = !lista.hidden;
  if (!lista.hidden) renderHistorial();
}

function renderHistorial() {
  const lista = $id("MAP_HISTORIAL_LISTA");
  lista.innerHTML = "";
  const orden = [...mapaMarcadores].sort((a, b) => (a.fecha || "").localeCompare(b.fecha || ""));
  if (!orden.length) { lista.appendChild(el("div", "fm-empty", "Sin ubicaciones.")); return; }
  const filas = el("div", "filas");
  orden.forEach((u, i) => {
    const f = el("div", "fila");
    f.appendChild(el("span", "num", String(i + 1)));
    const info = el("div", "info");
    info.appendChild(el("div", "resumen", tituloDeMensaje(u.mensaje)));
    info.appendChild(el("div", "meta", u.fecha + " · " + areaInfo(u.area).nombre + " · " + (u.usuario || "") + " · " + u.lat + ", " + u.lon));
    f.appendChild(info);
    const bVer = el("button", "fm-btn", "Ver en mapa");
    bVer.addEventListener("click", () => { if (mapaLeaflet) { mapaLeaflet.setView([u.lat, u.lon], 14); if (u.marker) u.marker.openPopup(); } });
    const bAbrir = el("button", "fm-btn", "Google Maps");
    bAbrir.addEventListener("click", () => window.open(u.url, "_blank", "noopener,noreferrer"));
    f.appendChild(bVer); f.appendChild(bAbrir);
    filas.appendChild(f);
  });
  lista.appendChild(filas);
}

function alternarFullscreen() {
  const sec = $id("MAP_SECTION");
  if (!document.fullscreenElement) {
    if (sec.requestFullscreen) sec.requestFullscreen();
    $id("MAP_FULLSCREEN").textContent = "Salir de pantalla completa";
  } else {
    if (document.exitFullscreen) document.exitFullscreen();
    $id("MAP_FULLSCREEN").textContent = "Pantalla completa";
  }
  setTimeout(() => { if (mapaLeaflet) mapaLeaflet.invalidateSize(); }, 150);
}

async function procesarUbicaciones(lista) {
  if (!servicioIdActual || !mapaLeaflet || procesandoUbicaciones) return;
  procesandoUbicaciones = true;
  try {
    const mensajes = Array.isArray(lista) ? lista : [];
    for (const m of mensajes) {
      if (!esMensajeGeneral(m.categoria)) continue;
      const enlaces = enlacesGoogle(m.mensaje || m.contenido || m.texto || "");
      if (!enlaces.length) continue;
      const mensajeId = m.mensajeId || m.id || m._id || "";
      for (let i = 0; i < enlaces.length; i++) {
        const clave = claveUbicacion(mensajeId, i);
        if (mapaMarcadorPorId.has(clave)) continue;
        await resolverYAgregar(clave, enlaces[i], m, mensajeId);
      }
    }
    actualizarMapaInfo();
    centrarTodas();
  } finally {
    procesandoUbicaciones = false;
  }
}

async function resolverYAgregar(clave, url, m, mensajeId) {
  let coord = parsearCoordenadas(url);
  if (!coord) {
    const cacheClave = servicioIdActual + "|" + mensajeId + "|" + url;
    if (mapaCache.has(cacheClave)) {
      coord = mapaCache.get(cacheClave) || null;
    } else {
      try {
        const r = await WixApi.resolverUbicacion(servicioIdActual, mensajeId, url);
        const d = r?.data || {};
        if (d && d.resuelto && Number.isFinite(d.latitud) && Number.isFinite(d.longitud)) {
          coord = { lat: d.latitud, lon: d.longitud };
          mapaCache.set(cacheClave, coord);
        } else { mapaCache.set(cacheClave, null); }
      } catch (e) { mapaCache.set(cacheClave, null); }
    }
  }
  if (coord) {
    const u = { id: clave, lat: coord.lat, lon: coord.lon, area: m.area || m.Area || "SISTEMA",
      usuario: textoDe(m.usuario || m.user || ""), folio: folioActual, mensaje: m.mensaje || "",
      fecha: fechaHora(m.fechaEnvio || m.fecha || m.fechaServidor), url: url, mensajeId };
    mapaMarcadores.push(u);
    mapaMarcadorPorId.set(clave, u);
    crearMarcador(u);
    marcarChip(mensajeId, "ubicacion", url);
  } else {
    marcarChip(mensajeId, "no_resuelto", url);
  }
}

function marcarChip(mensajeId, estado, url) {
  const chip = mapaChips.get(mensajeId);
  if (!chip) return;
  chip.innerHTML = "";
  if (estado === "ubicacion") {
    chip.appendChild(el("span", "fm-ubicacion-ok", "Ubicación agregada al mapa"));
    const b = el("button", "fm-btn", "Ver ubicación");
    b.addEventListener("click", () => {
      const u = [...mapaMarcadores].find(x => x.mensajeId === mensajeId);
      if (u && mapaLeaflet) { $id("MAP_SECTION").scrollIntoView({ behavior: "smooth" }); mapaLeaflet.setView([u.lat, u.lon], 14); if (u.marker) u.marker.openPopup(); }
    });
    chip.appendChild(b);
  } else {
    chip.appendChild(el("span", "fm-ubicacion-no", "No se pudo identificar la ubicación."));
  }
  const a = el("a", "", "Abrir en Google Maps");
  a.href = url; a.target = "_blank"; a.rel = "noopener noreferrer";
  chip.appendChild(a);
}

function configurarMapa() {
  iniciarMapa();
  const filtro = $id("MAP_FILTRO_AREA");
  filtro.innerHTML = '<option value="">Todas las áreas</option>';
  Object.keys(AREAS).forEach(a => filtro.appendChild(new Option(AREAS[a].nombre, a)));
  $id("MAP_ULTIMA").addEventListener("click", centrarUltima);
  $id("MAP_TODAS").addEventListener("click", centrarTodas);
  $id("MAP_HISTORIAL").addEventListener("click", alternarHistorial);
  $id("MAP_RECORRIDO").addEventListener("click", alternarRecorrido);
  $id("MAP_FULLSCREEN").addEventListener("click", alternarFullscreen);
  filtro.addEventListener("change", () => { mapaFiltroArea = filtro.value; aplicarFiltroArea(); });
  document.addEventListener("fullscreenchange", () => {
    $id("MAP_FULLSCREEN").textContent = document.fullscreenElement ? "Salir de pantalla completa" : "Pantalla completa";
    setTimeout(() => { if (mapaLeaflet) mapaLeaflet.invalidateSize(); }, 150);
  });
}

// ===========================================================================
// CÁMARA DEL PERSONAL_SEGURIDAD (getUserMedia + geolocalización)
// ===========================================================================
const PROTOCOLOS = {
  ASIGNACIONES: [
    { cat: "Kilometraje y Combustible Inicial", frec: "Antes de iniciar el recorrido" },
    { cat: "Recogida de Unidad", frec: "Al recoger la unidad" },
    { cat: "Paso por Caseta", frec: "Cada caseta" },
    { cat: "Carga de combustible", frec: "Cada abastecimiento" },
    { cat: "Entrega de Unidad", frec: "Al entregar la unidad" },
    { cat: "Eventos Emergencia", frec: "Cuando ocurra una emergencia" },
    { cat: "Kilometraje y Combustible Final", frec: "Al finalizar el recorrido" },
  ],
  PERSONAL_SEGURIDAD: [
    { cat: "Kilometraje y combustible inicial", frec: "Antes de iniciar el recorrido" },
    { cat: "Kilometraje y combustible final", frec: "Al finalizar el recorrido" },
    { cat: "Recogida de auto", frec: "Al recoger el vehículo", multiFoto: true },
    { cat: "Paso por Caseta", frec: "Cada caseta" },
    { cat: "Carga de combustible", frec: "Cada abastecimiento" },
    { cat: "Evidencia de Accidente", frec: "Solo si ocurre un accidente" },
    { cat: "Evidencia de Asistencia a Emergencia", frec: "Solo si se asiste una emergencia" },
  ],
};

function protocoloActual() {
  return PROTOCOLOS[areaCanon(sesion?.area || "")] || PROTOCOLOS.PERSONAL_SEGURIDAD;
}

let camaraStream = null;
let fotoCapturada = null;
let ubicacionCapturada = null;
let colaFotos = [];

function detenerCamara() {
  if (camaraStream) { camaraStream.getTracks().forEach(t => t.stop()); camaraStream = null; }
}

function cerrarCamara() {
  detenerCamara();
  $id("CAMERA_MODAL").hidden = true;
  fotoCapturada = null;
  ubicacionCapturada = null;
  colaFotos = [];
  renderColaFotos();
  $id("CAMERA_GEO").textContent = "";
  $id("CAMERA_NOTA").value = "";
}

async function abrirCamara() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    alert("La cámara no está disponible en este navegador.");
    return;
  }
  $id("CAMERA_MODAL").hidden = false;
  try {
    camaraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
    const video = $id("CAMERA_VIDEO");
    video.srcObject = camaraStream;
    video.hidden = false;
    $id("CAMERA_PREVIEW").hidden = true;
    $id("CAMERA_SHOOT").hidden = false;
    $id("CAMERA_RETAKE").hidden = true;
    $id("CAMERA_SEND").hidden = true;
    $id("CAMERA_GEO").textContent = "";
  } catch (e) {
    alert("No se pudo acceder a la cámara: " + e.message);
    cerrarCamara();
  }
}

async function capturarFoto() {
  const video = $id("CAMERA_VIDEO");
  const canvas = $id("CAMERA_CANVAS");
  canvas.width = video.videoWidth; canvas.height = video.videoHeight;
  canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  fotoCapturada = { dataUrl };
  const prev = $id("CAMERA_PREVIEW");
  prev.innerHTML = "";
  const img = document.createElement("img");
  img.src = dataUrl; img.alt = "Fotografía capturada";
  prev.appendChild(img);
  prev.hidden = false;
  video.hidden = true;
  $id("CAMERA_SHOOT").hidden = true;
  $id("CAMERA_RETAKE").hidden = false;
  $id("CAMERA_SEND").hidden = false;
  $id("CAMERA_ADD").hidden = false;
  obtenerUbicacion();
}

function obtenerUbicacion() {
  $id("CAMERA_GEO").textContent = "Obteniendo ubicación…";
  if (!navigator.geolocation) {
    $id("CAMERA_GEO").textContent = "Geolocalización no disponible.";
    ubicacionCapturada = null;
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      ubicacionCapturada = { lat: pos.coords.latitude, lon: pos.coords.longitude,
        precision: pos.coords.accuracy, fecha: new Date().toISOString() };
      $id("CAMERA_GEO").textContent = "Ubicación: " + pos.coords.latitude.toFixed(5) + ", " +
        pos.coords.longitude.toFixed(5) + " (±" + Math.round(pos.coords.accuracy) + " m)";
    },
    (err) => {
      $id("CAMERA_GEO").textContent = "No se pudo obtener la ubicación: " + err.message;
      ubicacionCapturada = null;
    },
    { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
  );
}

async function enviarEvidencia() {
  if (!fotoCapturada && !colaFotos.length) return;
  if (!ubicacionCapturada) {
    alert("No se obtuvo una ubicación válida. Esta evidencia no puede registrarse como georreferenciada. Reintente la ubicación.");
    return;
  }
  if (!servicioIdActual) { alert("Seleccione un servicio."); return; }
  const categoria = $id("CATEGORIA").value || "Mensaje General";
  const nota = $id("CAMERA_NOTA").value.trim();
  const fotos = [...colaFotos];
  if (fotoCapturada) fotos.push(fotoCapturada);
  const btn = $id("CAMERA_SEND");
  btn.disabled = true; btn.textContent = "Enviando…";
  try {
    // DEMO: envío simulado; la subida multi-archivo al backend Wix queda pendiente.
    for (let i = 0; i < fotos.length; i++) {
      const base64 = fotos[i].dataUrl.split(",")[1] || "";
      await WixApi.registrarEvidencia({
        servicioId: servicioIdActual, categoria, mensaje: nota,
        nombreArchivo: "evidencia_" + (i + 1) + ".jpg", tipoArchivo: "image/jpeg", contenidoBase64: base64,
        latitud: ubicacionCapturada.lat, longitud: ubicacionCapturada.lon,
        precisionMetros: ubicacionCapturada.precision,
        fechaCapturaDispositivo: ubicacionCapturada.fecha, fechaGeolocalizacion: ubicacionCapturada.fecha,
        origenEnvio: "CHAT",
      });
    }
    $id("CAMERA_NOTA").value = "";
    colaFotos = [];
    cerrarCamara();
    $id("CHAT_STATUS").textContent = "Evidencia enviada correctamente" + (fotos.length > 1 ? " (" + fotos.length + " fotos)" : "");
    await cargarMensajes();
  } catch (e) {
    alert("La evidencia pudo haberse completado. Actualiza el historial antes de volver a enviar.\n" + e.message);
  } finally {
    btn.disabled = false; btn.textContent = "Enviar evidencia";
  }
}

function configurarCamara() {
  $id("CAMERA_CLOSE").addEventListener("click", cerrarCamara);
  $id("CAMERA_SHOOT").addEventListener("click", capturarFoto);
  $id("CAMERA_RETAKE").addEventListener("click", () => abrirCamara());
  $id("CAMERA_RELOC").addEventListener("click", obtenerUbicacion);
  $id("CAMERA_SEND").addEventListener("click", enviarEvidencia);
  $id("CAMERA_ADD").addEventListener("click", anadirFotoACola);
}

// ===========================================================================
// PROTOCOLO OBLIGATORIO DE EVIDENCIAS
// ===========================================================================
function renderProtocolo() {
  const cont = $id("PROTOCOLO_LISTA"); if (!cont) return;
  cont.innerHTML = "";
  const evidencias = mensajesActuales.filter(m => m.tieneArchivo && m.tipoArchivo && String(m.tipoArchivo).startsWith("image/"));
  const tabla = el("table", "fm-protocol");
  const th = el("tr");
  ["Evidencia", "Frecuencia", "Estado"].forEach(h => th.appendChild(el("th", "", h)));
  tabla.appendChild(th);
  protocoloActual().forEach(p => {
    const tr = el("tr");
    tr.appendChild(el("td", "", p.cat));
    tr.appendChild(el("td", "", p.frec));
    const encontrada = evidencias.some(e => {
      const c = String(e.categoria || "").toLowerCase();
      return c && (c.includes(p.cat.toLowerCase()) || p.cat.toLowerCase().includes(c));
    });
    const estado = encontrada ? "Registrada" : "Pendiente";
    tr.appendChild(el("td", "estado est-" + estado, estado));
    tabla.appendChild(tr);
  });
  cont.appendChild(tabla);
}

// ===========================================================================
// PERFIL CRONOLÓGICO DEL SERVICIO
// ===========================================================================
function ind(label, valor) {
  const d = el("div", "ind");
  d.appendChild(el("b", "", String(valor)));
  d.appendChild(document.createTextNode(label));
  return d;
}

function renderCronologico() {
  const cont = $id("CRONOLOGICO"); if (!cont) return;
  cont.innerHTML = "";
  if (!folioActual) { cont.appendChild(el("div", "fm-empty", "Selecciona un servicio para consultar su perfil cronológico.")); return; }
  const eventos = [...mensajesActuales].sort((a, b) => String(a.fechaEnvio || a.fecha || "").localeCompare(String(b.fechaEnvio || b.fecha || "")));
  if (!eventos.length) { cont.appendChild(el("div", "fm-empty", "Sin eventos registrados.")); return; }

  const nFotos = eventos.filter(m => m.tieneArchivo && m.tipoArchivo && String(m.tipoArchivo).startsWith("image/")).length;
  const nDocs = eventos.filter(m => m.tieneArchivo && m.tipoArchivo === "application/pdf").length;
  const nMsgs = eventos.filter(m => !m.tieneArchivo).length;
  const inds = el("div", "fm-crono-indicadores");
  inds.appendChild(ind("Eventos", eventos.length));
  inds.appendChild(ind("Fotografías", nFotos));
  inds.appendChild(ind("Documentos", nDocs));
  inds.appendChild(ind("Mensajes", nMsgs));
  cont.appendChild(inds);

  const linea = el("div", "fm-crono");
  eventos.forEach(m => {
    const ev = el("div", "fm-crono-evento");
    ev.appendChild(el("span", "hora", fechaHora(m.fechaEnvio || m.fecha || m.fechaServidor)));
    const punto = el("span", "punto"); punto.style.background = areaInfo(m.area).color;
    ev.appendChild(punto);
    const info = el("div", "info");
    info.appendChild(el("div", "titulo", m.categoria || (m.tieneArchivo ? "Adjunto" : "Mensaje")));
    info.appendChild(el("div", "meta", (textoDe(m.usuario || m.user || "")) + " · " + areaInfo(m.area).nombre));
    ev.appendChild(info);
    linea.appendChild(ev);
  });
  cont.appendChild(linea);
}

// ---------------------------------------------------------------------------
// Arranque
// ---------------------------------------------------------------------------
// ===========================================================================
// MODO DEMOSTRACIÓN: marca la interfaz y evita escrituras reales.
function marcarModoDemo() {
  document.body.classList.add("fm-demo");
  const b = document.getElementById("DEMO_BANNER");
  if (b) b.hidden = false;
}

// ===========================================================================
// SESPATE — Emergencia (SOS / WhatsApp) y cola de fotos múltiples — DEMO
// ===========================================================================
const ESTADOS_SOS = {
  SIN_CONFIGURAR: "Emergencia no configurada. Contacte a su supervisor.",
  SOLICITANDO_UBICACION: "Obteniendo ubicación…",
  UBICACION_DISPONIBLE: "Ubicación obtenida.",
  UBICACION_NO_DISPONIBLE: "No fue posible obtener la ubicación.",
  PREPARADO_PARA_ENVIO: "Ubicación y mensaje listos para enviar (simulado).",
  ENVIO_SIMULADO: "Envío simulado completado. DEMOSTRACIÓN: no se envió ningún mensaje real.",
  ERROR: "Ocurrió un error.",
};

let sosEstado = "SIN_CONFIGURAR";
let sosUbicacion = null;

function configurarEmergencia() {
  const box = $id("EMERGENCY_BOX");
  if (!box) return;
  const area = areaCanon(sesion?.area || "");
  box.hidden = area !== "PERSONAL_SEGURIDAD";
  if (box.hidden) return;
  $id("BTN_SOS").addEventListener("click", abrirSos);
  $id("BTN_WHATSAPP").addEventListener("click", abrirWhatsapp);
  $id("SOS_CANCEL").addEventListener("click", cerrarSos);
  $id("SOS_SEND").addEventListener("click", enviarSos);
}

function abrirSos() {
  if (!emergencySettings.sos.configurado) { mostrarSosEstado("SIN_CONFIGURAR"); return; }
  $id("SOS_MODAL").hidden = false;
  mostrarSosEstado("SOLICITANDO_UBICACION");
  if (!navigator.geolocation) { mostrarSosEstado("UBICACION_NO_DISPONIBLE"); return; }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      sosUbicacion = { lat: pos.coords.latitude, lon: pos.coords.longitude, precision: pos.coords.accuracy, fecha: new Date().toISOString() };
      mostrarSosEstado("UBICACION_DISPONIBLE");
      mostrarSosEstado("PREPARADO_PARA_ENVIO");
      $id("SOS_SEND").hidden = false;
    },
    () => mostrarSosEstado("UBICACION_NO_DISPONIBLE"),
    { enableHighAccuracy: true, timeout: 20000 }
  );
}

function mostrarSosEstado(estado) {
  sosEstado = estado;
  const body = $id("SOS_BODY"); if (body) body.textContent = ESTADOS_SOS[estado] || estado;
  const st = $id("SOS_STATUS");
  if (st) { st.textContent = "SOS: " + estado; st.hidden = false; }
}

function enviarSos() {
  // DEMOSTRACIÓN: no se envía ningún mensaje real.
  mostrarSosEstado("ENVIO_SIMULADO");
  $id("SOS_SEND").hidden = true;
  console.info("SOS simulado:", { ubicacion: sosUbicacion, contactos: emergencySettings.sos.contactos });
}

function cerrarSos() {
  $id("SOS_MODAL").hidden = true;
  $id("SOS_SEND").hidden = true;
  sosUbicacion = null; sosEstado = "SIN_CONFIGURAR";
  const st = $id("SOS_STATUS"); if (st) st.hidden = true;
}

function abrirWhatsapp() {
  const numero = String(emergencySettings.whatsappPolicia || "").replace(/[^0-9]/g, "");
  const st = $id("SOS_STATUS");
  if (!numero) {
    if (st) { st.textContent = "Policía de Proximidad: contacto no configurado."; st.hidden = false; }
    return;
  }
  if (st) st.hidden = true;
  window.open("https://wa.me/" + numero, "_blank", "noopener,noreferrer");
}

function renderColaFotos() {
  const cola = $id("CAMERA_QUEUE"); if (!cola) return;
  cola.innerHTML = "";
  cola.hidden = colaFotos.length === 0;
  colaFotos.forEach((f, i) => {
    const chip = el("div", "fm-queue-item");
    const img = document.createElement("img");
    img.src = f.dataUrl; img.alt = "Foto " + (i + 1);
    chip.appendChild(img);
    const del = el("button", "fm-queue-del", "✕");
    del.title = "Quitar foto"; del.setAttribute("aria-label", "Quitar foto " + (i + 1));
    del.addEventListener("click", () => { colaFotos.splice(i, 1); renderColaFotos(); });
    chip.appendChild(del);
    cola.appendChild(chip);
  });
}

function anadirFotoACola() {
  if (!fotoCapturada) return;
  colaFotos.push(fotoCapturada);
  fotoCapturada = null;
  renderColaFotos();
  $id("CAMERA_PREVIEW").hidden = true;
  $id("CAMERA_VIDEO").hidden = false;
  $id("CAMERA_SHOOT").hidden = false;
  $id("CAMERA_RETAKE").hidden = true;
  $id("CAMERA_SEND").hidden = true;
  $id("CAMERA_ADD").hidden = true;
}

if (document.getElementById("LOGIN_BOX")) {
  flujoLogin();
} else if (document.getElementById("PANEL")) {
  flujoPanel();
}
