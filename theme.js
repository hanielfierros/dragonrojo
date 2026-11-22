/* ============================================================
   SECURITYTRANS — Gestor global de tema (claro/oscuro)

   - Tema por defecto: claro (ignora prefers-color-scheme).
   - Preferencia persistida en localStorage (clave securitytrans:theme:v1).
   - Sincronización entre pestañas del mismo origen (storage event).
   - Iconos: luna en modo claro, sol en modo oscuro.
   ============================================================ */

(function () {
  const KEY = "securitytrans:theme:v1";

  function leer() {
    try {
      const v = localStorage.getItem(KEY);
      return (v === "dark" || v === "light") ? v : null;
    } catch (e) { return null; }
  }

  function aplicar(tema) {
    document.documentElement.setAttribute("data-theme", tema);
    try { localStorage.setItem(KEY, tema); } catch (e) { /* almacenamiento no disponible */ }
    actualizarIconos();
    window.dispatchEvent(new CustomEvent("securitytrans:theme", { detail: { tema } }));
  }

  function actualizarIconos() {
    const tema = document.documentElement.getAttribute("data-theme") || "light";
    document.querySelectorAll("[data-theme-toggle]").forEach(btn => {
      btn.textContent = tema === "dark" ? "☀" : "☾";
      btn.title = tema === "dark" ? "Activar modo claro" : "Activar modo oscuro";
      btn.setAttribute("aria-pressed", String(tema === "dark"));
    });
  }

  // Inicialización temprana (evita parpadeo). Por defecto CLARO.
  const temaInicial = leer() || "light";
  document.documentElement.setAttribute("data-theme", temaInicial);

  window.SecurityTransTheme = { aplicar, KEY };

  document.addEventListener("DOMContentLoaded", function () {
    actualizarIconos();
    document.querySelectorAll("[data-theme-toggle]").forEach(btn => {
      btn.addEventListener("click", function () {
        const actual = document.documentElement.getAttribute("data-theme");
        aplicar(actual === "dark" ? "light" : "dark");
      });
    });
  });

  // Sincronización entre pestañas del mismo origen
  window.addEventListener("storage", function (e) {
    if (e.key === KEY) {
      const tema = (e.newValue === "dark" || e.newValue === "light") ? e.newValue : "light";
      document.documentElement.setAttribute("data-theme", tema);
      actualizarIconos();
      window.dispatchEvent(new CustomEvent("securitytrans:theme", { detail: { tema } }));
    }
  });
})();
