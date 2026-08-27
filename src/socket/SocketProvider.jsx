import { createContext, useContext, useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { Client } from '@stomp/stompjs'

const SocketContext = createContext(null)

export const useSocket = () => useContext(SocketContext)

export const SocketProvider = ({ children }) => {
  const [stompClient, setStompClient] = useState(null)
  const { token, isAuthenticated } = useSelector((state) => state.auth)

  useEffect(() => {
    console.log('========== SOCKET EFFECT START ==========')
    console.log('[SOCKET] isAuthenticated:', isAuthenticated)
    console.log('[SOCKET] token exists:', !!token)
    console.log('[SOCKET] token length:', token?.length)
    console.log('[SOCKET] page protocol:', window.location.protocol)
    console.log('[SOCKET] page host:', window.location.host)

    // 1. Check authentication
    if (!isAuthenticated || !token) {
      console.warn('[SOCKET] ❌ Not connecting')
      console.warn('[SOCKET] Reason: isAuthenticated or token is missing')
      return
    }

    // 2. Get environment variables
    const socketEnv = import.meta.env.VITE_SOCKET_URL
    const apiEnv = import.meta.env.VITE_API_URL

    console.log('[SOCKET] VITE_SOCKET_URL:', socketEnv)
    console.log('[SOCKET] VITE_API_URL:', apiEnv)

    // 3. Build source URL
    const sourceUrl = socketEnv || apiEnv || 'http://localhost:8080'

    console.log('[SOCKET] sourceUrl:', sourceUrl)

    // 4. Remove /api
    const baseUrl = sourceUrl.replace(/\/api\/?$/, '')

    console.log('[SOCKET] baseUrl:', baseUrl)

    // 5. Convert HTTP -> WS
    let wsUrl = baseUrl.replace(/^http(s)?:\/\//, 'ws$1://') + '/ws'

    // 6. Fallback
    if (!baseUrl || baseUrl === '') {
      wsUrl =
        (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host + '/ws'
    }

    console.log('[SOCKET] FINAL WebSocket URL:', wsUrl)

    // 7. Check protocol
    if (window.location.protocol === 'https:' && wsUrl.startsWith('ws://')) {
      console.error('[SOCKET] ❌ MIXED CONTENT')
      console.error('[SOCKET] Frontend is HTTPS but WebSocket is WS')
      console.error('[SOCKET] WebSocket URL:', wsUrl)

      return
    }

    if (window.location.protocol === 'https:' && !wsUrl.startsWith('wss://')) {
      console.error('[SOCKET] ❌ HTTPS page requires WSS')
      console.error('[SOCKET] WebSocket URL:', wsUrl)

      return
    }

    // 8. Create STOMP client
    console.log('[SOCKET] Creating STOMP client...')

    const client = new Client({
      brokerURL: wsUrl,

      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },

      reconnectDelay: 5000,

      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,

      debug: (str) => {
        console.log('[STOMP DEBUG]', str)
      },

      beforeConnect: () => {
        console.log('[STOMP] 🔄 beforeConnect')
        console.log('[STOMP] URL:', wsUrl)
      },

      onConnect: (frame) => {
        console.log('================================')
        console.log('[SOCKET] ✅ CONNECTED')
        console.log('[SOCKET] WebSocket URL:', wsUrl)
        console.log('[SOCKET] STOMP connected')
        console.log('[SOCKET] Frame:', frame)
        console.log('================================')

        // Subscribe
        try {
          client.subscribe('/user/queue/notifications', (message) => {
            try {
              const notificationData = JSON.parse(message.body)

              console.log('[SOCKET] 🔔 Notification received:', notificationData)

              window.dispatchEvent(
                new CustomEvent('new_notification', {
                  detail: notificationData,
                })
              )
            } catch (err) {
              console.error('[SOCKET] ❌ Error parsing notification:', err)
            }
          })

          console.log('[SOCKET] ✅ Subscribed: /user/queue/notifications')
        } catch (err) {
          console.error('[SOCKET] ❌ Subscribe error:', err)
        }
      },

      onStompError: (frame) => {
        console.error('================================')
        console.error('[SOCKET] ❌ STOMP ERROR')
        console.error('[SOCKET] Message:', frame.headers['message'])
        console.error('[SOCKET] Details:', frame.body)
        console.error('[SOCKET] Headers:', frame.headers)
        console.error('================================')
      },

      onWebSocketError: (event) => {
        console.error('================================')
        console.error('[SOCKET] ❌ WEBSOCKET ERROR')
        console.error('[SOCKET] URL:', wsUrl)
        console.error('[SOCKET] Event:', event)
        console.error('================================')
      },

      onWebSocketClose: (event) => {
        console.error('================================')
        console.error('[SOCKET] 🔴 WEBSOCKET CLOSED')
        console.error('[SOCKET] URL:', wsUrl)
        console.error('[SOCKET] Code:', event.code)
        console.error('[SOCKET] Reason:', event.reason)
        console.error('[SOCKET] Was clean:', event.wasClean)
        console.error('================================')
      },

      onDisconnect: (frame) => {
        console.warn('[SOCKET] ⚠️ STOMP DISCONNECTED')
        console.log('[SOCKET] Frame:', frame)
      },

      onUnhandledMessage: (message) => {
        console.warn('[SOCKET] ⚠️ Unhandled message:', message)
      },

      onUnhandledReceipt: (frame) => {
        console.warn('[SOCKET] ⚠️ Unhandled receipt:', frame)
      },
    })

    console.log('[SOCKET] Calling client.activate()...')

    client.activate()

    setStompClient(client)

    // Cleanup
    return () => {
      console.log('[SOCKET] 🧹 Cleaning up socket...')

      client.deactivate()

      setStompClient(null)
    }
  }, [isAuthenticated, token])

  return <SocketContext.Provider value={stompClient}>{children}</SocketContext.Provider>
}
