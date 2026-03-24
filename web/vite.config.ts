import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Isto força o Vite a usar caminhos que funcionam tanto local como na Vercel
  base: '/', 
  server: {
    // Garante que em desenvolvimento local não criamos conflitos de porta
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true
  }
})
