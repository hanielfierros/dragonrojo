// SESPATE — Componente de mapa con Leaflet (instalaciones, incidentes y rutas).

let instanciaMapa = null;

function renderMapa(contenedor, geojson, { filtrado = false } = {}) {
  destruirMapa();
  if (!window.L || !geojson || !geojson.features) {
    contenedor.innerHTML = '<div class="state-msg error">No se pudo cargar el componente de mapa.</div>';
    return;
  }

  contenedor.innerHTML = "";
  const div = document.createElement("div");
  div.className = "map-container";
  contenedor.appendChild(div);

  const mapa = L.map(div).setView([23.0, -100.5], 5);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: "© OpenStreetMap",
  }).addTo(mapa);

  const iconInstalacion = L.circleMarker ? null : null;
  const grupoInstalaciones = L.layerGroup().addTo(mapa);
  const grupoIncidentes = L.layerGroup().addTo(mapa);
  const grupoRutas = L.layerGroup().addTo(mapa);

  const features = filtrado ? geojson.features : geojson.features;
  for (const f of features) {
    const p = f.properties;
    const g = f.geometry;
    if (!g) continue;
    if (p.tipoEnt === "ruta") {
      const linea = L.polyline(g.coordinates.map(c => [c[1], c[0]]), { color: "#176B65", weight: 3, opacity: 0.6 });
      linea.bindPopup(`<strong>${p.nombre || p.id}</strong><br>Trayecto de referencia simulado`);
      linea.addTo(grupoRutas);
    } else if (p.tipoEnt === "incidente") {
      const m = L.circleMarker([g.coordinates[1], g.coordinates[0]], {
        radius: 5, color: "#B91C1C", fillColor: "#B91C1C", fillOpacity: 0.8,
      });
      m.bindPopup(`<strong>${p.tipo}</strong><br>${p.id} (${p.gravedad || "—"})`);
      m.addTo(grupoIncidentes);
    } else {
      const m = L.circleMarker([g.coordinates[1], g.coordinates[0]], {
        radius: 6, color: "#24476A", fillColor: "#24476A", fillOpacity: 0.9,
      });
      m.bindPopup(`<strong>${p.nombre}</strong><br>${p.id} · ${p.ciudad || ""}`);
      m.addTo(grupoInstalaciones);
    }
  }

  const overlay = {
    "Instalaciones": grupoInstalaciones,
    "Incidentes": grupoIncidentes,
    "Rutas (simuladas)": grupoRutas,
  };
  L.control.layers(null, overlay, { collapsed: false }).addTo(mapa);

  const legend = document.createElement("div");
  legend.className = "map-legend";
  legend.innerHTML = `
    <span class="legend-dot instalacion"></span>Instalaciones
    <span class="legend-dot incidente"></span>Incidentes
    <span class="legend-dot ruta"></span>Rutas (Trayecto de referencia simulado)
  `;
  contenedor.appendChild(legend);

  instanciaMapa = mapa;
  setTimeout(() => { try { mapa.invalidateSize(); } catch (e) { /* ignore */ } }, 60);
}

function destruirMapa() {
  if (instanciaMapa) {
    try { instanciaMapa.remove(); } catch (e) { /* ignore */ }
    instanciaMapa = null;
  }
}

export { renderMapa, destruirMapa };
