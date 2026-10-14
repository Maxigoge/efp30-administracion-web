export type DataMode = "real" | "mock";
export const appConfig = {
  dataMode: import.meta.env.VITE_ADMIN_DATA_MODE === "mock" ? "mock" : "real",
  apiBasePath: "/api/v1",
} as const;
