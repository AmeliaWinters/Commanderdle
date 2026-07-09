import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './components/App'
import UsernameGate from './components/account/UsernameGate'
import { AuthProvider } from './lib/useAuth'
import 'keyrune/css/keyrune.css'
import './styles/index.css'
import { loadCommanders } from './lib/commanders'

loadCommanders()
  .catch(() => {})
  .then(() => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <AuthProvider>
          <App />
          <UsernameGate />
        </AuthProvider>
      </StrictMode>,
    )
  })

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
    })
  })
}
