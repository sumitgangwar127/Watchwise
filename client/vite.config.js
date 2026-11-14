import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true,
    host: true, // expose on the local network so phones on the same Wi-Fi can open it
    proxy: { "/api": "http://127.0.0.1:3001" },
  },
});
