import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: './',

  plugins: [
    react(),
    tailwindcss(),

    VitePWA({
      registerType: 'autoUpdate',

      manifest: {
        name: 'StudyBud',
        short_name: 'StudyBud',
        description: 'Focus timer and task tracker',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        start_url: '/',

        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
  ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})