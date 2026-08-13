import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch, getApiErrorMessage, setUnauthorizedHandler } from "./apiClient";

function mockFetchOnce(options: { ok: boolean; status: number; body?: unknown }) {
  const headers = new Headers();
  if (options.body !== undefined) headers.set("Content-Type", "application/json");
  const fetchMock = vi.fn().mockResolvedValue({
    ok: options.ok,
    status: options.status,
    headers,
    json: async () => options.body,
  } as unknown as Response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  setUnauthorizedHandler(null);
});

describe("apiFetch", () => {
  it("agrega el header Authorization cuando se pasa token", async () => {
    const fetchMock = mockFetchOnce({ ok: true, status: 200, body: { ok: true } });
    await apiFetch("/ping", { token: "abc123" });
    const options = fetchMock.mock.calls[0][1] as RequestInit;
    expect((options.headers as Headers).get("Authorization")).toBe("Bearer abc123");
  });

  it("no agrega Authorization cuando no se pasa token", async () => {
    const fetchMock = mockFetchOnce({ ok: true, status: 200, body: {} });
    await apiFetch("/ping");
    const options = fetchMock.mock.calls[0][1] as RequestInit;
    expect((options.headers as Headers).has("Authorization")).toBe(false);
  });

  it("normaliza un path sin barra inicial", async () => {
    const fetchMock = mockFetchOnce({ ok: true, status: 200, body: {} });
    await apiFetch("auth/login", { method: "POST", body: JSON.stringify({}) });
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url.endsWith("/auth/login")).toBe(true);
    expect(url.includes("//auth")).toBe(false);
  });

  it("fuerza Content-Type: application/json cuando hay body string", async () => {
    const fetchMock = mockFetchOnce({ ok: true, status: 200, body: {} });
    await apiFetch("/auth/login", { method: "POST", body: JSON.stringify({ a: 1 }) });
    const options = fetchMock.mock.calls[0][1] as RequestInit;
    expect((options.headers as Headers).get("Content-Type")).toBe("application/json");
  });

  it("no fuerza Content-Type cuando el body es FormData", async () => {
    const fetchMock = mockFetchOnce({ ok: true, status: 200, body: {} });
    await apiFetch("/upload", { method: "POST", body: new FormData() });
    const options = fetchMock.mock.calls[0][1] as RequestInit;
    expect((options.headers as Headers).has("Content-Type")).toBe(false);
  });

  it("no fuerza Content-Type en un GET sin body", async () => {
    const fetchMock = mockFetchOnce({ ok: true, status: 200, body: {} });
    await apiFetch("/transactions");
    const options = fetchMock.mock.calls[0][1] as RequestInit;
    expect((options.headers as Headers).has("Content-Type")).toBe(false);
  });

  it("devuelve el body parseado cuando la respuesta es ok", async () => {
    mockFetchOnce({ ok: true, status: 200, body: { success: true, data: { id: "1" } } });
    const result = await apiFetch<{ success: boolean; data: { id: string } }>("/x");
    expect(result).toEqual({ success: true, data: { id: "1" } });
  });

  it("devuelve undefined en 204 sin intentar parsear el body", async () => {
    const jsonSpy = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      headers: new Headers(),
      json: jsonSpy,
    } as unknown as Response);
    vi.stubGlobal("fetch", fetchMock);
    const result = await apiFetch("/x", { method: "DELETE" });
    expect(result).toBeUndefined();
    expect(jsonSpy).not.toHaveBeenCalled();
  });

  it("lanza ApiError con el mensaje de `message` cuando la respuesta no es ok", async () => {
    mockFetchOnce({ ok: false, status: 400, body: { message: "Credenciales inválidas." } });
    await expect(apiFetch("/auth/login")).rejects.toMatchObject({
      message: "Credenciales inválidas.",
      status: 400,
    });
  });

  it("cae a `error` cuando `message` no es un string usable", async () => {
    mockFetchOnce({ ok: false, status: 400, body: { error: "RATE_NOT_AVAILABLE" } });
    await expect(apiFetch("/x")).rejects.toMatchObject({ message: "RATE_NOT_AVAILABLE" });
  });

  it("cae al mensaje genérico si no hay message ni error usables", async () => {
    mockFetchOnce({ ok: false, status: 500, body: { code: "boom" } });
    await expect(apiFetch("/x")).rejects.toMatchObject({
      message: "Ocurrió un error inesperado. Intentá de nuevo.",
    });
  });

  it("dispara el unauthorizedHandler en 401 solo si el request llevaba token", async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    mockFetchOnce({ ok: false, status: 401, body: { message: "Token inválido o expirado." } });
    await expect(apiFetch("/transactions", { token: "abc" })).rejects.toBeInstanceOf(ApiError);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("NO dispara el unauthorizedHandler en un 401 sin token (ej. login con credenciales inválidas)", async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    mockFetchOnce({ ok: false, status: 401, body: { message: "Credenciales inválidas." } });
    await expect(apiFetch("/auth/login")).rejects.toBeInstanceOf(ApiError);
    expect(handler).not.toHaveBeenCalled();
  });
});

describe("getApiErrorMessage", () => {
  it("devuelve el mensaje de un ApiError", () => {
    expect(getApiErrorMessage(new ApiError("Tasa no disponible.", 500))).toBe("Tasa no disponible.");
  });

  it("devuelve el mensaje genérico de conexión para errores que no son ApiError", () => {
    expect(getApiErrorMessage(new TypeError("Failed to fetch"))).toBe(
      "No se pudo conectar con el servidor. Intentá de nuevo.",
    );
  });
});
