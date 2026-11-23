// SESPATE — Análisis de Información — Configuración y catálogo de módulos.

export const MARCA = "DATOS FICTICIOS — DEMOSTRACIÓN";

export const PERIODO = {
  inicio: "2024-12-01",
  fin: "2026-11-22",
};

export const MODULOS = [
  { id: "01", icon: "📊", nombre: "Resumen Ejecutivo", desc: "Indicadores globales de la operación", funcional: true },
  { id: "02", icon: "🗺️", nombre: "Mapa Estratégico de Clientes", desc: "Distribución geográfica de clientes e instalaciones", funcional: false },
  { id: "03", icon: "⚠️", nombre: "Riesgos e Incidencia Delictiva", desc: "Niveles de riesgo y análisis de incidencia", funcional: false },
  { id: "04", icon: "🚔", nombre: "Inteligencia Vehicular", desc: "Rendimiento y costos de las patrullas", funcional: true },
  { id: "05", icon: "⛽", nombre: "Combustible", desc: "Consumo, costo y rendimiento", funcional: true },
  { id: "06", icon: "👥", nombre: "Personal de Seguridad", desc: "Horas, costos y desempeño del personal", funcional: true },
  { id: "07", icon: "🛣️", nombre: "Rutas y Patrullajes", desc: "Actividad y cumplimiento de rutas", funcional: true },
  { id: "08", icon: "🚨", nombre: "Incidentes y Emergencias", desc: "Atención y respuesta a incidentes", funcional: false },
  { id: "09", icon: "💰", nombre: "Rentabilidad por Cliente", desc: "Ingresos, costos y margen por cliente", funcional: false },
  { id: "10", icon: "✅", nombre: "Calidad y Cumplimiento", desc: "Checklists, evaluaciones y capacitaciones", funcional: false },
  { id: "11", icon: "📈", nombre: "Pronósticos y Planeación", desc: "Proyecciones y necesidades futuras", funcional: false },
  { id: "12", icon: "🔔", nombre: "Comparativos y Alertas Estratégicas", desc: "Alertas y comparativos consolidados", funcional: false },
];

// Mapeo de id de módulo a archivo JS en ./modulos/
export const ARCHIVO_MODULO = {
  "01": "01_resumen.js",
  "02": "02_mapa_clientes.js",
  "03": "03_riesgos.js",
  "04": "04_vehiculos.js",
  "05": "05_combustible.js",
  "06": "06_personal.js",
  "07": "07_rutas.js",
  "08": "08_incidentes.js",
  "09": "09_rentabilidad.js",
  "10": "10_calidad.js",
  "11": "11_pronosticos.js",
  "12": "12_comparativos_alertas.js",
};

export const COLORES = {
  primario: "#24476A",
  exito: "#176B65",
  alerta: "#B45309",
  error: "#B91C1C",
  info: "#24476A",
  simulado: "#6B46A1",
  serie: ["#24476A", "#176B65", "#B45309", "#6B46A1", "#B91C1C", "#7FA3C9"],
};

export const ESTIMADOS = new Set(["CMP-005", "CMP-007", "CMP-011", "CMP-013", "CMP-014", "CMP-015"]);

// Catálogo de comparativos (FASE 02) por módulo.
export const COMPARATIVOS = {
  "01": [
    { id: "CMP-016", nombre: "Cliente con más ingresos", kpi: "KPI-049", unidad: "MXN" },
    { id: "CMP-017", nombre: "Cliente más rentable", kpi: "KPI-051", unidad: "MXN" },
    { id: "CMP-020", nombre: "Mes con mayor margen", kpi: "KPI-054", unidad: "%" },
  ],
  "04": [
    { id: "CMP-001", nombre: "Patrulla que consume más combustible", kpi: "KPI-011", unidad: "L" },
    { id: "CMP-002", nombre: "Patrulla con peor rendimiento", kpi: "KPI-003", unidad: "km/L" },
    { id: "CMP-003", nombre: "Vehículo con mayor costo por km", kpi: "KPI-008", unidad: "MXN/km" },
    { id: "CMP-004", nombre: "Vehículo con más mantenimiento", kpi: "KPI-017", unidad: "MXN" },
    { id: "CMP-005", nombre: "Vehículo con más días fuera de servicio", kpi: "KPI-021", unidad: "días", estimacion: true },
  ],
  "06": [
    { id: "CMP-006", nombre: "Elemento con más reportes", kpi: "KPI-031", unidad: "#" },
    { id: "CMP-007", nombre: "Elemento que atiende más incidentes", kpi: "KPI-041", unidad: "#", estimacion: true },
    { id: "CMP-008", nombre: "Quién acumula más horas extra", kpi: "KPI-025", unidad: "h" },
    { id: "CMP-009", nombre: "Quién tiene mayor costo laboral", kpi: "KPI-027", unidad: "MXN" },
    { id: "CMP-010", nombre: "Quién presenta mejor puntualidad", kpi: "KPI-029", unidad: "%" },
  ],
  "07": [
    { id: "CMP-011", nombre: "Ruta que consume más combustible", kpi: "KPI-012", unidad: "MXN", estimacion: true },
    { id: "CMP-012", nombre: "Ruta con más kilómetros", kpi: "KPI-035", unidad: "km" },
    { id: "CMP-013", nombre: "Ruta con mayor costo por km", kpi: "KPI-037", unidad: "MXN/km", estimacion: true },
    { id: "CMP-014", nombre: "Ruta con más incidentes", kpi: "KPI-039", unidad: "#", estimacion: true },
    { id: "CMP-015", nombre: "Ruta con mejor cumplimiento", kpi: "KPI-038", unidad: "%", estimacion: true },
  ],
};
