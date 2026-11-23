// SESPATE — Cargador de datos (manifest + JSON granulares con caché y errores).

const ARCHIVOS = [
  "catalogos.json", "servicios.json", "recorridos.json", "cargas.json",
  "mantenimientos.json", "turnos.json", "asistencias.json", "incidentes.json",
  "financiero.json", "costos.json", "mapa.geojson",
  "checklists.json", "capacitaciones.json", "evaluaciones.json",
];

const cache = new Map();

async function obtenerJSON(ruta) {
  if (cache.has(ruta)) return cache.get(ruta);
  const resp = await fetch(ruta, { cache: "no-store" });
  if (!resp.ok) {
    throw new Error(`No se pudo cargar ${ruta} (HTTP ${resp.status})`);
  }
  const datos = await resp.json();
  cache.set(ruta, datos);
  return datos;
}

function validarCatalogo(datos) {
  const requeridos = ["clientes", "instalaciones", "contratos", "zonas", "rutas", "vehiculos", "personas"];
  for (const k of requeridos) {
    if (!Array.isArray(datos[k])) throw new Error(`Catálogo inválido: falta "${k}"`);
  }
}

async function cargarDatos() {
  const manifest = await obtenerJSON("data/manifest.json");
  const store = {};
  for (const archivo of ARCHIVOS) {
    const clave = archivo.replace(/\.(json|geojson)$/, "");
    store[clave] = await obtenerJSON(`data/${archivo}`);
  }
  store.manifest = manifest;
  validarCatalogo(store.catalogos);
  return store;
}

export { cargarDatos, obtenerJSON };
