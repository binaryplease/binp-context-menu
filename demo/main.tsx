import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App.tsx'
import { applyStoredTheme } from './ThemeControl.tsx'
import './index.css'

// Before the first paint, not in an effect after it — otherwise a reload into the
// dark palette shows a white page for a frame.
applyStoredTheme()

const rootElement = document.getElementById('root')
if (rootElement === null) throw new Error('demo: #root is missing from index.html')

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
