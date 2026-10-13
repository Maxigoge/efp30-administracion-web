export type ApiFailureKind = "unauthorized" | "forbidden" | "validation" | "conflict" | "upload" | "network" | "server" | "unknown";
export interface ApiFailure {
  kind: ApiFailureKind;
  status?: number;
  message: string;
  fields?: Record<string, string[]>;
  requestId?: string;
}
export function failureFromResponse(status: number, payload: unknown, requestId?: string): ApiFailure {
  const body = isRecord(payload) ? payload : {};
  const message = typeof body.message === "string" ? body.message : undefined;
  if (status === 401) return { kind: "unauthorized", status, requestId, message: message ?? "La sesión venció. Volvé a iniciar sesión." };
  if (status === 403) return { kind: "forbidden", status, requestId, message: message ?? "Tu usuario no tiene permiso para esta acción." };
  if (status === 409) return { kind: "conflict", status, requestId, message: message ?? "El contenido cambió desde que lo abriste. Recargá para ver la versión actual." };
  if (status === 400 || status === 422) return { kind: "validation", status, requestId, message: message ?? "Revisá los datos indicados.", fields: isRecord(body.errors) ? fieldErrors(body.errors) : undefined };
  if (status === 413 || status === 415) return { kind: "upload", status, requestId, message: message ?? "El archivo supera los límites permitidos o su formato no está admitido." };
  if (status >= 500) return { kind: "server", status, requestId, message: message ?? "El servidor no pudo completar la solicitud." };
  return { kind: "unknown", status, requestId, message: message ?? "No se pudo completar la solicitud." };
}
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function fieldErrors(errors: Record<string, unknown>): Record<string, string[]> {
  return Object.fromEntries(Object.entries(errors).map(([key, messages]) => [key, Array.isArray(messages) ? messages.filter((item): item is string => typeof item === "string") : []]));
}
