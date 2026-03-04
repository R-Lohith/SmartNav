import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/generate_route": {
        target: "http://localhost:5001",
        changeOrigin: true,
        rewrite: (path) => path,
      },
      "/generate_and_save_route": {
        target: "http://localhost:5001",
        changeOrigin: true,
        rewrite: (path) => path,
      },
    },
  },
});


