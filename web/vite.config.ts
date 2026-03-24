// web/vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/', // Garante que os assets sejam buscados na raiz do domínio
  build: {
    outDir: 'dist',
  }
})