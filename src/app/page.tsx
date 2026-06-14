'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send,
  Phone,
  MoreVertical,
  Bot,
  User,
  RotateCcw,
  Sparkles,
  Headphones,
  MessageCircle,
  Clock,
  Shield
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

const quickActions = [
  { id: '1', icon: Clock, label: 'ساعات العمل', message: 'متى ساعات العمل عندكم؟' },
  { id: '2', icon: Headphones, label: 'الدعم الفني', message: 'محتاج مساعدة فنية' },
  { id: '3', icon: Shield, label: 'سياسة الإرجاع', message: 'وش سياسة الإرجاع عندكم؟' },
  { id: '4', icon: MessageCircle, label: 'تتبع طلب', message: 'أبي أتتبع طلبي' },
]

const welcomeMessages = [
  'يا هلا ومرحبا فيك! 🌟',
  'أنا مساعدك الذكي، موجود أخدمك وأساعدك بأي استفسار',
  'اسألني أو اختر من الخيارات السريعة تحت 👇',
]

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showWelcome, setShowWelcome] = useState(true)
  const [isOnline, setIsOnline] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading, scrollToBottom])

  // Simulate online status
  useEffect(() => {
    const interval = setInterval(() => {
      setIsOnline(true)
    }, 10000)
    return () => clearInterval(interval)
  }, [])

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return

    setShowWelcome(false)

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const chatMessages = [...messages, userMessage].map(m => ({
        role: m.role,
        content: m.content,
      }))

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: chatMessages }),
      })

      const data = await res.json()

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply,
        timestamp: new Date(),
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'معليش يا الغالي، صار خلل بسيط. جرب مرة ثانية وإن شاء الله يضبط',
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  const handleQuickAction = (message: string) => {
    sendMessage(message)
  }

  const resetChat = () => {
    setMessages([])
    setShowWelcome(true)
    setInput('')
    setIsLoading(false)
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ar-SA', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-amber-50 flex items-center justify-center p-2 sm:p-4 md:p-6" dir="rtl">
      {/* Phone Container */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md h-[100dvh] sm:h-[85vh] sm:max-h-[800px] bg-white sm:rounded-[2rem] sm:shadow-2xl sm:border sm:border-gray-200/50 flex flex-col overflow-hidden relative"
      >
        {/* Notch / Dynamic Island */}
        <div className="hidden sm:flex justify-center pt-2 px-4">
          <div className="w-32 h-6 bg-black rounded-full" />
        </div>

        {/* Header */}
        <div className="bg-gradient-to-l from-emerald-700 to-emerald-600 text-white px-4 py-3 sm:py-2 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div className="relative">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/30">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div className={`absolute -bottom-0.5 -left-0.5 w-3.5 h-3.5 rounded-full border-2 border-emerald-700 ${isOnline ? 'bg-green-400' : 'bg-gray-400'}`} />
              </div>
              <div>
                <h1 className="font-bold text-base leading-tight">مساعدك الذكي</h1>
                <p className="text-emerald-100 text-xs">
                  {isOnline ? '● متصل الآن' : '○ غير متصل'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="text-white/80 hover:text-white hover:bg-white/10 h-9 w-9"
                onClick={resetChat}
                title="محادثة جديدة"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-white/80 hover:text-white hover:bg-white/10 h-9 w-9"
              >
                <Phone className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-white/80 hover:text-white hover:bg-white/10 h-9 w-9"
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scroll-smooth"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: '#d1d5db transparent',
          }}
        >
          {/* Welcome Section */}
          <AnimatePresence>
            {showWelcome && (
              <motion.div
                initial={{ opacity: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col items-center py-6"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                  className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-full flex items-center justify-center shadow-lg shadow-emerald-200 mb-4"
                >
                  <Sparkles className="w-10 h-10 text-white" />
                </motion.div>
                {welcomeMessages.map((msg, i) => (
                  <motion.p
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + i * 0.2 }}
                    className={`text-center ${i === 0 ? 'text-lg font-bold text-emerald-800' : i === 1 ? 'text-sm text-gray-600' : 'text-xs text-gray-400'}`}
                  >
                    {msg}
                  </motion.p>
                ))}

                {/* Quick Actions */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 }}
                  className="grid grid-cols-2 gap-2 w-full mt-5"
                >
                  {quickActions.map((action) => (
                    <button
                      key={action.id}
                      onClick={() => handleQuickAction(action.message)}
                      className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-emerald-100 bg-emerald-50/50 hover:bg-emerald-100 hover:border-emerald-200 transition-all duration-200 active:scale-95"
                    >
                      <action.icon className="w-5 h-5 text-emerald-600" />
                      <span className="text-xs font-medium text-emerald-700">{action.label}</span>
                    </button>
                  ))}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Messages */}
          {messages.map((message, index) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className={`flex gap-2 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              <div className="flex-shrink-0 mt-1">
                {message.role === 'assistant' ? (
                  <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-full flex items-center justify-center">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                ) : (
                  <div className="w-8 h-8 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>

              {/* Bubble */}
              <div className={`max-w-[75%] ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div
                  className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    message.role === 'user'
                      ? 'bg-emerald-600 text-white rounded-br-md'
                      : 'bg-gray-100 text-gray-800 rounded-bl-md'
                  }`}
                >
                  {message.content}
                </div>
                <p className={`text-[10px] text-gray-400 mt-1 px-2 ${message.role === 'user' ? 'text-left' : 'text-right'}`}>
                  {formatTime(message.timestamp)}
                </p>
              </div>
            </motion.div>
          ))}

          {/* Typing Indicator */}
          <AnimatePresence>
            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="flex gap-2"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex gap-1.5 items-center">
                    <motion.div
                      className="w-2 h-2 bg-emerald-500 rounded-full"
                      animate={{ y: [0, -6, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                    />
                    <motion.div
                      className="w-2 h-2 bg-emerald-500 rounded-full"
                      animate={{ y: [0, -6, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: 0.15 }}
                    />
                    <motion.div
                      className="w-2 h-2 bg-emerald-500 rounded-full"
                      animate={{ y: [0, -6, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Quick Actions in chat (show after first response) */}
          {messages.length > 0 && messages[messages.length - 1].role === 'assistant' && !isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-wrap gap-1.5 pt-2 justify-center"
            >
              {quickActions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => handleQuickAction(action.message)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-emerald-200 bg-emerald-50/50 text-emerald-700 text-xs hover:bg-emerald-100 transition-all duration-200 active:scale-95"
                >
                  <action.icon className="w-3 h-3" />
                  {action.label}
                </button>
              ))}
            </motion.div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-100 bg-white px-3 py-2 pb-[env(safe-area-inset-bottom,8px)] flex-shrink-0">
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="اكتب رسالتك هنا..."
                disabled={isLoading}
                className="w-full bg-gray-50 border border-gray-200 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all disabled:opacity-50 placeholder:text-gray-400"
                dir="rtl"
              />
            </div>
            <Button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="w-10 h-10 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex-shrink-0 shadow-lg shadow-emerald-200 disabled:opacity-40 disabled:shadow-none transition-all active:scale-90"
              size="icon"
            >
              <Send className="w-4 h-4 rotate-180" />
            </Button>
          </form>
          <p className="text-center text-[10px] text-gray-300 mt-1.5">
            مدعوم بالذكاء الاصطناعي
          </p>
        </div>

        {/* Bottom Home Indicator (mobile feel) */}
        <div className="hidden sm:flex justify-center pb-2 bg-white">
          <div className="w-32 h-1 bg-gray-200 rounded-full" />
        </div>
      </motion.div>
    </div>
  )
}
