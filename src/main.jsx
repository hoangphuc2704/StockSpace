import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/styles/global.css'
import App from './App.jsx'
import QueryProvider from '@/app/QueryProvider'
import { SocketProvider } from '@/socket/SocketProvider'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryProvider>
      <SocketProvider>
        <App />
      </SocketProvider>
    </QueryProvider>
  </StrictMode>
)
