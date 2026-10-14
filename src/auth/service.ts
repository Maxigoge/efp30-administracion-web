import { apiGet, apiSend, readCsrf } from "../api/client";
import type { LoginRequest, SessionResponse, SessionUser } from "../api/types";

export async function restoreSession(): Promise<SessionUser> {
  const response = await apiGet<SessionResponse>("/auth/me");
  return response.user;
}

export async function login(credentials: LoginRequest): Promise<SessionUser> {
  const response = await apiSend<SessionResponse>("/auth/login", "POST", credentials);
  // El contrato rota la sesión: renovar CSRF después del login. Cada escritura
  // vuelve a pedirlo y nunca se guarda en almacenamiento persistente.
  await readCsrf().catch(() => undefined);
  return response.user;
}

export async function logout(): Promise<void> {
  await apiSend<void>("/auth/logout", "POST", {});
  // Logout ya invalidó la cookie; pedir el token nuevo requerido para el próximo login.
  await readCsrf().catch(() => undefined);
}
