import { createContext, useContext, useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import { useAuthStore } from '@/store/authStore'

const SocketContext = createContext(null)

export const useSocket = () => useContext(SocketContext)

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null)
  const { token, isAuthenticated } = useAuthStore()

  useEffect(() => {
    if (isAuthenticated && token) {
      const newSocket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
        auth: { token },
      })

      setSocket(newSocket)

      return () => newSocket.close()
    }
  }, [isAuthenticated, token])

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  )
}
