import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { refracts, startGlass, startMirrorGlass } from './glass'
import { startStampNoise } from './noise'

// Only Chromium renders SVG filters inside backdrop-filter; WebKit refracts a copy of the map instead.
if (refracts) {
  document.documentElement.dataset.refract = ''
  startGlass()
} else startMirrorGlass()

startStampNoise()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
