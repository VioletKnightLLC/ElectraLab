import React from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/atkinson-hyperlegible-next/latin-400.css'
import '@fontsource/atkinson-hyperlegible-next/latin-400-italic.css'
import '@fontsource/atkinson-hyperlegible-next/latin-500.css'
import '@fontsource/atkinson-hyperlegible-next/latin-600.css'
import '@fontsource/atkinson-hyperlegible-next/latin-700.css'
import App from './App.jsx'
import './styles.css'
import './dark-theme.css'
import './accessibility.css'
import './brand-theme.css'
import './brand-accent-overrides.css'
import './notation-zoom.css'
import './background-gradients.css'
import './layout-fixes.css'
import './scratch-pad-tools.css'
import './calculator.css'
import './tutor-formatting.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
  })
}
