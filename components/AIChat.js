import { useState, useRef, useEffect } from 'react'
import { Bot, User, Send, Loader2, Zap, Wrench, ChevronDown, ChevronUp } from 'lucide-react'

const QUICK_QUESTIONS = {
  admin: [
    'How many devices are online right now?',
    'Show me all customer devices',
    'List all support users',
    'Which devices are offline?',
  ],
  support: [
    'Show me all customer devices',
    'Which devices are currently offline?',
    'How many customers are registered?',
    'Show device readings for all thermostats',
  ],
  customer: [
    'What devices do I have?',
    'Turn on all my lights',
    'What is the temperature in my home?',
    'Lock my front door',
  ],
}

function ToolCallBadge({ toolCallLog }) {
  const [expanded, setExpanded] = useState(false)
  if (!toolCallLog || toolCallLog.length === 0) return null

  const toolNames = {
    get_devices: 'Fetched devices',
    get_device_readings: 'Fetched readings',
    control_device: 'Controlled device',
    get_users: 'Fetched users',
    create_user: 'Created user',
  }

  return (
    <div className="mt-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-400 transition-colors"
      >
        <Wrench size={11} />
        <span>{toolCallLog.length} action{toolCallLog.length > 1 ? 's' : ''} taken</span>
        {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
      </button>
      {expanded && (
        <div className="mt-1.5 space-y-1">
          {toolCallLog.map((call, i) => (
            <div key={i} className="flex items-center gap-2 text-xs bg-gray-800/60 rounded px-2 py-1">
              <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
              <span className="text-blue-400 font-medium">{toolNames[call.tool] || call.tool}</span>
              {call.args && Object.keys(call.args).length > 0 && (
                <span className="text-gray-500 truncate">
                  {Object.entries(call.args)
                    .filter(([k]) => k !== 'params')
                    .map(([k, v]) => `${k}: ${typeof v === 'string' ? v.slice(0, 20) : v}`)
                    .join(', ')}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Message({ msg }) {
  const isUser = msg.role === 'user'

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${
        isUser ? 'bg-blue-600' : 'bg-gray-700'
      }`}>
        {isUser ? <User size={15} className="text-white" /> : <Bot size={15} className="text-blue-400" />}
      </div>
      <div className={`max-w-[80%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? 'bg-blue-600 text-white rounded-tr-sm'
            : 'bg-gray-800 text-gray-100 rounded-tl-sm'
        }`}>
          <p className="whitespace-pre-wrap">{msg.content}</p>
        </div>
        {msg.toolCallLog && <ToolCallBadge toolCallLog={msg.toolCallLog} />}
        <span className="text-xs text-gray-600 mt-1 px-1">
          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-full bg-gray-700 flex-shrink-0 flex items-center justify-center">
        <Bot size={15} className="text-blue-400" />
      </div>
      <div className="bg-gray-800 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1">
        <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  )
}

export default function AIChat({ userRole }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hi! I'm your IoT assistant. I can fetch real-time device data and ${
        userRole === 'support' ? 'help you monitor devices (view only)' : 'control your devices'
      }. What can I help you with?`,
      timestamp: Date.now(),
      toolCallLog: [],
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const sendMessage = async (text) => {
    const trimmed = (text || input).trim()
    if (!trimmed || loading) return

    setInput('')
    setError('')

    const userMsg = { role: 'user', content: trimmed, timestamp: Date.now() }
    setMessages((prev) => [...prev, userMsg])
    setLoading(true)

    try {
      // Build conversation history for API (exclude toolCallLog, timestamp)
      const history = messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({ role: m.role, content: m.content }))

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          conversationHistory: history,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to get response')
        return
      }

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.response,
          timestamp: Date.now(),
          toolCallLog: data.toolCallLog || [],
        },
      ])
    } catch {
      setError('Network error. Please check your connection.')
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const quickQuestions = QUICK_QUESTIONS[userRole] || QUICK_QUESTIONS.customer

  return (
    <div className="flex flex-col bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden" style={{ height: '600px' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-800 bg-gray-900">
        <div className="w-9 h-9 bg-blue-600/20 rounded-xl flex items-center justify-center">
          <Bot size={18} className="text-blue-400" />
        </div>
        <div>
          <h3 className="font-semibold text-white text-sm">IoT AI Agent</h3>
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <Zap size={10} className="text-green-400" />
            Powered by Groq · llama-3.3-70b-versatile · {userRole} access
          </p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs text-green-400">Live</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messages.map((msg, i) => (
          <Message key={i} msg={msg} />
        ))}
        {loading && <TypingIndicator />}
        {error && (
          <div className="bg-red-900/20 border border-red-800 text-red-400 text-sm rounded-xl px-4 py-3">
            {error}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick Questions */}
      {messages.length <= 1 && (
        <div className="px-5 pb-3">
          <p className="text-xs text-gray-600 mb-2">Quick questions:</p>
          <div className="flex flex-wrap gap-2">
            {quickQuestions.map((q) => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                disabled={loading}
                className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-full border border-gray-700 transition-colors disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-5 py-4 border-t border-gray-800">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask me anything about ${userRole === 'customer' ? 'your devices' : 'the IoT platform'}...`}
            rows={1}
            className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 resize-none placeholder-gray-600"
            style={{ minHeight: '42px', maxHeight: '120px' }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl px-4 py-2.5 transition-colors flex items-center gap-2 text-sm font-medium"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
        <p className="text-xs text-gray-600 mt-2">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  )
}
