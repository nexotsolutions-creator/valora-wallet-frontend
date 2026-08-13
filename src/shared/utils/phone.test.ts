import { describe, expect, it } from "vitest";
import { resolveE164Phone } from "./phone";

describe("resolveE164Phone", () => {
  it("Argentina: antepone +549 (el 9 extra que exige el backend para MOBILE, no +54)", () => {
    expect(resolveE164Phone("AR", "1112345678")).toBe("+5491112345678");
  });

  it("sanitiza espacios, guiones y paréntesis del número local", () => {
    expect(resolveE164Phone("AR", "(11) 1234-5678")).toBe("+549" + "1112345678");
  });

  it("código inexistente en PHONE_COUNTRY_CODES: dialCode queda vacío, no la función entera", () => {
    // Documentado en phone.ts: no debería pasar en la práctica (los 3 consumidores
    // solo ofrecen valores reales de la lista en su selector), pero es el fallback
    // real si igual llegara a pasar.
    expect(resolveE164Phone("ZZ", "1112345678")).toBe("1112345678");
  });

  it("DO y US comparten dialCode +1, cada uno resuelve el suyo por code, no se pisan", () => {
    expect(resolveE164Phone("DO", "8091234567")).toBe("+18091234567");
    expect(resolveE164Phone("US", "2015550123")).toBe("+12015550123");
  });
});
