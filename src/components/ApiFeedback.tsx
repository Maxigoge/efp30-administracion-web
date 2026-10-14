import { ApiRequestError } from "../api/errors";
import type { ReactNode } from "react";

export function errorText(error: unknown): string {
  return error instanceof ApiRequestError ? error.failure.message + (error.failure.fields.length ? " · " + error.failure.fields.map((field) => `${field.field}: ${field.message}`).join(" · ") : "") : error instanceof Error ? error.message : "No se pudo completar la operación.";
}
export function isConflict(error: unknown): boolean {
  return error instanceof ApiRequestError && error.failure.kind === "conflict";
}
export function ApiError({ error, onRetry }: { error: string; onRetry?: () => void }) {
  return <div className="inline-error" role="alert"><span>{error}</span>{onRetry && <button type="button" onClick={onRetry}>Recargar versión</button>}</div>;
}
export function TextField({ label, error, wide, children }: { label: string; error?: string; wide?: boolean; children: ReactNode }) {
  return <label className={`form-field${wide ? " form-field--wide" : ""}`}>{label}{children}{error && <small className="field-error">{error}</small>}</label>;
}
