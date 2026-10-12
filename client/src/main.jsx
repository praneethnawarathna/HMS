import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './utils/api'
import App from './App.jsx'

// Add a CSS class when running on Surface Duo devices so styles
// (logo placement) can be scoped to that device only.
try {
  if (typeof navigator !== 'undefined' && /Surface Duo|SurfaceDuo/i.test(navigator.userAgent)) {
    document.documentElement.classList.add('surface-duo')
  }
} catch {
  // defensive: ignore in environments without navigator/document
}

// Detect virtual keyboard (input focus) to adjust responsive behavior on mobile.
try {
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const onFocusIn = (e) => {
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) {
        document.documentElement.classList.add('keyboard-open')
      }
    }
    const onFocusOut = (e) => {
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) {
        document.documentElement.classList.remove('keyboard-open')
      }
    }
    window.addEventListener('focusin', onFocusIn)
    window.addEventListener('focusout', onFocusOut)
    
    // Smooth layout on orientation change
    window.addEventListener('orientationchange', () => {
      setTimeout(() => window.scrollTo(0, 0), 100)
    })
  }
} catch {
  // ignore
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
