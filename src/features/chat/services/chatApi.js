import api from '@/services/apiConfig'
import { showApiErrorToast } from '@/config/apiError'

const CHAT_TOKEN_KEY = 'stockspace_guest_chat_token'
const CHAT_SESSION_KEY = 'stockspace_guest_chat_session'

const apiBaseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

const refreshAccessToken = async () => {
  const response = await api.post('/auth/refresh')
  const authData = response.data?.data
  const accessToken = authData?.accessToken

  if (!accessToken) throw new Error('Unable to refresh your sign-in session.')

  localStorage.setItem('token', accessToken)
  let currentUser = {}
  try {
    currentUser = JSON.parse(localStorage.getItem('user') || '{}')
  } catch {
    // Invalid legacy local data must not interrupt the token refresh flow.
  }
  localStorage.setItem(
    'user',
    JSON.stringify({
      ...currentUser,
      ...(authData.fullName ? { name: authData.fullName, fullName: authData.fullName } : {}),
      ...(authData.role ? { role: authData.role } : {}),
      ...(authData.userId ? { userId: authData.userId } : {}),
      ...(authData.email ? { email: authData.email } : {}),
    })
  )
  return accessToken
}

const parseErrorMessage = async (response) => {
  try {
    const payload = await response.json()
    return payload?.message || payload?.data?.message
  } catch {
    return null
  }
}

const parseSseFrame = (frame) => {
  const event = frame.match(/^event:\s*(.+)$/m)?.[1]?.trim()
  const data = frame
    .split('\n')
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trimStart())
    .join('\n')

  if (!event || !data) return null

  try {
    return { event, data: JSON.parse(data) }
  } catch {
    return null
  }
}

export const guestChatStorage = {
  getToken: () => localStorage.getItem(CHAT_TOKEN_KEY),
  getSessionId: () => localStorage.getItem(CHAT_SESSION_KEY),
  save: ({ sessionToken, sessionId }) => {
    if (sessionToken) localStorage.setItem(CHAT_TOKEN_KEY, sessionToken)
    if (sessionId) localStorage.setItem(CHAT_SESSION_KEY, sessionId)
  },
  clear: () => {
    localStorage.removeItem(CHAT_TOKEN_KEY)
    localStorage.removeItem(CHAT_SESSION_KEY)
  },
}

export const chatApi = {
  streamMessage: async ({ isAuthenticatedChat, sessionId, sessionToken, message, signal, onEvent }) => {
    const endpoint = isAuthenticatedChat ? '/chat/stream' : '/chat/guest/stream'
    const sendRequest = (accessToken) =>
      fetch(`${apiBaseUrl}${endpoint}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          Accept: 'text/event-stream',
          'Content-Type': 'application/json',
          ...(isAuthenticatedChat && accessToken
            ? { Authorization: `Bearer ${accessToken}` }
            : {}),
          ...(!isAuthenticatedChat && sessionToken
            ? { 'X-Chat-Session-Token': sessionToken }
            : {}),
        },
        body: JSON.stringify({ sessionId: sessionId || null, message }),
        signal,
      })

    let response = await sendRequest(localStorage.getItem('token'))
    if (response.status === 401 && isAuthenticatedChat) {
      try {
        const refreshedToken = await refreshAccessToken()
        response = await sendRequest(refreshedToken)
      } catch {
        throw new Error('Your sign-in session has expired. Please sign in again.')
      }
    }

    if (!response.ok || !response.body) {
      const apiMessage = await parseErrorMessage(response)
      const apiError = {
        response: {
          status: response.status,
          data: { message: apiMessage },
        },
      }
      showApiErrorToast(apiError, 'Unable to connect to the AI assistant.')
      if (response.status === 401) {
        if (!isAuthenticatedChat) guestChatStorage.clear()
        throw new Error(
          isAuthenticatedChat
            ? 'Your sign-in session has expired. Please sign in again.'
            : 'Your chat session has expired.'
        )
      }
      if (response.status === 429) {
        throw new Error('You are sending messages too quickly. Please try again in a few minutes.')
      }
      if (response.status === 403) {
        throw new Error('Your account does not have permission to use the chatbot.')
      }
      throw new Error(apiMessage || 'Unable to connect to the AI assistant.')
    }

    const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
    let buffer = ''
    let terminalEvent = null

    try {
      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        buffer += value
        buffer = buffer.replaceAll('\r\n', '\n')
        let boundary = buffer.indexOf('\n\n')

        while (boundary >= 0) {
          const parsed = parseSseFrame(buffer.slice(0, boundary))
          buffer = buffer.slice(boundary + 2)
          if (parsed) {
            onEvent(parsed.event, parsed.data)
            if (parsed.event === 'complete' || parsed.event === 'error') {
              terminalEvent = parsed.event
              return
            }
          }
          boundary = buffer.indexOf('\n\n')
        }
      }

      throw new Error('The connection to the AI assistant closed before the response was complete.')
    } catch (error) {
      // Some proxies close TCP immediately after the complete frame. Once the client
      // receives the terminal event, the response is valid and the transport error is irrelevant.
      if (terminalEvent === 'complete') return
      throw error
    } finally {
      reader.releaseLock()
    }
  },

  getGuestHistory: async (sessionToken) => {
    const response = await api.get('/chat/guest/history', {
      headers: { 'X-Chat-Session-Token': sessionToken },
    })
    return response.data?.data || []
  },

  getSessions: async () => {
    const response = await api.get('/chat/sessions', { params: { page: 0, size: 30 } })
    return response.data?.data?.content || []
  },

  getSessionMessages: async (sessionId) => {
    const response = await api.get(`/chat/sessions/${sessionId}/messages`)
    return response.data?.data || []
  },

  deleteSession: async (sessionId) => {
    await api.delete(`/chat/sessions/${sessionId}`)
  },
}
