import { createContext, useContext, useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { Client } from '@stomp/stompjs'

const SocketContext = createContext(null)

// The context hook and provider intentionally live together as one socket module.
// eslint-disable-next-line react-refresh/only-export-components
export const useSocket = () => useContext(SocketContext)

const buildWebSocketUrl = (socketEnv, apiEnv) => {
  const sourceUrl = String(socketEnv || apiEnv || '').trim().replace(/\/+$/, '')
  if (!sourceUrl) {
    return `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws`
  }

  const withoutApiSuffix = sourceUrl
    .replace(/\/api\/ws$/, '/ws')
    .replace(/\/api\/?$/, '')
  if (withoutApiSuffix.startsWith('ws://') || withoutApiSuffix.startsWith('wss://')) {
    return withoutApiSuffix.endsWith('/ws') ? withoutApiSuffix : `${withoutApiSuffix}/ws`
  }

  return withoutApiSuffix.replace(/^http(s?):\/\//, 'ws$1://') + '/ws'
}

export const SocketProvider = ({ children }) => {
  const [stompClient, setStompClient] = useState(null)
  const { token, isAuthenticated } = useSelector((state) => state.auth)

  useEffect(() => {
    // 1. Check authentication
    if (!isAuthenticated || !token) {
      return
    }

    // 2. Get environment variables
    const socketEnv = import.meta.env.VITE_SOCKET_URL
    const apiEnv = import.meta.env.VITE_API_URL

    // 3. Build a single /ws endpoint from either HTTP(S) or WS(S) config.
    const wsUrl = buildWebSocketUrl(socketEnv, apiEnv)

    // 4. Check protocol
    if (window.location.protocol === 'https:' && (wsUrl.startsWith('ws://') || !wsUrl.startsWith('wss://'))) {
      return
    }

    // 5. Create STOMP client
    const client = new Client({
      brokerURL: wsUrl,

      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },

      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,

      onConnect: () => {
        try {
          client.subscribe('/user/queue/notifications', (message) => {
            try {
              const notificationData = JSON.parse(message.body)

              window.dispatchEvent(
                new CustomEvent('new_notification', {
                  detail: notificationData,
                })
              )
            } catch (err) {
              console.error('[SOCKET] Error parsing notification:', err)
            }
          })
        } catch (err) {
          console.error('[SOCKET] Subscribe error:', err)
        }
      },

      onStompError: (frame) => {
        console.error('[SOCKET] STOMP error:', frame.headers['message'])
      },

      onWebSocketError: (event) => {
        console.error('[SOCKET] WebSocket error:', event)
      },
    })

    client.activate()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStompClient(client)

    // Cleanup
    return () => {
      client.deactivate()
      setStompClient(null)
    }
  }, [isAuthenticated, token])

  return <SocketContext.Provider value={stompClient}>{children}</SocketContext.Provider>
}


