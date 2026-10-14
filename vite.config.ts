import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  const mockTarget = env.VITE_ADMIN_DATA_MODE === "mock" ? "http://127.0.0.1:4010" : undefined;
  const target = env.VITE_API_PROXY_TARGET || mockTarget;
  return {
    base: "/",
    server: {
      proxy: target
        ? { "/api/v1": { target, changeOrigin: true, secure: true } }
        : undefined,
    },
  };
});
