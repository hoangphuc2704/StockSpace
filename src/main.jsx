import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { SocketProvider } from './socket/SocketProvider'
import { Provider } from 'react-redux'
import store from './store/index.js'
createRoot(document.getElementById('root')).render(
  <Provider store={store}>
    <SocketProvider>
      <App />
    </SocketProvider>
  </Provider>
)
