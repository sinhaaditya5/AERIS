import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AerisProvider } from './services/dataContext.tsx'
import { ThemeProvider } from './services/themeContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <AerisProvider>
        <App />
      </AerisProvider>
    </ThemeProvider>
  </StrictMode>,
)
