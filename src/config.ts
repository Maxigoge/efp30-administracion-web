export type DataMode = "real" | "mock";
const configuredMode = import.meta.env.VITE_ADMIN_DATA_MODE;
export const appConfig = {
  dataMode: (configuredMode === "real" ? "real" : "mock") as DataMode,
  apiBasePath: import.meta.env.VITE_API_BASE_PATH || "/api/v1",
} as const;
export const apiReadiness = {
  contractImported: false,
  sharedFixturesImported: false,
  csrfStrategyConfigured: false,
} as const;
