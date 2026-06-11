import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.png', 'favicon.png', 'apple-touch-icon.png', 'pwa-192.png', 'pwa-512.png', 'anniversary-login.jpeg'],
      manifest: {
        name: 'Diva Shop',
        short_name: 'DivaShop',
        description: 'Sistema de gestión de inventario, ventas y créditos',
        theme_color: '#F5B7B3',
        background_color: '#F7F6F6',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: 'pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },

    }),
  ],
})
