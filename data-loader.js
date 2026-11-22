/* ============================================================
   SECURITYTRANS — Cargador de datos (fetch + caché en memoria)
   ============================================================ */

const cache = new Map();

async function cargarJSON(nombre) {
  if (cache.has(nombre)) return cache.get(nombre);
  const resp = await fetch("./" + nombre, { cache: "no-cache" });
  if (!resp.ok) throw new Error("No se pudo cargar " + nombre + " (" + resp.status + ")");
  const datos = await resp.json();
  cache.set(nombre, datos);
  return datos;
}

export const DataLoader = {
  async catalogos() { return cargarJSON("catalogos.json"); },
  async resumen() { return cargarJSON("services-summary.json"); },
  async historial() { return cargarJSON("vehicle-history.json"); },
  async cientificos() { return cargarJSON("scientific-results.json"); },
  async servicio(folio) {
    const suf = folio.slice(-5);
    return cargarJSON("srv-" + suf + ".json");
  },
};

export { cargarJSON };
