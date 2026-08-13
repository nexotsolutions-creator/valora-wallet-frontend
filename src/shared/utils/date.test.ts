import { describe, expect, it } from "vitest";
import { toBackendDate } from "./date";

// MAX_BIRTHDATE/getMaxBirthdate quedan afuera de esta tanda a propósito: dependen
// de new Date() (reloj real, no determinístico entre corridas) — testearlas en
// serio requiere fake timers (vi.setSystemTime()), trabajo aparte.
describe("toBackendDate", () => {
  it("convierte una fecha ISO común a DD/MM/YYYY", () => {
    expect(toBackendDate("1995-05-15")).toBe("15/05/1995");
  });

  it("preserva un 29/02 de año bisiesto (no valida bisiesto, solo reordena)", () => {
    expect(toBackendDate("2028-02-29")).toBe("29/02/2028");
  });
});
