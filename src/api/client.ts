import { appConfig } from "../config";
import { ApiRequestError, failureFromResponse } from "./errors";
import type { CsrfToken } from "./types";

const base = appConfig.apiBasePath;
let onUnauthorized: (() => void) | undefined;

export function setUnauthorizedHandler(handler: (() => void) | undefined) {
  onUnauthorized = handler;
}

async function csrfToken(): Promise<CsrfToken> {
  const response = await fetch(base + "/auth/csrf", {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) throw await requestError(response);
  const token = await response.json() as CsrfToken;
  if (!token.token || token.headerName !== "X-CSRF-TOKEN") {
    throw new Error("La respuesta CSRF no coincide con el contrato OpenAPI v1.");
  }
  return token;
}

export interface ApiRequestOptions extends Omit<RequestInit, "body"> {
  body?: BodyInit | null;
  json?: unknown;
}

async function request<T>(path: string, options: ApiRequestOptions = {}, retryCsrf = true): Promise<T> {
  if (!path.startsWith("/") || path.startsWith("//")) throw new Error("La ruta debe ser relativa al contrato.");
  const method = (options.method ?? "GET").toUpperCase();
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  let body = options.body;
  if (options.json !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(options.json);
  }
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    const csrf = await csrfToken();
    headers.set(csrf.headerName, csrf.token);
  }

  let response: Response;
  try {
    response = await fetch(base + path, {
      ...options,
      method,
      body,
      headers,
      credentials: "include",
      cache: "no-store",
    });
  } catch {
    throw new ApiRequestError({ kind: "network", message: "No se pudo conectar con el servidor.", fields: [] });
  }

  if (response.status === 403 && retryCsrf && method !== "GET") {
    const payload = await response.clone().json().catch(() => undefined);
    const failure = failureFromResponse(response.status, payload);
    if (failure.kind === "csrf") return request<T>(path, options, false);
  }
  if (!response.ok) throw await requestError(response);
  if (response.status === 204) return undefined as T;
  return await response.json() as T;
}

async function requestError(response: Response): Promise<ApiRequestError> {
  const payload = await response.json().catch(() => undefined);
  const failure = failureFromResponse(response.status, payload, response.headers.get("Retry-After") ?? undefined);
  if (failure.kind === "unauthorized") onUnauthorized?.();
  return new ApiRequestError(failure);
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>(path);
}
export function apiSend<T>(path: string, method: "POST" | "PUT", json?: unknown): Promise<T> {
  return request<T>(path, { method, json });
}
export function apiUpload<T>(path: string, form: FormData): Promise<T> {
  return request<T>(path, { method: "POST", body: form });
}
export async function apiBlob(path: string): Promise<Blob> {
  if (!path.startsWith("/") || path.startsWith("//")) throw new Error("La ruta debe ser relativa al contrato.");
  const response = await fetch(base + path, { credentials: "include", cache: "no-store" });
  if (!response.ok) throw await requestError(response);
  return response.blob();
}
export async function readCsrf(): Promise<CsrfToken> {
  return csrfToken();
}
