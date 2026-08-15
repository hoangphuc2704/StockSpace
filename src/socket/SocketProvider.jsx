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
      // Get API URL (e.g., http://103.153.75.143/api)
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080'
      
      // Strip '/api' from the end if it exists, to get the root host
      const baseUrl = apiUrl.replace(/\/api\/?$/, '')
      
      // Convert to ws:// and append the exact backend endpoint
      const wsUrl = baseUrl.replace(/^http(s)?:\/\//, 'ws$1://') + '/ws'

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
