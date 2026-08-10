import { useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import {
  Bot,
  ChevronLeft,
  Clock3,
  History,
  LoaderCircle,
  MessageCircleMore,
  Plus,
  SendHorizontal,
  Sparkles,
  Trash2,
  UserRound,
  X,
} from 'lucide-react'
import { chatApi, guestChatStorage } from '../services/chatApi'

const CHAT_ROLE_CONFIG = {
  guest: {
    subtitle: 'Tư vấn kho hàng 24/7',
    greeting:
      'Xin chào! Mình là trợ lý AI của StockSpace. Mình có thể giúp bạn tìm kho và giải đáp chính sách thuê kho.',
    suggestions: [
      'Tìm kho phù hợp ở TP.HCM',
      'Quy trình thuê kho như thế nào?',
      'Chính sách đặt cọc ra sao?',
    ],
  },
  tenant: {
    subtitle: 'Trợ lý dành riêng cho tenant',
    greeting: 'Chào bạn! Mình có thể hỗ trợ tra cứu kho, hợp đồng, hàng tồn và số dư ví của bạn.',
    suggestions: [
      'Tóm tắt các hợp đồng của tôi',
      'Kiểm tra hàng tồn kho của tôi',
      'Số dư ví hiện tại là bao nhiêu?',
    ],
  },
  owner: {
    subtitle: 'Trợ lý dành riêng cho chủ kho',
    greeting:
      'Chào chủ kho! Mình có thể hỗ trợ tra cứu kho của bạn, yêu cầu đặt kho, doanh thu và tỷ lệ lấp đầy.',
    suggestions: [
      'Liệt kê các kho của tôi',
      'Tóm tắt yêu cầu đặt kho gần đây',
      'Doanh thu và tỷ lệ lấp đầy của tôi',
    ],
  },
  staff: {
    subtitle: 'Trợ lý nghiệp vụ nhân viên kho',
    greeting:
      'Chào bạn! Mình có thể hỗ trợ xem tồn kho được phân công và các phiếu nhập, xuất đang chờ xử lý.',
    suggestions: [
      'Kiểm tra tồn kho tôi được phân công',
      'Có phiếu nhập nào đang chờ?',
      'Có phiếu xuất nào đang chờ?',
    ],
  },
  admin: {
    subtitle: 'Trợ lý quản trị hệ thống',
    greeting:
      'Chào quản trị viên! Mình có thể hỗ trợ xem tổng quan nền tảng và báo cáo doanh thu theo tháng.',
    suggestions: [
      'Cho tôi tổng quan nền tảng',
      'Thống kê doanh thu tháng này',
      'Tìm chính sách hệ thống hiện hành',
    ],
  },
  inspector: {
    subtitle: 'Trợ lý dành cho kiểm định viên',
    greeting:
      'Chào kiểm định viên! Mình có thể hỗ trợ xem danh sách kiểm định được giao và thông tin chi tiết từng nhiệm vụ.',
    suggestions: [
      'Liệt kê các kiểm định được giao cho tôi',
      'Tôi có kiểm định nào đang chờ?',
      'Quy trình kiểm định kho như thế nào?',
    ],
  },
}

const AUTH_ROLE_TO_CHAT_ROLE = {
  ROLE_TENANT: 'tenant',
  ROLE_OWNER: 'owner',
  ROLE_STAFF: 'staff',
  ROLE_ADMIN: 'admin',
  ROLE_INSPECTOR: 'inspector',
  ROLE_GUEST: 'guest',
}

const greeting = (chatRole) => ({
  id: `greeting-${chatRole}`,
  role: 'assistant',
  content: CHAT_ROLE_CONFIG[chatRole].greeting,
})

const formatTime = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

const getErrorMessage = (error) =>
  error?.response?.data?.message || error?.message || 'Đã có lỗi xảy ra. Vui lòng thử lại.'

const AIChatPanel = ({ chatRole }) => {
  const isAuthenticatedChat = chatRole !== 'guest'
  const roleConfig = CHAT_ROLE_CONFIG[chatRole]
  const [isOpen, setIsOpen] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [messages, setMessages] = useState(() => [greeting(chatRole)])
  const [sessions, setSessions] = useState([])
  const [sessionId, setSessionId] = useState(() =>
    isAuthenticatedChat ? null : guestChatStorage.getSessionId()
  )
  const [input, setInput] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const abortRef = useRef(null)
  const messageSequenceRef = useRef(0)

  const suggestions = roleConfig.suggestions

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, status])

  useEffect(() => () => abortRef.current?.abort(), [])

  const loadUserSessions = async () => {
    try {
      const data = await chatApi.getSessions()
      setSessions(data)
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    }
  }

  const loadGuestHistory = async () => {
    const guestToken = guestChatStorage.getToken()
    if (!guestToken) return

    setIsLoadingHistory(true)
    try {
      const data = await chatApi.getGuestHistory(guestToken)
      if (data.length) setMessages(data)
    } catch (requestError) {
      const statusCode = requestError?.response?.status
      if ([400, 401, 404].includes(statusCode)) {
        guestChatStorage.clear()
        setSessionId(null)
      } else {
        setError(getErrorMessage(requestError))
      }
    } finally {
      setIsLoadingHistory(false)
    }
  }

  const handleOpen = () => {
    setIsOpen(true)
    setTimeout(() => inputRef.current?.focus(), 100)
    if (isAuthenticatedChat) loadUserSessions()
    else loadGuestHistory()
  }

  const startNewChat = () => {
    abortRef.current?.abort()
    setSessionId(null)
    setMessages([greeting(chatRole)])
    setInput('')
    setError('')
    setStatus('')
    setIsSending(false)
    setShowHistory(false)
    if (!isAuthenticatedChat) guestChatStorage.clear()
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const selectSession = async (selectedSession) => {
    if (isSending) return
    setIsLoadingHistory(true)
    setError('')
    try {
      const data = await chatApi.getSessionMessages(selectedSession.id)
      setSessionId(selectedSession.id)
      setMessages(data.length ? data : [greeting(chatRole)])
      setShowHistory(false)
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setIsLoadingHistory(false)
    }
  }

  const deleteSession = async (event, selectedSession) => {
    event.stopPropagation()
    if (!window.confirm(`Xóa cuộc trò chuyện “${selectedSession.title || 'Không có tiêu đề'}”?`))
      return

    try {
      await chatApi.deleteSession(selectedSession.id)
      setSessions((current) => current.filter((item) => item.id !== selectedSession.id))
      if (sessionId === selectedSession.id) startNewChat()
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    }
  }

  const sendMessage = async (rawMessage) => {
    const message = rawMessage.trim()
    if (!message || isSending) return

    messageSequenceRef.current += 1
    const messageSequence = messageSequenceRef.current
    const userMessage = {
      id: `user-${messageSequence}`,
      role: 'user',
      content: message,
      createdAt: new Date().toISOString(),
    }
    const assistantId = `assistant-${messageSequence}`

    setMessages((current) => [
      ...current,
      userMessage,
      { id: assistantId, role: 'assistant', content: '', createdAt: new Date().toISOString() },
    ])
    setInput('')
    setError('')
    setStatus('StockSpace AI đang suy nghĩ...')
    setIsSending(true)

    const controller = new AbortController()
    abortRef.current = controller
    let receivedContent = false
    let streamError = null

    try {
      await chatApi.streamMessage({
        isAuthenticatedChat,
        sessionId,
        sessionToken: isAuthenticatedChat ? null : guestChatStorage.getToken(),
        message,
        signal: controller.signal,
        onEvent: (eventName, data) => {
          if (eventName === 'session') {
            setSessionId(data.sessionId)
            if (!isAuthenticatedChat) guestChatStorage.save(data)
          }
          if (eventName === 'status') setStatus(data.message || 'Đang xử lý yêu cầu...')
          if (eventName === 'delta' && data.content) {
            receivedContent = true
            setStatus('')
            setMessages((current) =>
              current.map((item) =>
                item.id === assistantId ? { ...item, content: item.content + data.content } : item
              )
            )
          }
          if (eventName === 'error') {
            streamError = new Error(data.message || 'Trợ lý AI không thể hoàn thành yêu cầu.')
          }
        },
      })

      if (streamError) throw streamError
      if (!receivedContent) {
        setMessages((current) =>
          current.map((item) =>
            item.id === assistantId
              ? { ...item, content: 'Mình chưa thể tạo câu trả lời. Bạn vui lòng thử lại nhé.' }
              : item
          )
        )
      }
      if (isAuthenticatedChat) loadUserSessions()
    } catch (requestError) {
      if (requestError.name === 'AbortError') return
      const messageText = getErrorMessage(requestError)
      setError(messageText)
      setMessages((current) =>
        current.map((item) =>
          item.id === assistantId && !item.content
            ? {
                ...item,
                content: 'Xin lỗi, kết nối với trợ lý đang gặp sự cố. Bạn hãy thử gửi lại.',
              }
            : item
        )
      )
    } finally {
      setStatus('')
      setIsSending(false)
      abortRef.current = null
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    sendMessage(input)
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <div className="fixed right-4 bottom-4 z-[100] sm:right-6 sm:bottom-6">
      {isOpen ? (
        <section
          aria-label="Trợ lý AI StockSpace"
          className="flex h-[min(680px,calc(100vh-2rem))] w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.22)] sm:h-[650px] sm:w-[420px]"
        >
          <header className="relative overflow-hidden bg-slate-950 px-5 pt-5 pb-4 text-white">
            <div className="absolute -top-12 -right-8 h-32 w-32 rounded-full bg-orange-500/20 blur-2xl" />
            <div className="relative flex items-center gap-3">
              <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 shadow-lg shadow-orange-950/30">
                <Bot size={24} />
                <span className="absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-slate-950 bg-emerald-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h2 className="font-bold tracking-tight">StockSpace AI</h2>
                  <Sparkles size={14} className="text-orange-300" />
                </div>
                <p className="truncate text-xs text-slate-300">{roleConfig.subtitle}</p>
              </div>
              {isAuthenticatedChat && (
                <button
                  type="button"
                  onClick={() => setShowHistory((value) => !value)}
                  className="rounded-xl p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
                  aria-label="Lịch sử trò chuyện"
                >
                  <History size={20} />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-xl p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
                aria-label="Đóng chat"
              >
                <X size={20} />
              </button>
            </div>
          </header>

          {showHistory && isAuthenticatedChat ? (
            <div className="flex min-h-0 flex-1 flex-col bg-slate-50">
              <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
                <button
                  type="button"
                  onClick={() => setShowHistory(false)}
                  className="flex items-center gap-1 text-sm font-semibold text-slate-700 hover:text-orange-600"
                >
                  <ChevronLeft size={18} /> Trò chuyện
                </button>
                <button
                  type="button"
                  onClick={startNewChat}
                  className="flex items-center gap-1.5 rounded-xl bg-orange-500 px-3 py-2 text-xs font-bold text-white hover:bg-orange-600"
                >
                  <Plus size={15} /> Cuộc chat mới
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-3">
                {isLoadingHistory ? (
                  <div className="flex h-full items-center justify-center text-slate-500">
                    <LoaderCircle size={24} className="animate-spin" />
                  </div>
                ) : sessions.length ? (
                  <div className="space-y-2">
                    {sessions.map((item) => (
                      <div
                        key={item.id}
                        className={`group flex w-full items-center rounded-2xl border pr-2 transition ${
                          sessionId === item.id
                            ? 'border-orange-200 bg-orange-50'
                            : 'border-slate-200 bg-white hover:border-orange-200'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => selectSession(item)}
                          className="flex min-w-0 flex-1 items-center gap-3 p-3 text-left"
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                            <MessageCircleMore size={18} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-slate-800">
                              {item.title || 'Cuộc trò chuyện mới'}
                            </span>
                            <span className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-400">
                              <Clock3 size={11} />
                              {new Date(item.updatedAt || item.createdAt).toLocaleDateString(
                                'vi-VN'
                              )}
                            </span>
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={(event) => deleteSession(event, item)}
                          className="rounded-lg p-2 text-slate-300 opacity-0 transition group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 focus:opacity-100"
                          aria-label="Xóa cuộc trò chuyện"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center px-8 text-center text-slate-500">
                    <History size={34} className="mb-3 text-slate-300" />
                    <p className="text-sm font-semibold text-slate-700">Chưa có cuộc trò chuyện</p>
                    <p className="mt-1 text-xs">Tin nhắn đầu tiên của bạn sẽ xuất hiện tại đây.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="min-h-0 flex-1 overflow-y-auto bg-[#f7f8fa] px-4 py-5">
                {isAuthenticatedChat && sessionId && (
                  <button
                    type="button"
                    onClick={startNewChat}
                    disabled={isSending}
                    className="mx-auto mb-4 flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-orange-200 hover:text-orange-600 disabled:opacity-50"
                  >
                    <Plus size={14} /> Cuộc trò chuyện mới
                  </button>
                )}

                {isLoadingHistory ? (
                  <div className="flex h-full items-center justify-center text-slate-400">
                    <LoaderCircle size={24} className="animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((item) => {
                      const fromUser = item.role === 'user'
                      return (
                        <div
                          key={item.id}
                          className={`flex gap-2.5 ${fromUser ? 'justify-end' : ''}`}
                        >
                          {!fromUser && (
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-orange-300">
                              <Bot size={17} />
                            </span>
                          )}
                          <div
                            className={`max-w-[82%] ${fromUser ? 'items-end' : 'items-start'} flex flex-col`}
                          >
                            <div
                              className={`rounded-2xl px-3.5 py-2.5 text-sm leading-6 whitespace-pre-wrap ${
                                fromUser
                                  ? 'rounded-br-md bg-orange-500 text-white shadow-sm'
                                  : 'rounded-bl-md border border-slate-200 bg-white text-slate-700 shadow-sm'
                              }`}
                            >
                              {item.content || (
                                <span className="flex items-center gap-1 py-1 text-slate-400">
                                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.2s]" />
                                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.1s]" />
                                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" />
                                </span>
                              )}
                            </div>
                            {item.createdAt && (
                              <span className="mt-1 px-1 text-[10px] text-slate-400">
                                {formatTime(item.createdAt)}
                              </span>
                            )}
                          </div>
                          {fromUser && (
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                              <UserRound size={16} />
                            </span>
                          )}
                        </div>
                      )
                    })}

                    {messages.length === 1 && (
                      <div className="pt-1">
                        <p className="mb-2 text-xs font-semibold text-slate-500">Bạn có thể hỏi</p>
                        <div className="flex flex-wrap gap-2">
                          {suggestions.map((suggestion) => (
                            <button
                              type="button"
                              key={suggestion}
                              onClick={() => sendMessage(suggestion)}
                              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-xs font-medium text-slate-600 shadow-sm transition hover:border-orange-300 hover:text-orange-600"
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {status && (
                      <p className="pl-11 text-xs font-medium text-orange-600">{status}</p>
                    )}
                    <div ref={bottomRef} />
                  </div>
                )}
              </div>

              <footer className="border-t border-slate-200 bg-white p-3">
                {error && (
                  <div className="mb-2 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">
                    {error}
                  </div>
                )}
                <form
                  onSubmit={handleSubmit}
                  className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1.5 focus-within:border-orange-300 focus-within:ring-2 focus-within:ring-orange-100"
                >
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(event) => setInput(event.target.value.slice(0, 2000))}
                    onKeyDown={handleKeyDown}
                    disabled={isSending}
                    rows={1}
                    placeholder="Nhập câu hỏi của bạn..."
                    className="max-h-24 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 disabled:opacity-60"
                    aria-label="Tin nhắn"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || isSending}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-white shadow-sm transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300"
                    aria-label="Gửi tin nhắn"
                  >
                    {isSending ? (
                      <LoaderCircle size={18} className="animate-spin" />
                    ) : (
                      <SendHorizontal size={18} />
                    )}
                  </button>
                </form>
                <p className="mt-2 text-center text-[10px] text-slate-400">
                  AI có thể mắc lỗi. Hãy kiểm tra lại thông tin quan trọng.
                </p>
              </footer>
            </>
          )}
        </section>
      ) : (
        <button
          type="button"
          onClick={handleOpen}
          className="group relative flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-[0_12px_35px_rgba(15,23,42,0.35)] transition hover:-translate-y-1 hover:bg-slate-900"
          aria-label="Mở trợ lý AI StockSpace"
        >
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-emerald-500" />
          <MessageCircleMore size={29} className="transition group-hover:scale-110" />
          <span className="pointer-events-none absolute right-full mr-3 hidden rounded-xl bg-slate-950 px-3 py-2 text-xs font-semibold whitespace-nowrap shadow-lg sm:group-hover:block">
            Hỏi StockSpace AI
          </span>
        </button>
      )}
    </div>
  )
}

const AIChatWidget = () => {
  const { isAuthenticated, user } = useSelector((state) => state.auth)
  const chatRole = isAuthenticated ? AUTH_ROLE_TO_CHAT_ROLE[user?.role] : 'guest'

  if (!chatRole) return null

  return <AIChatPanel key={chatRole} chatRole={chatRole} />
}

export default AIChatWidget
