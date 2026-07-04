import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './components/App'
import './styles/index.css'
import { loadCommanders } from './lib/commanders'

// Fetch + parse the core dataset before mounting: every screen needs it, and the daily
// answer is deterministic over it. The HTML skeleton (including the LCP backdrop card,
// painted from the initial document) stays on screen until this resolves, so gating the
// mount costs nothing visually while keeping the ~239KB dataset out of the JS parse task.
// If the load hard-fails, we mount anyway so the app can surface its own error state.
loadCommanders()
  .catch(() => {})
  .then(() => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  })

// Register the service worker for offline/PWA support (production only, to avoid
// stale caches during local dev).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* offline support is best-effort */
    })
  })
}
