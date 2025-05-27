import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// En tu vite.config.js, agregar optimizaciones PWA
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          mui: ['@mui/material', '@mui/icons-material'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore']
        }
      }
    }
  }
})

