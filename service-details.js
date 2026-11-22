/* ============================================================
   SECURITYTRANS — Detalle expandible de servicio (R09, S01–S10)
   ============================================================ */

import { DataLoader } from "./data-loader.js";

let mapaInstancia = null;
let abierto = null;

function chip(txt, clase) {
  return `<span class="status-chip ${clase}">${txt}</span>`;
}

export async function abrirServicio(folio) {
  const sec = document.getElementById("R_SERVICE_DETAIL");
  const body = document.getElementById("SERVICE_DETAIL_BODY");
  sec.hidden = false;
  body.innerHTML = `<p class="state-msg">Cargando ${folio}…</p>`;
  sec.scrollIntoView({ behavior: "smooth", block: "start" });

  // Liberar mapa anterior
  if (mapaInstancia) { mapaInstancia.remove(); mapaInstancia = null; }

  try {
    const d = await DataLoader.servicio(folio);
    abierto = folio;
    render(d);
  } catch (e) {
    body.innerHTML = `<p class="state-msg">Error al cargar el servicio: ${e.message}</p>`;
  }
}

export function cerrarServicio() {
  document.getElementById("R_SERVICE_DETAIL").hidden = true;
  document.getElementById("SERVICE_DETAIL_BODY").innerHTML = "";
  if (mapaInstancia) { mapaInstancia.remove(); mapaInstancia = null; }
  abierto = null;
}

