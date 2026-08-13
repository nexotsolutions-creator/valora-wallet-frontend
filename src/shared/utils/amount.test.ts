import { describe, expect, it } from "vitest";
import { formatCompactAmount, INVALID_AMOUNT_MESSAGE, parsePositiveAmount } from "./amount";

describe("parsePositiveAmount", () => {
  it("acepta un decimal válido y lo devuelve como number", () => {
    expect(parsePositiveAmount("125.50")).toBe(125.5);
  });

  it("rechaza un número negativo", () => {
    expect(parsePositiveAmount("-10")).toBeNull();
  });

  it("rechaza cero", () => {
    expect(parsePositiveAmount("0")).toBeNull();
  });

  it("rechaza un string no numérico", () => {
    expect(parsePositiveAmount("abc")).toBeNull();
  });

  it("rechaza un string vacío", () => {
    expect(parsePositiveAmount("")).toBeNull();
  });
});

describe("INVALID_AMOUNT_MESSAGE", () => {
  it("es el mensaje esperado por los 3 consumidores (ExchangeForm/ConversionModal/Dashboard)", () => {
    expect(INVALID_AMOUNT_MESSAGE).toBe("Ingresá un monto válido, mayor a cero.");
  });
});

describe("formatCompactAmount", () => {
  it("debajo de 1 millón, devuelve el número completo con separador de miles es-AR", () => {
    expect(formatCompactAmount(10000)).toBe("10.000");
  });

  it("con decimales debajo de 1 millón, redondea a 2 decimales", () => {
    expect(formatCompactAmount(1234.5)).toBe("1.234,5");
  });

  it("exactamente 1 millón, abrevia a 1M", () => {
    expect(formatCompactAmount(1_000_000)).toBe("1M");
  });

  it("10 millones (tope real de ARS por transacción), abrevia a 10M", () => {
    expect(formatCompactAmount(10_000_000)).toBe("10M");
  });

  it("un millón y medio, abrevia con un decimal", () => {
    expect(formatCompactAmount(1_500_000)).toBe("1,5M");
  });

  it("cero se muestra como 0, no como compacto", () => {
    expect(formatCompactAmount(0)).toBe("0");
  });
});
