import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Importação para suporte a PWA (Vite PWA Plugin)
import { registerSW } from 'virtual:pwa-register'

// Atualiza a app automaticamente quando houver nova versão
registerSW({ immediate: true })

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
