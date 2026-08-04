import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { mcuAdminApiPlugin } from './vite-admin-plugin'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), mcuAdminApiPlugin()],
  // Served from https://<user>.github.io/mcu-atlas/ — must match the repo name.
  base: '/mcu-atlas/',
})
