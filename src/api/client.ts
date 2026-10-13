import { appConfig } from "../config";
import { failureFromResponse, type ApiFailure } from "./errors";
export class ApiRequestError extends Error {
  constructor(readonly failure: ApiFailure) { super(failure.message); this.name = "ApiRequestError"; }
}
export interface ContractRequest {
  path: string;
  init?: RequestInit;
  /** El adaptador aporta headers CSRF según el esquema documentado por la API. */
  csrfHeaders?: HeadersInit;
}
/** Transporte same-origin. Rutas, métodos, payloads y CSRF salen del contrato. */
export async function requestFromContract<T>({ path, init, csrfHeaders }: ContractRequest): Promise<T> {
  if (!path.startsWith("/") || path.startsWith("//")) throw new Error("La ruta debe ser relativa al mismo host.");
  let response: Response;
  try {
    const headers = new Headers(init?.headers);
    headers.set("Accept", "application/json");
    new Headers(csrfHeaders).forEach((value, key) => headers.set(key, value));
    response = await fetch(appConfig.apiBasePath + path, { ...init, credentials: "include", headers });
  } catch {
    throw new ApiRequestError({ kind: "network", message: "No se pudo conectar con el servidor." });
  }
  if (!response.ok) {
    const requestId = response.headers.get("x-request-id") ?? undefined;
    const payload = await response.json().catch(() => undefined);
    throw new ApiRequestError(failureFromResponse(response.status, payload, requestId));
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
