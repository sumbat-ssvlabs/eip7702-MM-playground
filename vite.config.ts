import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    nodePolyfills({
      globals: {
        Buffer: mode === "production",
      },
    }),
  ],
  define: {
    ...(mode === "development" ? { global: {} } : undefined),
  },
  build: {
    rollupOptions: {
      input: "src/metamask-delegation.tsx",
    },
  },
}));
