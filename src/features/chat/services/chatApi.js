import api from '@/services/apiConfig'

const CHAT_TOKEN_KEY = 'stockspace_guest_chat_token'
const CHAT_SESSION_KEY = 'stockspace_guest_chat_session'

const apiBaseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

const refreshAccessToken = async () => {
  const response = await api.post('/auth/refresh')
  const authData = response.data?.data
  const accessToken = authData?.accessToken

  if (!accessToken) throw new Error('Không thể làm mới phiên đăng nhập.')

  localStorage.setItem('token', accessToken)
  let currentUser = {}
  try {
    currentUser = JSON.parse(localStorage.getItem('user') || '{}')
  } catch {
    // Dữ liệu local cũ bị lỗi không được phép làm hỏng quá trình refresh token.
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
        throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.')
      }
    }

    if (!response.ok || !response.body) {
      const apiMessage = await parseErrorMessage(response)
      if (response.status === 401) {
        if (!isAuthenticatedChat) guestChatStorage.clear()
        throw new Error(
          isAuthenticatedChat
            ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
            : 'Phiên chat đã hết hạn.'
        )
      }
      if (response.status === 429) {
        throw new Error('Bạn đang gửi tin nhắn quá nhanh. Vui lòng thử lại sau ít phút.')
      }
      if (response.status === 403) {
        throw new Error('Tài khoản của bạn chưa được cấp quyền sử dụng chatbot.')
      }
      throw new Error(apiMessage || 'Không thể kết nối với trợ lý AI.')
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

      throw new Error('Kết nối tới trợ lý AI bị ngắt trước khi hoàn tất phản hồi.')
    } catch (error) {
      // Một số proxy đóng TCP ngay sau frame complete. Khi terminal event đã
      // tới client thì câu trả lời hợp lệ và lỗi đóng transport không còn ý nghĩa.
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
