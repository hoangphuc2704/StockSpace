import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { SocketProvider } from './socket/SocketProvider'
import { Provider } from 'react-redux'
import { GoogleOAuthProvider } from '@react-oauth/google'
import store from './store/index.js'
import { LanguageProvider } from './i18n/LanguageContext.jsx'
import LanguageSwitcher from './components/LanguageSwitcher.jsx'
import { ConfirmDialogProvider } from './components/ConfirmDialogProvider.jsx'

import { Toaster } from 'react-hot-toast'

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

createRoot(document.getElementById('root')).render(
  <Provider store={store}>
    <GoogleOAuthProvider clientId={googleClientId}>
      <SocketProvider>
        <LanguageProvider>
          <ConfirmDialogProvider>
            <App />
            <LanguageSwitcher />
            <Toaster position="top-right" />
          </ConfirmDialogProvider>
        </LanguageProvider>
      </SocketProvider>
    </GoogleOAuthProvider>
  </Provider>
)