function render(d) {
  const r = d.resumen;
  const body = document.getElementById("SERVICE_DETAIL_BODY");

  // S01 Resumen ejecutivo
  const s01 = `
    <div class="detail-section">
      <h4>Resumen ejecutivo</h4>
      <div class="vehicle-profile">
        ${kv("Folio", d.folio)} ${kv("Operador", r.operador)} ${kv("Perfil", r.perfil)}
        ${kv("Fecha", r.fecha)} ${kv("Origen", r.origen)} ${kv("Destino", r.destino)}
        ${kv("Distancia programada", r.distancia_programada_km + " km")}
        ${kv("Distancia ejecutada", r.distancia_ejecutada_km + " km")}
        ${kv("Duración", r.duracion_h + " h")} ${kv("Ralentí", r.tiempo_ralenti_h + " h")}
        ${kv("Rendimiento", r.rendimiento_kmL + " km/L")}
        ${kv("Consumo motor", r.consumo_motor_L + " L")}
        ${kv("Salida balance", r.salida_segun_balance_L + " L")}
        ${kv("Presupuesto", "$" + r.presupuesto_MXN)} ${kv("Costo", "$" + r.costo_MXN)}
        ${kv("Ahorro/Sobrecosto", "$" + r.ahorro_sobrecosto_MXN)}
        ${kv("Estado", chip("SERVICIO SIMULADO", "simulado"))}
      </div>
    </div>`;

  // S02 Mapa
  const s02 = `<div class="detail-section"><h4>Mapa interactivo</h4><div id="map"></div>
    <p class="map-legend">Trayectoria GPS simulada (CDMX → Monterrey). El fondo de mapa requiere conexión a Internet (OpenStreetMap).</p></div>`;

  // S03 Planeado vs esperado vs ejecutado
  const pee = d.planeado_esperado_ejecutado;
  const s03 = `<div class="detail-section"><h4>Planeado vs. esperado vs. ejecutado</h4>
    <div class="table-wrap"><table class="ir">
      <thead><tr><th>Indicador</th><th>Planeado</th><th>Esperado (modelo)</th><th>Ejecutado</th><th>Unidad</th></tr></thead>
      <tbody>
        <tr><td>Distancia</td><td class="num">${pee.distancia.planeado}</td><td class="num">${pee.distancia.esperado}</td><td class="num">${pee.distancia.ejecutado}</td><td class="num">${pee.distancia.unidad}</td></tr>
        <tr><td>Tiempo</td><td class="num">${pee.tiempo.planeado}</td><td class="num">${pee.tiempo.esperado}</td><td class="num">${pee.tiempo.ejecutado}</td><td class="num">${pee.tiempo.unidad}</td></tr>
        <tr><td>Rendimiento</td><td class="num">${pee.rendimiento.planeado}</td><td class="num">${pee.rendimiento.esperado}</td><td class="num">${pee.rendimiento.ejecutado}</td><td class="num">${pee.rendimiento.unidad}</td></tr>
        <tr><td>Litros</td><td class="num">${pee.litros.planeado}</td><td class="num">${pee.litros.esperado}</td><td class="num">${pee.litros.ejecutado}</td><td class="num">${pee.litros.unidad}</td></tr>
        <tr><td>Costo</td><td class="num">${pee.costo.planeado}</td><td class="num">${pee.costo.esperado}</td><td class="num">${pee.costo.ejecutado}</td><td class="num">${pee.costo.unidad}</td></tr>
      </tbody>
    </table></div></div>`;

  // S04 Cinemática
  const c = d.comportamiento;
  const s04 = `<div class="detail-section"><h4>Cinemática y conducción</h4>
    <div class="vehicle-profile">
      ${kv("Velocidad media", c.velocidad_promedio_movimiento_kmh + " km/h")}
      ${kv("Velocidad máxima", c.velocidad_maxima_kmh + " km/h")}
      ${kv("Desv. velocidad", c.desviacion_velocidad_kmh + " km/h")}
      ${kv("Aceleración máx", c.aceleracion_maxima_ms2 + " m/s²")}
      ${kv("Desaceleración máx", c.desaceleracion_maxima_ms2 + " m/s²")}
      ${kv("Paradas", c.n_paradas)}
    </div>
    <div class="chart-sm" id="CHART_VEL"></div></div>`;

  // S05 Energía
  const e = d.energia;
  const s05 = `<div class="detail-section"><h4>Topografía y comportamiento energético</h4>
    <div class="vehicle-profile">
      ${kv("Energía aerodinámica", e.energia_aerodinamica_MJ + " MJ")}
      ${kv("Energía de rodadura", e.energia_rodadura_MJ + " MJ")}
      ${kv("Energía de pendiente", e.energia_pendiente_MJ + " MJ")}
      ${kv("Energía de aceleración", e.energia_aceleracion_MJ + " MJ")}
      ${kv("Energía frenado (disipada)", e.energia_frenado_dispersada_MJ + " MJ")}
    </div></div>`;

  // S06 Inventario
  const inv = d.inventario;
  const s06 = `<div class="detail-section"><h4>Inventario y balance de combustible</h4>
    <div class="vehicle-profile">
      ${kv("Inventario inicial", inv.inicial_L + " L")}
      ${kv("Abastecimientos", inv.abastecimientos_L + " L")}
      ${kv("Inventario final", inv.final_L + " L")}
      ${kv("Salida según balance", inv.salida_balance_L + " L")}
      ${kv("Consumo del motor", inv.consumo_motor_L + " L")}
      ${kv("Diferencia no explicada", inv.diferencia_no_explicada_L + " L")}
    </div></div>`;

  // S07 Finanzas
  const f = d.finanzas;
  const s07 = `<div class="detail-section"><h4>Análisis financiero</h4>
    <div class="vehicle-profile">
      ${kv("Presupuesto", "$" + f.presupuesto_MXN)}
      ${kv("Litros presupuestados", f.litros_presupuestados_L + " L")}
      ${kv("Importe abastecimientos", "$" + f.importe_abastecimientos_MXN)}
      ${kv("Costo del consumo", "$" + f.costo_consumo_MXN)}
      ${kv("Costo por km", "$" + f.costo_por_km_MXN)}
      ${kv("Ahorro/Sobrecosto", "$" + f.ahorro_sobrecosto_MXN)}
      ${kv("Valor diferencia no explicada", "$" + f.valor_diferencia_no_explicada_MXN)}
    </div></div>`;

  // S08 Alertas
  const s08 = `<div class="detail-section"><h4>Alertas y observaciones</h4>${d.alertas.map(alertHTML).join("")}</div>`;

  // S09 Oportunidades
  const ahorro = r.ahorro_sobrecosto_MXN;
  const s09 = `<div class="detail-section"><h4>Oportunidades de ahorro</h4>
    <p class="state-msg">${ahorro > 0
      ? "Ahorro simulado de $" + ahorro + " MXN frente al presupuesto (no es ahorro real comprobado)."
      : "No se identificó ahorro frente al presupuesto en este servicio simulado."}</p></div>`;

  // S10 Fundamento científico
  const s10 = `<div class="detail-section"><h4>Fundamento científico</h4>
    <details class="collapsible"><summary>Resultado empresarial</summary>
      <p class="state-msg">El servicio presenta un consumo calculado desde la física del comportamiento. Su desviación frente al presupuesto debe evaluarse considerando la incertidumbre del modelo (masa de blindaje y PBV estimados).</p>
      <button class="btn" data-ver-modelo="MOD-001">Ver fundamento matemático</button>
    </details>
    <details class="collapsible"><summary>Modelos aplicados</summary>
      <p class="state-msg">MET-01 dinámica longitudinal, MET-02 termodinámica, MET-04 conservación de combustible y MET-12 finanzas se ejecutaron en Python; los resultados se presentan aquí.</p>
    </details></div>`;

  body.innerHTML = s01 + s02 + s03 + s04 + s05 + s06 + s07 + s08 + s09 + s10;

  // Renderizar mapa (Leaflet) y gráfica de velocidad (ECharts)
  setTimeout(() => {
    renderMapa(d);
    renderVelocidad(d);
  }, 60);
}

