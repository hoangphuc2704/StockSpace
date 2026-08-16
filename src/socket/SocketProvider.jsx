import { createContext, useContext, useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { Client } from '@stomp/stompjs'
import toast from 'react-hot-toast'

const SocketContext = createContext(null)

export const useSocket = () => useContext(SocketContext)

export const SocketProvider = ({ children }) => {
  const [stompClient, setStompClient] = useState(null)
  const { token, isAuthenticated } = useSelector((state) => state.auth)

  useEffect(() => {
    if (isAuthenticated && token) {
      // Ưu tiên dùng VITE_SOCKET_URL nếu có, nếu không thì fallback về VITE_API_URL
      const sourceUrl = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || 'http://localhost:8080'
      
      // Strip '/api' from the end if it exists, to get the root host
      const baseUrl = sourceUrl.replace(/\/api\/?$/, '')
      
      // Convert to ws:// or wss:// and append the exact backend endpoint
      let wsUrl = baseUrl.replace(/^http(s)?:\/\//, 'ws$1://') + '/ws'

      if (!baseUrl || baseUrl === '') {
        wsUrl = (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host + '/ws'
      }

      // Bỏ qua kết nối nếu gặp lỗi Mixed Content (Frontend HTTPS gọi Backend WS)
      if (window.location.protocol === 'https:' && wsUrl.startsWith('ws://')) {
        console.warn('⚠️ WebSocket skipped: Cannot connect to an insecure WebSocket (ws://) from a secure website (https://). Please configure SSL for your backend or test locally via HTTP.')
        return
      }

      const client = new Client({
        brokerURL: wsUrl,
        connectHeaders: {
          Authorization: `Bearer ${token}`,
        },
        reconnectDelay: 5000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
        onConnect: () => {
          console.log('Connected to Spring Boot STOMP WebSocket successfully!')

          // Subscribe to user-specific notifications
          client.subscribe('/user/queue/notifications', (message) => {
            try {
              const notificationData = JSON.parse(message.body)
              console.log('New notification received:', notificationData)

              // Phát ra event để NotificationDropdown bắt và tăng số đếm quả chuông
              window.dispatchEvent(new CustomEvent('new_notification', { detail: notificationData }))
            } catch (err) {
              console.error('Error parsing notification data', err)
            }
          })
        },
        onStompError: (frame) => {
          console.error('Broker reported error: ' + frame.headers['message'])
          console.error('Additional details: ' + frame.body)
        },
        onWebSocketError: (event) => {
          console.error('WebSocket Error', event)
        },
      })

      client.activate()
      setStompClient(client)

      return () => {
        client.deactivate()
      }
    }
  }, [isAuthenticated, token])

  return <SocketContext.Provider value={stompClient}>{children}</SocketContext.Provider>
}
