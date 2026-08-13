import { PHONE_COUNTRY_CODES } from "../constants";

// Extraído de CompleteProfileModal.tsx/EditPhoneModal.tsx/Registro.tsx, que
// repetían esta misma lógica byte a byte (hallazgo #1 de la code review del
// 12/08). El dialCode real se busca por el `code` elegido en el selector,
// nunca se guarda directo en el estado (DO/US comparten dialCode "+1", `code`
// es lo único que es único por país). `\D` saca cualquier caracter no
// numérico que el usuario haya tipeado o pegado en el número local (espacios,
// guiones, paréntesis, puntos — ej. al pegar "(11) 96123.4567" copiado de
// contactos) — el backend espera el string en formato E.164-like, prefijo
// pegado directo al número. Si `code` no matchea ninguna entrada en
// PHONE_COUNTRY_CODES, es `dialCode` el que queda en "" (no la función
// entera) — el resultado es el número local sanitizado solo, sin prefijo (no
// debería pasar — los 3 consumidores solo ofrecen valores de esa misma lista
// en su selector — pero es el mismo fallback que ya usaban los 3 antes de
// esta extracción, comportamiento sin cambios).
export function resolveE164Phone(code: string, local: string): string {
  const dialCode = PHONE_COUNTRY_CODES.find((entry) => entry.code === code)?.dialCode ?? "";
  const sanitizedLocal = local.replace(/\D/g, "");
  return `${dialCode}${sanitizedLocal}`;
}
