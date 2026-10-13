export type DataMode = "real" | "mock";
const configuredMode = import.meta.env.VITE_ADMIN_DATA_MODE;
export const appConfig = {
  dataMode: (configuredMode === "real" ? "real" : "mock") as DataMode,
  apiBasePath: "/api/v1",
} as const;
export const apiReadiness = {
  contractImported: false,
  sharedFixturesImported: false,
  csrfStrategyConfigured: false,
} as const;
