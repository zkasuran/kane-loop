import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In dev the dashboard runs on its own port and proxies the loop server's
// SSE + API. In production express serves the build and /events is same-origin.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5273,
    strictPort: true,
    proxy: {
      "/events": { target: "http://127.0.0.1:7799", changeOrigin: true },
      "/api": { target: "http://127.0.0.1:7799", changeOrigin: true }
    }
  }
});
