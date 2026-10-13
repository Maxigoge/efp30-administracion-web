import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  return {
    base: "/",
    server: {
      proxy: env.VITE_API_PROXY_TARGET
        ? { "/api/v1": { target: env.VITE_API_PROXY_TARGET, changeOrigin: true, secure: true } }
        : undefined,
    },
  };
});
