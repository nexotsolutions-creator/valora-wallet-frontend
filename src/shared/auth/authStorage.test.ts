import { afterEach, describe, expect, it, vi } from "vitest";
import { isValidStoredAuth, readStoredAuth } from "./authStorage";

const validAuth = {
  token: "jwt-123",
  user: { id: "u1", email: "ana@valora.com" },
  wallet: { id: "w1", balances: [] },
};

function stubSessionStorage(raw: string | null) {
  vi.stubGlobal("sessionStorage", {
    getItem: vi.fn(() => raw),
  } as unknown as Storage);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("isValidStoredAuth", () => {
  it("acepta un objeto con token, user.id y wallet.id", () => {
    expect(isValidStoredAuth(validAuth)).toBe(true);
  });

  it("rechaza el shape viejo con walletId: string en vez de wallet: Wallet", () => {
    const legacyShape = { token: "jwt-123", user: { id: "u1" }, walletId: "w1" };
    expect(isValidStoredAuth(legacyShape)).toBe(false);
  });

  it("rechaza si falta token", () => {
    expect(isValidStoredAuth({ user: { id: "u1" }, wallet: { id: "w1" } })).toBe(false);
  });

  it("rechaza si user.id no es string", () => {
    expect(isValidStoredAuth({ token: "jwt-123", user: { id: 1 }, wallet: { id: "w1" } })).toBe(false);
  });

  it("rechaza null", () => {
    expect(isValidStoredAuth(null)).toBe(false);
  });

  it("rechaza un array", () => {
    expect(isValidStoredAuth([])).toBe(false);
  });

  it("rechaza un string suelto", () => {
    expect(isValidStoredAuth("jwt-123")).toBe(false);
  });
});

describe("readStoredAuth", () => {
  it("devuelve la sesión guardada cuando el JSON es válido", () => {
    stubSessionStorage(JSON.stringify(validAuth));
    expect(readStoredAuth()).toEqual(validAuth);
  });

  it("devuelve null cuando no hay nada guardado", () => {
    stubSessionStorage(null);
    expect(readStoredAuth()).toBeNull();
  });

  it("devuelve null (no tira) cuando el JSON está corrupto", () => {
    stubSessionStorage("{not-valid-json");
    expect(readStoredAuth()).toBeNull();
  });

  it("devuelve null cuando el JSON es válido pero no tiene la forma de StoredAuth", () => {
    stubSessionStorage(JSON.stringify({ token: "jwt-123", user: {}, walletId: "w1" }));
    expect(readStoredAuth()).toBeNull();
  });

  it("devuelve null (no tira) cuando sessionStorage.getItem tira", () => {
    vi.stubGlobal("sessionStorage", {
      getItem: vi.fn(() => {
        throw new Error("blocked");
      }),
    } as unknown as Storage);
    expect(readStoredAuth()).toBeNull();
  });
});
