import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: ['fb07f3e1ec5c.ngrok-free.app', '.ngrok-free.app', '.ngrok.io']
  },
})
