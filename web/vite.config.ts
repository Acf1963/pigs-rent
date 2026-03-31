import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate', // Atualiza a app no dispositivo assim que lançares nova versão
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'maskable-icon.svg'],
      manifest: {
        name: 'Fazenda Kwanza Gestão',
        short_name: 'KwanzaGest',
        description: 'Sistema de Gestão Comercial e Identificação - Fazenda Kwanza',
        theme_color: '#0f121a', // Cor da barra de status no telemóvel
        background_color: '#0f121a',
        display: 'standalone', // Faz a app abrir como uma aplicação nativa (sem barra do browser)
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  base: '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
  }
})
