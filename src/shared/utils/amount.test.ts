import { describe, expect, it } from "vitest";
import { INVALID_AMOUNT_MESSAGE, parsePositiveAmount } from "./amount";

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
