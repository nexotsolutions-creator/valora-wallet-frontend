import { afterEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "../services/apiClient";
import {
  completeProfile,
  googleLogin,
  login,
  register,
  requestPasswordReset,
  resetPassword,
} from "./authService";

vi.mock("../services/apiClient", () => ({
  apiFetch: vi.fn(),
}));

const mockedApiFetch = vi.mocked(apiFetch);

afterEach(() => {
  mockedApiFetch.mockReset();
});

const authResponse = {
  token: "jwt-123",
  user: { id: "u1", email: "ana@valora.com" },
  wallet: { id: "w1" },
};

describe("login", () => {
  it("llama a POST /auth/login con email y password, y desenvuelve {data}", async () => {
    mockedApiFetch.mockResolvedValue({ success: true, data: authResponse });
    const result = await login("ana@valora.com", "pass123");
    expect(mockedApiFetch).toHaveBeenCalledWith("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "ana@valora.com", password: "pass123" }),
    });
    expect(result).toEqual(authResponse);
  });
});

describe("register", () => {
  it("manda country = AR por default cuando no se pasa", async () => {
    mockedApiFetch.mockResolvedValue({ success: true, data: authResponse });
    await register("ana@valora.com", "pass123", "Ana", "Pérez", "1990-01-01", "+541122334455", "12345678");
    expect(mockedApiFetch).toHaveBeenCalledWith("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: "ana@valora.com",
        password: "pass123",
        firstName: "Ana",
        lastName: "Pérez",
        dateOfBirth: "1990-01-01",
        phone: "+541122334455",
        du: "12345678",
        country: "AR",
      }),
    });
  });

  it("respeta un country explícito en vez del default", async () => {
    mockedApiFetch.mockResolvedValue({ success: true, data: authResponse });
    await register("ana@valora.com", "pass123", "Ana", "Pérez", "1990-01-01", "+541122334455", "12345678", "UY");
    const body = JSON.parse(mockedApiFetch.mock.calls[0][1]?.body as string);
    expect(body.country).toBe("UY");
  });
});

describe("googleLogin", () => {
  it("llama a POST /auth/google con el idToken y desenvuelve {data}", async () => {
    mockedApiFetch.mockResolvedValue({ success: true, data: authResponse });
    const result = await googleLogin("id-token-xyz");
    expect(mockedApiFetch).toHaveBeenCalledWith("/auth/google", {
      method: "POST",
      body: JSON.stringify({ idToken: "id-token-xyz" }),
    });
    expect(result).toEqual(authResponse);
  });
});

describe("completeProfile", () => {
  it("llama a PATCH /auth/me con el token y desenvuelve data.user", async () => {
    const user = { id: "u1", firstName: "Ana" };
    mockedApiFetch.mockResolvedValue({ success: true, data: { user } });
    const result = await completeProfile("+541122334455", "AR", "12345678", "15/05/2000", "token-abc");
    expect(mockedApiFetch).toHaveBeenCalledWith("/auth/me", {
      method: "PATCH",
      token: "token-abc",
      body: JSON.stringify({ phone: "+541122334455", country: "AR", du: "12345678", dateOfBirth: "15/05/2000" }),
    });
    expect(result).toEqual(user);
  });
});

describe("requestPasswordReset", () => {
  it("llama a POST /auth/forgot-password con el email", async () => {
    mockedApiFetch.mockResolvedValue({ message: "Si el email existe, te llega un link." });
    await requestPasswordReset("ana@valora.com");
    expect(mockedApiFetch).toHaveBeenCalledWith("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email: "ana@valora.com" }),
    });
  });
});

describe("resetPassword", () => {
  it("llama a POST /auth/reset-password con token y password", async () => {
    mockedApiFetch.mockResolvedValue({ message: "Contraseña actualizada." });
    await resetPassword("reset-token-abc", "nuevaPass123");
    expect(mockedApiFetch).toHaveBeenCalledWith("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token: "reset-token-abc", password: "nuevaPass123" }),
    });
  });
});
