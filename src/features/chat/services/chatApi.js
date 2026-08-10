import api from '@/services/apiConfig'

const CHAT_TOKEN_KEY = 'stockspace_guest_chat_token'
const CHAT_SESSION_KEY = 'stockspace_guest_chat_session'

const apiBaseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

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
  streamMessage: async ({ isTenant, sessionId, sessionToken, message, signal, onEvent }) => {
    const token = localStorage.getItem('token')
    const endpoint = isTenant ? '/chat/stream' : '/chat/guest/stream'
    const response = await fetch(`${apiBaseUrl}${endpoint}`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        Accept: 'text/event-stream',
        'Content-Type': 'application/json',
        ...(isTenant && token ? { Authorization: `Bearer ${token}` } : {}),
        ...(!isTenant && sessionToken ? { 'X-Chat-Session-Token': sessionToken } : {}),
      },
      body: JSON.stringify({ sessionId: sessionId || null, message }),
      signal,
    })

    if (!response.ok || !response.body) {
      const apiMessage = await parseErrorMessage(response)
      if (response.status === 401) {
        throw new Error(isTenant ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' : 'Phiên chat đã hết hạn.')
      }
      if (response.status === 429) {
        throw new Error('Bạn đang gửi tin nhắn quá nhanh. Vui lòng thử lại sau ít phút.')
      }
      throw new Error(apiMessage || 'Không thể kết nối với trợ lý AI.')
    }

    const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
    let buffer = ''

    while (true) {
      const { value, done } = await reader.read()
      if (done) break

      buffer += value
      buffer = buffer.replaceAll('\r\n', '\n')
      let boundary = buffer.indexOf('\n\n')

      while (boundary >= 0) {
        const parsed = parseSseFrame(buffer.slice(0, boundary))
        buffer = buffer.slice(boundary + 2)
        if (parsed) onEvent(parsed.event, parsed.data)
        boundary = buffer.indexOf('\n\n')
      }
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
