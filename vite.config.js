// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: true,
    host: true,
    // Unique from arena / other projects that often use 5173
    port: 4481,
    strictPort: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/src/questions/') || id.includes('/src/utils/QuestionManager')) {
            return 'questions-bank';
          }
          if (id.includes('/src/utils/giftsConfig') || id.includes('/src/utils/giftTriggerDefaults')) {
            return 'gifts-config';
          }
          if (id.includes('node_modules/framer-motion')) return 'vendor-motion';
        }
      }
    },
    chunkSizeWarningLimit: 1200
  }
})