function kv(label, value) {
  return `<div class="vp-item"><div class="vp-label">${label}</div><div class="vp-value">${value}</div></div>`;
}

function alertHTML(a) {
  const cls = { INFORMATIVA: "info", OBSERVACION: "obs", ADVERTENCIA: "warn", REVISION_PRIORITARIA: "rev" }[a.severidad] || "info";
  return `<div class="alert ${cls}">
    <div class="alert-head"><span>${a.tipo.replace(/_/g, " ")}</span><span>${a.severidad.replace(/_/g, " ").toLowerCase()}</span></div>
    <div class="alert-body">${a.interpretacion} <em>Recomendación: ${a.recomendacion}</em></div>
  </div>`;
}

function renderMapa(d) {
  const el = document.getElementById("map");
  if (!el || typeof L === "undefined") return;
  const gps = d.gps;
  if (!gps || gps.length === 0) { el.innerHTML = '<p class="state-msg">Sin datos de trayectoria.</p>'; return; }
  mapaInstancia = L.map(el).setView([gps[0].lat, gps[0].lon], 7);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors", maxZoom: 18,
  }).addTo(mapaInstancia);
  const linea = gps.map(p => [p.lat, p.lon]);
  L.polyline(linea, { color: "#24476A", weight: 3 }).addTo(mapaInstancia);
  L.circleMarker([linea[0][0], linea[0][1]], { radius: 7, color: "#176B65", fillOpacity: 1 })
    .addTo(mapaInstancia).bindPopup("Origen: " + d.resumen.origen);
  L.circleMarker([linea[linea.length - 1][0], linea[linea.length - 1][1]], { radius: 7, color: "#B91C1C", fillOpacity: 1 })
    .addTo(mapaInstancia).bindPopup("Destino: " + d.resumen.destino);
  setTimeout(() => mapaInstancia && mapaInstancia.invalidateSize(), 100);
}

function renderVelocidad(d) {
  const el = document.getElementById("CHART_VEL");
  if (!el || typeof echarts === "undefined") return;
  const chart = echarts.init(el);
  const gps = d.gps;
  chart.setOption({
    grid: { left: 45, right: 15, top: 20, bottom: 30 },
    tooltip: { trigger: "axis" },
    xAxis: { type: "category", data: gps.map(p => (p.distancia_km).toFixed(0)), name: "km" },
    yAxis: { type: "value", name: "km/h" },
    series: [{ name: "Velocidad", type: "line", data: gps.map(p => p.velocidad_kmh), showSymbol: false, areaStyle: { opacity: 0.2 } }],
  });
}

export function servicioAbierto() { return abierto; }
