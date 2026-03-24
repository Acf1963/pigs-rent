import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Forçamos a base para '/' para garantir que o index.html 
  // procure os scripts na raiz do domínio servido pela Vercel
  base: '/', 
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true
  }
})
