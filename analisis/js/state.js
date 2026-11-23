// SESPATE — Estado global (filtros, módulo actual, datos cargados).

const estado = {
  datos: null,
  moduloActual: "01",
  filtros: {
    fechaInicial: "",
    fechaFinal: "",
    mes: "",
    anio: "",
    clienteId: "",
    instalacionId: "",
    contratoId: "",
    ciudad: "",
    zona: "",
    tipoServicio: "",
  },
  // Filtros específicos por módulo
  filtrosModulo: {},
  escuchadores: new Set(),
};

function suscribir(fn) {
  estado.escuchadores.add(fn);
  return () => estado.escuchadores.delete(fn);
}

function notificar() {
  for (const fn of estado.escuchadores) fn(estado);
}

function setDatos(datos) {
  estado.datos = datos;
  notificar();
}

function setModulo(id) {
  estado.moduloActual = id;
  notificar();
}

function setFiltro(clave, valor) {
  estado.filtros[clave] = valor;
}

function setFiltros(nuevos) {
  estado.filtros = { ...estado.filtros, ...nuevos };
}

function limpiarFiltros() {
  estado.filtros = {
    fechaInicial: "", fechaFinal: "", mes: "", anio: "", clienteId: "",
    instalacionId: "", contratoId: "", ciudad: "", zona: "", tipoServicio: "",
  };
  estado.filtrosModulo = {};
}

function setFiltroModulo(moduloId, clave, valor) {
  if (!estado.filtrosModulo[moduloId]) estado.filtrosModulo[moduloId] = {};
  estado.filtrosModulo[moduloId][clave] = valor;
}

function getFiltros() {
  return { ...estado.filtros };
}

function getFiltrosModulo(moduloId) {
  return estado.filtrosModulo[moduloId] || {};
}

export {
  estado, suscribir, notificar, setDatos, setModulo, setFiltro, setFiltros,
  limpiarFiltros, setFiltroModulo, getFiltros, getFiltrosModulo,
};
