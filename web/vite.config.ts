import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '', // <-- Crítico para resolver o erro de MIME type
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
})
