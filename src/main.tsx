import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { startGlass } from './glass'
import { startStampNoise } from './noise'

// Only Chromium renders SVG filters inside backdrop-filter; WebKit keeps the plain frosted glass.
if (/Chrome\//.test(navigator.userAgent)) {
  document.documentElement.dataset.refract = ''
  startGlass()
}

startStampNoise()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
