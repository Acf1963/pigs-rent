import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '', 
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // Isto garante que o Vite gera o index.html com caminhos que a Vercel entende
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  }
})
