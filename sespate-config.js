/* ============================================================
   SESPATE — Configuración de emergencia (DEMO local)

   Los contactos reales (WhatsApp, SMS, correo) NO se publican en el
   frontend de GitHub Pages. Mientras estén vacíos, el sistema muestra
   el estado SIN_CONFIGURAR.

   La capacidad de envío automático real queda pendiente del backend
   Wix y de la configuración autorizada de contactos.
   ============================================================ */

export const emergencySettings = {
  // Configuración de SOS. contactos: [{ tipo: "whatsapp"|"sms"|"email", destino: "" }]
  sos: {
    configurado: false,
    contactos: [],
  },
  // Número de Policía de Proximidad para WhatsApp (vacío = no configurado).
  whatsappPolicia: "",
};
