import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/favicon.svg', 'robots.txt', 'firebase-messaging-sw.js'],
      manifest: {
        name: 'Mecaformas 3D RRHH',
        short_name: 'Meca3D',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#1976d2',
        description: 'Aplicación de recursos humanos Mecaformas 3D',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-192-maskable.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        navigateFallback: '/index.html',
        // No cachear el service worker de Firebase
        maximumFileSizeToCacheInBytes: 5242880,
        navigateFallbackDenylist: [/firebase-messaging-sw\.js$/]
      },
      devOptions: {
        enabled: false
      },
      manifestFilename: 'manifest.webmanifest'
    })
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom'],
          'mui': ['@mui/material', '@mui/icons-material'],
          'firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore']
        }
      }
    }
  }
})
