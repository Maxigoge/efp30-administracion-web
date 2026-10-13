import { apiReadiness, appConfig } from "../config";
import type { AuthGateway } from "./types";
export class IntegrationUnavailableError extends Error {
  constructor(message: string) { super(message); this.name = "IntegrationUnavailableError"; }
}
/** Falla de forma cerrada mientras no estén disponibles contrato y fixtures. */
export function getAuthGateway(): AuthGateway {
  if (appConfig.dataMode === "mock" && !apiReadiness.sharedFixturesImported) {
    throw new IntegrationUnavailableError("No se encontraron los fixtures compartidos de efp30-api. La vista de desarrollo es de solo lectura.");
  }
  if (appConfig.dataMode === "real" && !apiReadiness.contractImported) {
    throw new IntegrationUnavailableError("El contrato de efp30-api todavía no está integrado. No se enviaron credenciales.");
  }
  throw new IntegrationUnavailableError("Falta conectar el adaptador de autenticación definido por el contrato.");
}
