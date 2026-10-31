import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)

// Production only: let the radar keep working offline (cache shell + assets).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('./sw.js')
      // A phone can sit on one build for days. Re-check for a new deploy when
      // the tab comes back to the foreground (and every 30 min) so the demo
      // link on a judge's device picks up the latest push on the next visit.
      const check = () => reg.update().catch(() => {})
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) check()
      })
      setInterval(check, 30 * 60 * 1000)
    } catch {
      /* offline support is a bonus, never break the app for it */
    }
  })
}
