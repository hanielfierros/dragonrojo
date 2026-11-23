// SESPATE — Navegación de los 12 módulos.

import { MODULOS } from "./config.js";

function construirNavegacion(contenedor, activoId, alSeleccionar) {
  contenedor.innerHTML = "";
  for (const mod of MODULOS) {
    const item = document.createElement("button");
    item.className = "nav-item" + (mod.id === activoId ? " active" : "");
    item.type = "button";
    item.setAttribute("aria-current", mod.id === activoId ? "page" : undefined);
    item.innerHTML = `<span class="nav-icon" aria-hidden="true">${mod.icon}</span><span>${mod.nombre}</span>` +
      `<span class="nav-badge">${mod.funcional ? "" : "Próximo"}</span>`;
    item.addEventListener("click", () => alSeleccionar(mod.id));
    contenedor.appendChild(item);
  }
}

export { construirNavegacion };
