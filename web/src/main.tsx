import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AerisProvider } from './services/dataContext.tsx'
import { ThemeProvider } from './services/themeContext.tsx'
import { NotificationProvider } from './services/notificationContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <AerisProvider>
        <NotificationProvider>
          <App />
        </NotificationProvider>
      </AerisProvider>
    </ThemeProvider>
  </StrictMode>,
)
