// SESPATE — Punto de entrada de la aplicación.

import { MODULOS, ARCHIVO_MODULO, MARCA } from "./config.js";
import { cargarDatos } from "./data-loader.js";
import { estado, suscribir, notificar, setDatos, setModulo, setFiltro, limpiarFiltros, getFiltros } from "./state.js";
import { OPCIONES_GLOBALES, construirOpciones, construirContexto, describirFiltros } from "./filtros.js";
import { construirNavegacion } from "./navegacion.js";
import { destruirTodo, redimensionarTodo } from "./charts.js";
import { destruirMapa } from "./mapas.js";

const FILTROS_NO_APLICABLES_POR_MODULO = {
  "06": ["clienteId", "instalacionId", "contratoId", "ciudad", "zona", "tipoServicio"],
};

async function renderModuloActual() {
  const cont = document.getElementById("moduleArea");
  const modulo = MODULOS.find(m => m.id === estado.moduloActual) || MODULOS[0];

  destruirTodo();
  destruirMapa();

  try {
    const mod = await import(`./modulos/${ARCHIVO_MODULO[modulo.id]}`);
    if (modulo.funcional) {
      const ctx = construirContexto(estado.datos, getFiltros(), modulo.id);
      mod.default.render(ctx, cont);
    } else {
      mod.default.render(null, cont);
    }
  } catch (err) {
    console.error("Error al renderizar módulo:", err);
    cont.innerHTML = `<div class="state-msg error">Error al cargar el módulo: ${String(err.message || err)}</div>`;
  }

  actualizarAplicabilidadFiltros();
  actualizarResumenFiltros();
}

function construirFilterBar() {
  const bar = document.getElementById("filterBar");
  const opciones = construirOpciones(estado.datos);
  bar.innerHTML = "";

  for (const opt of OPCIONES_GLOBALES) {
    const label = document.createElement("label");
    label.dataset.filtro = opt.clave;
    const span = document.createElement("span");
    span.textContent = opt.etiqueta;
    label.appendChild(span);

    if (opt.tipo === "date") {
      const input = document.createElement("input");
      input.type = "date";
      input.id = `filtro-${opt.clave}`;
      input.addEventListener("change", (e) => setFiltro(opt.clave, e.target.value));
      label.appendChild(input);
    } else {
      const select = document.createElement("select");
      select.id = `filtro-${opt.clave}`;
      const vacia = document.createElement("option");
      vacia.value = "";
      vacia.textContent = "Todos";
      select.appendChild(vacia);
      const vals = opciones[opt.clave] || [];
      for (const v of vals) {
        const o = document.createElement("option");
        if (typeof v === "object") { o.value = v.v; o.textContent = v.t; }
        else { o.value = v; o.textContent = v; }
        select.appendChild(o);
      }
      select.addEventListener("change", (e) => setFiltro(opt.clave, e.target.value));
      label.appendChild(select);
    }
    bar.appendChild(label);
  }
}

function actualizarAplicabilidadFiltros() {
  const noAplicables = FILTROS_NO_APLICABLES_POR_MODULO[estado.moduloActual] || [];
  for (const label of document.querySelectorAll("#filterBar label")) {
    const clave = label.dataset.filtro;
    const noAplica = noAplicables.includes(clave);
    const control = label.querySelector("select, input");
    if (control) control.disabled = noAplica;
    label.title = noAplica ? "No aplica en este módulo" : "";
  }
}

function actualizarResumenFiltros() {
  const el = document.getElementById("filterSummary");
  const f = getFiltros();
  el.textContent = describirFiltros(f);
  if (FILTROS_NO_APLICABLES_POR_MODULO[estado.moduloActual]?.length) {
    el.textContent += " · Algunos filtros de cliente no aplican en este módulo.";
  }
}

function limpiarTodo() {
  limpiarFiltros();
  document.querySelectorAll("#filterBar select, #filterBar input").forEach(el => { el.value = ""; });
  notificar();
}

function initTema() {
  const guardado = localStorage.getItem("sespate-tema");
  if (guardado === "dark") document.documentElement.dataset.theme = "dark";
  document.getElementById("themeToggle").addEventListener("click", () => {
    const actual = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
    const nuevo = actual === "dark" ? "light" : "dark";
    if (nuevo === "dark") { document.documentElement.dataset.theme = "dark"; localStorage.setItem("sespate-tema", "dark"); }
    else { delete document.documentElement.dataset.theme; localStorage.setItem("sespate-tema", "light"); }
    notificar();
  });
}

async function boot() {
  const area = document.getElementById("moduleArea");
  area.innerHTML = `<div class="state-msg" id="estadoCarga">Cargando datos…</div>`;

  try {
    const datos = await cargarDatos();
    setDatos(datos);
  } catch (err) {
    console.error(err);
    area.innerHTML = `<div class="state-msg error">No se pudieron cargar los datos. Asegúrate de iniciar el servidor local.<br>
      <button class="btn retry" type="button" onclick="location.reload()">Reintentar</button></div>`;
    return;
  }

  initTema();
  construirNavegacion(document.getElementById("navList"), estado.moduloActual, (id) => { setModulo(id); });
  construirFilterBar();

  document.getElementById("btnAplicar").addEventListener("click", () => notificar());
  document.getElementById("btnLimpiar").addEventListener("click", limpiarTodo);
  document.getElementById("navToggle").addEventListener("click", () => {
    document.getElementById("navList").classList.toggle("open");
  });

  suscribir(() => {
    construirNavegacion(document.getElementById("navList"), estado.moduloActual, (id) => { setModulo(id); });
    renderModuloActual();
  });

  let temporizadorResize = null;
  window.addEventListener("resize", () => {
    clearTimeout(temporizadorResize);
    temporizadorResize = setTimeout(() => redimensionarTodo(), 180);
  });

  await renderModuloActual();
}

boot();
