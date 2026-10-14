import type { FieldError, Problem } from "./types";

export type ApiFailureKind =
  | "unauthorized" | "forbidden" | "csrf" | "validation" | "conflict"
  | "upload" | "rate-limit" | "network" | "server" | "unknown";

export interface ApiFailure {
  kind: ApiFailureKind;
  status?: number;
  code?: string;
  message: string;
  fields: FieldError[];
  retryAfter?: string;
}

export class ApiRequestError extends Error {
  constructor(readonly failure: ApiFailure) {
    super(failure.message);
    this.name = "ApiRequestError";
  }
}

export function failureFromResponse(status: number, payload: unknown, retryAfter?: string): ApiFailure {
  const problem = isProblem(payload) ? payload : undefined;
  const code = problem?.code;
  const message = problem?.detail ?? defaultMessage(status);
  if (status === 401) return { kind: "unauthorized", status, code, message, fields: problem?.fieldErrors ?? [] };
  if (status === 403 && code === "CSRF_INVALID") return { kind: "csrf", status, code, message, fields: problem?.fieldErrors ?? [] };
  if (status === 403) return { kind: "forbidden", status, code, message, fields: problem?.fieldErrors ?? [] };
  if (status === 400 || status === 422) return { kind: "validation", status, code, message, fields: problem?.fieldErrors ?? [] };
  if (status === 409) return { kind: "conflict", status, code, message, fields: problem?.fieldErrors ?? [] };
  if (status === 413 || status === 415) return { kind: "upload", status, code, message, fields: problem?.fieldErrors ?? [] };
  if (status === 429) return { kind: "rate-limit", status, code, message, fields: problem?.fieldErrors ?? [], retryAfter };
  if (status >= 500) return { kind: "server", status, code, message, fields: problem?.fieldErrors ?? [] };
  return { kind: "unknown", status, code, message, fields: problem?.fieldErrors ?? [] };
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isProblem(value: unknown): value is Problem {
  return isRecord(value)
    && typeof value.status === "number"
    && typeof value.detail === "string"
    && typeof value.code === "string"
    && Array.isArray(value.fieldErrors);
}
function defaultMessage(status: number): string {
  if (status === 401) return "La sesión no es válida. Volvé a iniciar sesión.";
  if (status === 403) return "Tu usuario no tiene permiso para esta acción.";
  if (status === 409) return "El recurso cambió o hay un conflicto. Recargá su versión actual antes de guardar.";
  if (status === 413 || status === 415) return "El archivo supera los límites o su formato no está admitido.";
  if (status === 429) return "Se alcanzó el límite de intentos. Esperá antes de volver a probar.";
  if (status >= 500) return "El servidor no pudo completar la solicitud.";
  return "No se pudo completar la solicitud.";
}
