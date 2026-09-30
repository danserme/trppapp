import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    cssTarget: ["chrome111", "edge111", "firefox114", "safari16.4"],
  },
  worker: {
    format: "es",
  },
  optimizeDeps: {
    exclude: ["maplibre-gl"],
  },
})
