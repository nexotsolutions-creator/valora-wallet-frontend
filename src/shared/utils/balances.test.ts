import { describe, expect, it } from "vitest";
import { balanceFor } from "./balances";
import type { Balance } from "../types/models";

const balances: Balance[] = [
  { id: "1", walletId: "w1", currencyCode: "USD", amount: 100 },
  { id: "2", walletId: "w1", currencyCode: "ARS", amount: 5000 },
];

describe("balanceFor", () => {
  it("devuelve el amount de la moneda pedida cuando existe", () => {
    expect(balanceFor(balances, "USD")).toBe(100);
  });

  it("devuelve 0 si la moneda no está en la lista de balances", () => {
    expect(balanceFor(balances, "EUR")).toBe(0);
  });

  it("devuelve 0 si balances es null", () => {
    expect(balanceFor(null, "USD")).toBe(0);
  });
});
