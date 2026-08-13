import { apiFetch } from "../services/apiClient";
import type { CountryCode, User, Wallet } from "../types/models";
import type {
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
} from "./passwordReset.types";

export interface AuthResponse {
  token: string;
  user: User;
  wallet: Wallet;
}

// El backend envuelve /auth/login, /auth/register y /auth/google en
// {success, data} desde el informe de sincronización de Santiago — antes
// devolvían el objeto plano directo. Se desenvuelve acá, una sola vez, así
// el resto del código (AuthProvider, callers) sigue trabajando con
// AuthResponse tal cual.
interface AuthApiResponse {
  success: boolean;
  data: AuthResponse;
}

export function login(email: string, password: string): Promise<AuthResponse> {
  return apiFetch<AuthApiResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  }).then((res) => res.data);
}

export function register(
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  dateOfBirth: string,
  phone: string,
  du: string,
  country: string = "AR",
): Promise<AuthResponse> {
  return apiFetch<AuthApiResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, firstName, lastName, dateOfBirth, phone, du, country }),
  }).then((res) => res.data);
}

// El backend envuelve la respuesta en {success, data: {user}} — mismo criterio
// que login/register.
interface CompleteProfileApiResponse {
  success: boolean;
  data: { user: User };
}

// Completa (o edita) celular/país/documento/fecha de nacimiento de la cuenta
// autenticada — pensado sobre todo para cuentas de Google, que no piden estos
// datos en el alta (ver CompleteProfileModal). phone va con el prefijo de país
// ya concatenado adentro del string (ej. "+5511961234567") — PATCH /auth/me no
// tiene un campo de prefijo separado del lado del backend. dateOfBirth va en
// DD/MM/YYYY, mismo formato que /auth/register (ver toBackendDate en
// shared/utils/date.ts) — completeProfileSchema (backend) ya valida y
// persiste este campo (verificado contra dev del backend, 14/08): si no
// viene, conserva la fecha existente vía COALESCE en updateUserProfile.
export function completeProfile(
  phone: string,
  country: CountryCode,
  du: string,
  dateOfBirth: string,
  token: string,
): Promise<User> {
  return apiFetch<CompleteProfileApiResponse>("/auth/me", {
    method: "PATCH",
    token,
    body: JSON.stringify({ phone, country, du, dateOfBirth }),
  }).then((res) => res.data.user);
}

// Activa/desactiva los emails transaccionales (depósito/compra/venta/
// intercambio/transferencia) de la cuenta autenticada — no afecta el email de
// recuperación de contraseña. Mismo shape de respuesta envuelta que
// completeProfile.
export function updateEmailNotifications(enabled: boolean, token: string): Promise<User> {
  return apiFetch<CompleteProfileApiResponse>("/auth/me/notifications", {
    method: "PATCH",
    token,
    body: JSON.stringify({ enabled }),
  }).then((res) => res.data.user);
}

interface DeleteAccountApiResponse {
  success: boolean;
  message: string;
}

// Elimina permanentemente la cuenta autenticada — DELETE /auth/me. password
// es opcional: el backend la exige solo si la cuenta tiene password_hash
// (deleteAccountSchema/deleteAccountController) — las cuentas de Google no
// tienen una que confirmar, y el frontend no tiene forma de saber de
// antemano cuál es cuál (el backend nunca expone ese dato). Si hace falta y
// no se mandó, el 400 del backend llega tal cual vía getApiErrorMessage.
export function deleteAccount(password: string | undefined, token: string): Promise<void> {
  return apiFetch<DeleteAccountApiResponse>("/auth/me", {
    method: "DELETE",
    token,
    body: JSON.stringify({ password }),
  }).then(() => undefined);
}

export function googleLogin(idToken: string): Promise<AuthResponse> {
  return apiFetch<AuthApiResponse>("/auth/google", {
    method: "POST",
    body: JSON.stringify({ idToken }),
  }).then((res) => res.data);
}

export function requestPasswordReset(email: string): Promise<ForgotPasswordResponse> {
  const body: ForgotPasswordRequest = { email };
  return apiFetch<ForgotPasswordResponse>("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function resetPassword(token: string, password: string): Promise<ResetPasswordResponse> {
  const body: ResetPasswordRequest = { token, password };
  return apiFetch<ResetPasswordResponse>("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
