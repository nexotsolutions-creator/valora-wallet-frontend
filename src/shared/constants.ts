export const SUPPORT_EMAIL = "nexot.solutions@gmail.com";

// Prefijo de la key de localStorage del historial del chatbot — la key final
// es `${CHATBOT_HISTORY_KEY_PREFIX}${userId}`. Compartido entre
// features/chatbot/useChatbot.ts (lee/escribe el historial) y
// shared/auth/AuthProvider.tsx (lo borra en logout), para que los dos
// construyan exactamente la misma key sin duplicar el string a mano.
// Convención para cualquier localStorage por-usuario nuevo: key con el userId
// scopeado así (nunca datos de un usuario visibles/mezclados con los de otro
// en el mismo dispositivo), prefijo como constante acá en vez de hardcodeado
// en cada lugar que lo usa, y limpieza explícita en logout().
export const CHATBOT_HISTORY_KEY_PREFIX = "chatbot_history_";

// Prefijo de la key de localStorage de notificaciones ya vistas — la key final
// es `${NOTIF_SEEN_KEY_PREFIX}${userId}`. Mismo patrón que
// CHATBOT_HISTORY_KEY_PREFIX de arriba: compartido entre
// layouts/DashboardLayout/DashboardLayout.tsx (lee/escribe qué notificaciones
// ya se vieron) y shared/auth/AuthProvider.tsx (lo borra en logout).
export const NOTIF_SEEN_KEY_PREFIX = "notif_seen_";

export interface PhoneCountryCode {
  code: string;
  dialCode: string;
  flag: string;
  label: string;
  // Número de ejemplo completo (prefijo + local), formato típico del país —
  // puramente ilustrativo para el placeholder del campo de celular (ver
  // Registro.tsx), nunca se manda tal cual al backend. Igual criterio que se
  // usó para no traer libphonenumber-js al front: dato armado a mano, la
  // validación real de formato la hace el backend (validarCelular,
  // phoneValidation.ts, con libphonenumber-js/max).
  example: string;
}

// Lista estática propia (sin libphonenumber-js del lado del front, ver
// CompleteProfileModal) — los 19 países LATAM que acepta el backend
// (PAISES_LATAM en authSchema.ts, mismo orden) más US/ES, comunes fuera de la
// región. Selector de prefijo de celular, independiente del selector de país
// de residencia (que reusa esta misma lista filtrada a los 19 LATAM) — un
// usuario puede vivir en un país y tener un celular con prefijo de otro.
export const PHONE_COUNTRY_CODES: PhoneCountryCode[] = [
  // dialCode "+549", no "+54": los celulares argentinos necesitan el 9 extra
  // después del +54 para que libphonenumber-js/max (lo que usa el backend
  // real, ver phoneValidation.ts) los tipe como MOBILE en vez de FIXED_LINE
  // — confirmado con parsePhoneNumberFromString: "+541156161313" da
  // FIXED_LINE (el backend lo rechaza), "+5491156161313" da MOBILE (lo
  // acepta). Efecto secundario aceptado: el selector muestra "AR (+549)" en
  // vez de "AR (+54)".
  { code: "AR", dialCode: "+549", flag: "🇦🇷", label: "Argentina", example: "+54 9 11 1234-5678" },
  { code: "BO", dialCode: "+591", flag: "🇧🇴", label: "Bolivia", example: "+591 712 34567" },
  { code: "BR", dialCode: "+55", flag: "🇧🇷", label: "Brasil", example: "+55 11 91234-5678" },
  { code: "CL", dialCode: "+56", flag: "🇨🇱", label: "Chile", example: "+56 9 6123 4567" },
  { code: "CO", dialCode: "+57", flag: "🇨🇴", label: "Colombia", example: "+57 301 2345678" },
  { code: "CR", dialCode: "+506", flag: "🇨🇷", label: "Costa Rica", example: "+506 8123 4567" },
  { code: "CU", dialCode: "+53", flag: "🇨🇺", label: "Cuba", example: "+53 5 1234567" },
  { code: "EC", dialCode: "+593", flag: "🇪🇨", label: "Ecuador", example: "+593 99 123 4567" },
  { code: "SV", dialCode: "+503", flag: "🇸🇻", label: "El Salvador", example: "+503 7123 4567" },
  { code: "GT", dialCode: "+502", flag: "🇬🇹", label: "Guatemala", example: "+502 5123 4567" },
  { code: "HN", dialCode: "+504", flag: "🇭🇳", label: "Honduras", example: "+504 9123-4567" },
  { code: "MX", dialCode: "+52", flag: "🇲🇽", label: "México", example: "+52 55 1234 5678" },
  { code: "NI", dialCode: "+505", flag: "🇳🇮", label: "Nicaragua", example: "+505 8123 4567" },
  { code: "PA", dialCode: "+507", flag: "🇵🇦", label: "Panamá", example: "+507 6123-4567" },
  { code: "PY", dialCode: "+595", flag: "🇵🇾", label: "Paraguay", example: "+595 981 123456" },
  { code: "PE", dialCode: "+51", flag: "🇵🇪", label: "Perú", example: "+51 912 345 678" },
  { code: "DO", dialCode: "+1", flag: "🇩🇴", label: "República Dominicana", example: "+1 809 123 4567" },
  { code: "UY", dialCode: "+598", flag: "🇺🇾", label: "Uruguay", example: "+598 94 123 456" },
  { code: "VE", dialCode: "+58", flag: "🇻🇪", label: "Venezuela", example: "+58 412-1234567" },
  { code: "US", dialCode: "+1", flag: "🇺🇸", label: "Estados Unidos", example: "+1 201 555 0123" },
  { code: "ES", dialCode: "+34", flag: "🇪🇸", label: "España", example: "+34 612 34 56 78" },
];

// Los 19 países LATAM que acepta country (residencia) son un subconjunto de
// PHONE_COUNTRY_CODES (esa lista suma US/ES, que no son de residencia válida)
// — se reusa la misma lista filtrada en vez de duplicar un segundo mapa de
// nombres de país. Centralizado acá (antes duplicado en CompleteProfileModal.tsx
// y Registro.tsx) con Usuario.tsx como tercer consumidor real.
export const RESIDENCE_COUNTRY_CODES = PHONE_COUNTRY_CODES.filter(
  (entry) => entry.code !== "US" && entry.code !== "ES",
);
