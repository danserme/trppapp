import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Only Chromium renders SVG filters inside backdrop-filter; WebKit keeps the plain frosted glass.
if (/Chrome\//.test(navigator.userAgent)) document.documentElement.dataset.refract = ''

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
