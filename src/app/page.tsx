'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send,
  Phone,
  PhoneOff,
  User,
  RotateCcw,
  Headphones,
  MessageCircle,
  Clock,
  Shield,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Settings,
  X,
  Key,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isVoice?: boolean
}

type CallState = 'idle' | 'requesting_perm' | 'perm_denied' | 'ringing' | 'active' | 'listening' | 'processing' | 'speaking' | 'ended'

const quickActions = [
  { id: '1', icon: Clock, label: 'ساعات العمل', message: 'متى ساعات العمل عندكم؟' },
  { id: '2', icon: Headphones, label: 'الدعم الفني', message: 'محتاج مساعدة فنية' },
  { id: '3', icon: Shield, label: 'سياسة الإرجاع', message: 'وش سياسة الإرجاع عندكم؟' },
  { id: '4', icon: MessageCircle, label: 'تتبع طلب', message: 'أبي أتتبع طلبي' },
]

const welcomeMessages = [
  'يا هلا ومرحبا فيك!',
  'أنا نورة، مساعدتك الذكية، موجودة أخدمك وأساعدك بأي استفسار',
  'اسألني نصياً أو اضغط على المكالمة وتكلمي معاي صوت',
]

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showWelcome, setShowWelcome] = useState(true)
  const [isOnline, setIsOnline] = useState(true)

  // Voice call state
  const [callState, setCallState] = useState<CallState>('idle')
  const [callDuration, setCallDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [isSpeakerOn, setIsSpeakerOn] = useState(true)
  const [micPermission, setMicPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt')

  // Settings state
  const [showSettings, setShowSettings] = useState(false)
  const [ttsApiKey, setTtsApiKey] = useState('')
  const [ttsApiSaved, setTtsApiSaved] = useState(false)
  const [ttsApiStatus, setTtsApiStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [ttsProvider, setTtsProvider] = useState<'auto' | 'openai' | 'google'>('auto')
  const [ttsVoice, setTtsVoice] = useState('nova')

  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading, scrollToBottom])

  // Load TTS API key from localStorage
  useEffect(() => {
    const savedKey = localStorage.getItem('tts_api_key')
    const savedProvider = localStorage.getItem('tts_provider') as 'auto' | 'openai' | 'google' | null
    const savedVoice = localStorage.getItem('tts_voice')
    if (savedKey) {
      setTtsApiKey(savedKey)
      setTtsApiSaved(true)
    }
    if (savedProvider) setTtsProvider(savedProvider)
    if (savedVoice) setTtsVoice(savedVoice)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setIsOnline(true)
    }, 10000)
    return () => clearInterval(interval)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
      }
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      // Cancel any ongoing browser speech synthesis
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel()
        window.speechSynthesis.onvoiceschanged = null
      }
    }
  }, [])

  // ---- CHAT FUNCTIONS ----
  const sendMessage = async (text: string, isVoice = false) => {
    if (!text.trim() || isLoading) return

    setShowWelcome(false)

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
      isVoice,
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
      return data.reply
    } catch {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'معليش يا الغالية، صار خلل بسيط. جربي مرة ثانية وإن شاء الله يضبط',
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
      return null
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

  // ---- VOICE CALL FUNCTIONS ----
  const requestMicPermission = async (): Promise<boolean> => {
    try {
      // Check if permission was already granted
      if (micPermission === 'granted') return true

      setCallState('requesting_perm')

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 24000,
        }
      })

      // Permission granted - stop the stream for now, we'll request again when recording
      stream.getTracks().forEach(t => t.stop())
      setMicPermission('granted')
      return true
    } catch (error: unknown) {
      console.error('Mic permission error:', error)
      setMicPermission('denied')
      setCallState('perm_denied')
      return false
    }
  }

  const startCall = async () => {
    // First request mic permission
    const hasPermission = await requestMicPermission()
    if (!hasPermission) return

    setCallState('ringing')
    setCallDuration(0)

    // Simulate ringing for 2 seconds
    await new Promise(r => setTimeout(r, 2000))
    setCallState('active')

    // Start call timer
    callTimerRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1)
    }, 1000)

    // Play greeting via TTS
    await playTTS('يا هلا، معاك نورة. تفضلي كيف أقدر أخدمك؟')
  }

  const endCall = () => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current)
      callTimerRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    setCallState('ended')
    setTimeout(() => setCallState('idle'), 1500)
  }

  const startListening = async () => {
    try {
      // Check permission first
      if (micPermission === 'denied') {
        setCallState('perm_denied')
        return
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 24000,
        }
      })
      streamRef.current = stream
      setMicPermission('granted')

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
      })
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        // Stop all tracks
        stream.getTracks().forEach(t => t.stop())
        streamRef.current = null

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const reader = new FileReader()
        reader.readAsDataURL(audioBlob)
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1]
          if (!base64Audio) {
            setCallState('active')
            return
          }
          await processVoiceInput(base64Audio)
        }
      }

      mediaRecorder.start()
      setCallState('listening')
    } catch (error) {
      console.error('Microphone error:', error)
      setMicPermission('denied')
      setCallState('perm_denied')
    }
  }

  const stopListening = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    setCallState('processing')
  }

  const processVoiceInput = async (base64Audio: string) => {
    try {
      // 1. ASR - transcribe
      const asrRes = await fetch('/api/asr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio_base64: base64Audio }),
      })
      const asrData = await asrRes.json()

      if (!asrData.text || asrData.text.trim() === '') {
        setCallState('active')
        return
      }

      setShowWelcome(false)

      // Add user voice message to chat
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: asrData.text,
        timestamp: new Date(),
        isVoice: true,
      }
      setMessages(prev => [...prev, userMessage])

      // 2. Get AI response
      setCallState('processing')
      const chatMessages = [...messages, userMessage].map(m => ({
        role: m.role,
        content: m.content,
      }))

      const chatRes = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: chatMessages }),
      })
      const chatData = await chatRes.json()
      const reply = chatData.reply

      // Add assistant message to chat
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: reply,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, assistantMessage])

      // 3. TTS - speak the response
      setCallState('speaking')
      await playTTS(reply)

      // Go back to active (ready to listen again)
      setCallState('active')
    } catch (error) {
      console.error('Voice processing error:', error)
      setCallState('active')
    }
  }

  const playTTS = async (text: string): Promise<void> => {
    // Stop any currently playing audio first to prevent overlap
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }

    try {
      // Priority 1: Use TTS API if key is saved
      const savedKey = localStorage.getItem('tts_api_key')
      const savedProvider = localStorage.getItem('tts_provider') || 'auto'
      const savedVoice = localStorage.getItem('tts_voice') || 'nova'
      if (savedKey) {
        try {
          const res = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, speed: 1.0, api_key: savedKey, provider: savedProvider, voice: savedVoice }),
          })

          if (res.ok) {
            const audioBlob = await res.blob()
            const audioUrl = URL.createObjectURL(audioBlob)
            const audio = new Audio(audioUrl)
            audioRef.current = audio

            return new Promise<void>((resolve) => {
              audio.onended = () => {
                URL.revokeObjectURL(audioUrl)
                audioRef.current = null
                resolve()
              }
              audio.onerror = () => {
                URL.revokeObjectURL(audioUrl)
                audioRef.current = null
                // Fall back to browser TTS
                browserTTS(text, resolve)
              }
              audio.play().catch(() => {
                URL.revokeObjectURL(audioUrl)
                audioRef.current = null
                browserTTS(text, resolve)
              })
            })
          }
        } catch (error) {
          console.error('API TTS failed, falling back to browser:', error)
        }
      }

      // Priority 2: Use browser's built-in SpeechSynthesis as fallback
      return new Promise<void>((resolve) => {
        browserTTS(text, resolve)
      })
    } catch (error) {
      console.error('TTS playback error:', error)
    }
  }

  const browserTTS = (text: string, resolve: (value: void) => void) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'ar-SA'
      utterance.rate = 0.95
      utterance.pitch = 1.0
      utterance.volume = 1.0

      const voices = window.speechSynthesis.getVoices()
      // Prefer a female Arabic voice for نورة
      const arabicFemaleVoice = voices.find(v =>
        v.lang.startsWith('ar') &&
        (/female|woman|أنثى|زينب|zaynab|laila|ليلى|majed/i.test(v.name) ||
         /^[A-Z]/.test(v.name.charAt(0)) && /A$/.test(v.name))
      )
      const arabicVoice = arabicFemaleVoice || voices.find(v => v.lang.startsWith('ar'))
      if (arabicVoice) {
        utterance.voice = arabicVoice
      }

      utterance.onend = () => resolve()
      utterance.onerror = () => resolve()

      if (voices.length === 0) {
        window.speechSynthesis.onvoiceschanged = () => {
          const newVoices = window.speechSynthesis.getVoices()
          const arFemaleVoice = newVoices.find(v =>
            v.lang.startsWith('ar') &&
            (/female|woman|أنثى|زينب|zaynab|laila|ليلى|majed/i.test(v.name) ||
             /^[A-Z]/.test(v.name.charAt(0)) && /A$/.test(v.name))
          )
          const arVoice = arFemaleVoice || newVoices.find(v => v.lang.startsWith('ar'))
          if (arVoice) utterance.voice = arVoice
          window.speechSynthesis.speak(utterance)
        }
      } else {
        window.speechSynthesis.speak(utterance)
      }
    } else {
      console.warn('SpeechSynthesis not supported')
      resolve()
    }
  }

  const saveTtsApiKey = async () => {
    if (!ttsApiKey.trim()) return

    setTtsApiStatus('testing')
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'تجربة', speed: 1.0, api_key: ttsApiKey.trim(), provider: ttsProvider }),
      })

      if (res.ok) {
        localStorage.setItem('tts_api_key', ttsApiKey.trim())
        localStorage.setItem('tts_provider', ttsProvider)
        localStorage.setItem('tts_voice', ttsVoice)
        setTtsApiSaved(true)
        setTtsApiStatus('success')
      } else {
        const data = await res.json().catch(() => ({}))
        console.error('TTS test failed:', data)
        setTtsApiStatus('error')
      }
    } catch {
      setTtsApiStatus('error')
    }

    setTimeout(() => setTtsApiStatus('idle'), 3000)
  }

  const removeTtsApiKey = () => {
    localStorage.removeItem('tts_api_key')
    localStorage.removeItem('tts_provider')
    localStorage.removeItem('tts_voice')
    setTtsApiKey('')
    setTtsApiSaved(false)
    setTtsApiStatus('idle')
    setTtsProvider('auto')
    setTtsVoice('nova')
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ar-SA', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  }

  const formatCallDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const getCallStateText = () => {
    switch (callState) {
      case 'requesting_perm': return 'يطلب إذن المايكروفون...'
      case 'perm_denied': return 'إذن المايكروفون مرفوض'
      case 'ringing': return 'يتصل...'
      case 'active': return 'اضغط الميكروفون للتحدث'
      case 'listening': return 'تتكلم...'
      case 'processing': return 'تفكر...'
      case 'speaking': return 'نورة تتكلم...'
      case 'ended': return 'انتهت المكالمة'
      default: return ''
    }
  }

  const isInCall = callState !== 'idle'

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
        <div className={`text-white px-4 py-3 sm:py-2 flex-shrink-0 transition-all duration-500 ${
          isInCall
            ? 'bg-gradient-to-l from-gray-800 to-gray-900'
            : 'bg-gradient-to-l from-emerald-700 to-emerald-600'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className={`w-10 h-10 backdrop-blur-sm rounded-full flex items-center justify-center border transition-colors duration-500 ${
                  isInCall
                    ? 'bg-white/10 border-white/20'
                    : 'bg-white/20 border-white/30'
                }`}>
                  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M5.5 21c0-3.5 3-6.5 6.5-6.5s6.5 3 6.5 6.5" />
                  </svg>
                </div>
                <div className={`absolute -bottom-0.5 -left-0.5 w-3.5 h-3.5 rounded-full border-2 ${
                  isInCall ? 'border-gray-900' : 'border-emerald-700'
                } ${isOnline ? 'bg-green-400' : 'bg-gray-400'}`} />
              </div>
              <div>
                <h1 className="font-bold text-base leading-tight">
                  {isInCall ? 'مكالمة جارية' : 'نورة'}
                </h1>
                <p className={`text-xs ${isInCall ? 'text-gray-300' : 'text-emerald-100'}`}>
                  {isInCall ? getCallStateText() : isOnline ? '● متصل الآن' : '○ غير متصل'}
                </p>
              </div>
            </div>
            {!isInCall && (
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
                  onClick={startCall}
                  title="مكالمة صوتية"
                >
                  <Phone className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`text-white/80 hover:text-white hover:bg-white/10 h-9 w-9 relative ${ttsApiSaved ? '' : ''}`}
                  onClick={() => setShowSettings(true)}
                  title="إعدادات الصوت"
                >
                  <Settings className="w-4 h-4" />
                  {ttsApiSaved && (
                    <span className="absolute -top-0.5 -left-0.5 w-2 h-2 bg-green-400 rounded-full" />
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Call Duration Timer */}
          {isInCall && callState !== 'ended' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center mt-1"
            >
              <span className="text-sm font-mono text-gray-300">{formatCallDuration(callDuration)}</span>
            </motion.div>
          )}
        </div>

        {/* Main Content Area */}
        {isInCall ? (
          /* ---- VOICE CALL UI ---- */
          <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-white px-6 py-8">
            <AnimatePresence mode="wait">
              {/* ---- MIC PERMISSION REQUEST SCREEN ---- */}
              {callState === 'requesting_perm' && (
                <motion.div
                  key="requesting_perm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center text-center"
                >
                  <motion.div
                    className="w-28 h-28 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center mb-6"
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <Mic className="w-14 h-14 text-white" />
                  </motion.div>
                  <h3 className="text-lg font-bold text-gray-800 mb-2">يحتاج إذن المايكروفون</h3>
                  <p className="text-gray-500 text-sm max-w-xs mb-4">
                    عشان نسمعك ونتكلم معاك، لازم تعطينا إذن استخدام المايكروفون
                  </p>
                  <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 max-w-xs">
                    <p className="text-blue-700 text-xs">
                      المتصفح بيسألك الحين إذا تسمح بالمايكروفون - اضغط &quot;سماح&quot;
                    </p>
                  </div>
                  <motion.div
                    className="mt-6 flex items-center gap-2 text-gray-400 text-sm"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <motion.div
                      className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    />
                    ينتظر موافقتك...
                  </motion.div>
                </motion.div>
              )}

              {/* ---- MIC PERMISSION DENIED SCREEN ---- */}
              {callState === 'perm_denied' && (
                <motion.div
                  key="perm_denied"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center text-center"
                >
                  <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-6">
                    <MicOff className="w-10 h-10 text-red-500" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 mb-2">ما قدرنا نصل للمايكروفون</h3>
                  <p className="text-gray-500 text-sm max-w-xs mb-4">
                    إذن المايكروفون مرفوض. بدون المايكروفون ما نقدر نسمعك.
                  </p>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 max-w-xs mb-6">
                    <p className="text-amber-800 text-xs font-medium mb-2">عشان تسمح بالمايكروفون:</p>
                    <ol className="text-amber-700 text-xs space-y-1 text-right list-decimal pr-4">
                      <li>اضغط على أيقونة القفل أو الإعدادات بجانب الرابط</li>
                      <li>الدور على &quot;المايكروفون&quot; واختر &quot;سماح&quot;</li>
                      <li>أعد تحميل الصفحة وجرب مرة ثانية</li>
                    </ol>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={async () => {
                        setMicPermission('prompt')
                        setCallState('idle')
                        // Try again
                        setTimeout(async () => {
                          const hasPermission = await requestMicPermission()
                          if (hasPermission) {
                            setCallState('ringing')
                            setCallDuration(0)
                            await new Promise(r => setTimeout(r, 2000))
                            setCallState('active')
                            callTimerRef.current = setInterval(() => {
                              setCallDuration(prev => prev + 1)
                            }, 1000)
                            await playTTS('يا هلا، معاك نورة. تفضلي كيف أقدر أخدمك؟')
                          }
                        }, 100)
                      }}
                      className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-sm font-medium transition-colors active:scale-95"
                    >
                      <RotateCcw className="w-4 h-4" />
                      جرب مرة ثانية
                    </button>
                    <button
                      onClick={() => setCallState('idle')}
                      className="flex items-center gap-2 px-5 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-full text-sm font-medium transition-colors active:scale-95"
                    >
                      رجع للمحادثة
                    </button>
                  </div>
                </motion.div>
              )}

              {callState === 'ringing' && (
                <motion.div
                  key="ringing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center"
                >
                  <div className="relative">
                    <motion.div
                      className="w-28 h-28 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-full flex items-center justify-center"
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <svg className="w-14 h-14 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="8" r="4" />
                        <path d="M5.5 21c0-3.5 3-6.5 6.5-6.5s6.5 3 6.5 6.5" />
                      </svg>
                    </motion.div>
                    {/* Ringing rings */}
                    <motion.div
                      className="absolute inset-0 border-4 border-emerald-400 rounded-full"
                      animate={{ scale: [1, 1.3], opacity: [0.5, 0] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    />
                    <motion.div
                      className="absolute inset-0 border-4 border-emerald-400 rounded-full"
                      animate={{ scale: [1, 1.3], opacity: [0.5, 0] }}
                      transition={{ duration: 1, repeat: Infinity, delay: 0.5 }}
                    />
                  </div>
                  <p className="text-gray-500 mt-6 text-sm">يتصل بنورة...</p>
                </motion.div>
              )}

              {callState === 'ended' && (
                <motion.div
                  key="ended"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center"
                >
                  <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-4">
                    <PhoneOff className="w-10 h-10 text-red-500" />
                  </div>
                  <p className="text-gray-600 font-medium">انتهت المكالمة</p>
                  <p className="text-gray-400 text-sm mt-1">المدة: {formatCallDuration(callDuration)}</p>
                </motion.div>
              )}

              {(callState === 'active' || callState === 'listening' || callState === 'processing' || callState === 'speaking') && (
                <motion.div
                  key="active-call"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center w-full"
                >
                  {/* Bot Avatar with voice animation */}
                  <div className="relative mb-6">
                    <div className={`w-28 h-28 rounded-full flex items-center justify-center transition-all duration-300 ${
                      callState === 'speaking'
                        ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-200'
                        : callState === 'listening'
                        ? 'bg-gradient-to-br from-blue-400 to-blue-600 shadow-lg shadow-blue-200'
                        : 'bg-gradient-to-br from-emerald-500 to-emerald-700'
                    }`}>
                      <svg className="w-14 h-14 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="8" r="4" />
                        <path d="M5.5 21c0-3.5 3-6.5 6.5-6.5s6.5 3 6.5 6.5" />
                      </svg>
                    </div>

                    {/* Sound waves animation when speaking */}
                    {callState === 'speaking' && (
                      <>
                        <motion.div
                          className="absolute inset-0 border-3 border-emerald-300 rounded-full"
                          animate={{ scale: [1, 1.2], opacity: [0.6, 0] }}
                          transition={{ duration: 0.8, repeat: Infinity }}
                        />
                        <motion.div
                          className="absolute inset-0 border-3 border-emerald-300 rounded-full"
                          animate={{ scale: [1, 1.2], opacity: [0.6, 0] }}
                          transition={{ duration: 0.8, repeat: Infinity, delay: 0.4 }}
                        />
                      </>
                    )}

                    {/* Listening indicator */}
                    {callState === 'listening' && (
                      <>
                        <motion.div
                          className="absolute inset-0 border-3 border-blue-300 rounded-full"
                          animate={{ scale: [1, 1.2], opacity: [0.6, 0] }}
                          transition={{ duration: 0.8, repeat: Infinity }}
                        />
                      </>
                    )}
                  </div>

                  {/* State text */}
                  <p className="text-gray-700 font-medium text-lg mb-2">
                    {callState === 'active' && 'تقدر تتكلم الحين'}
                    {callState === 'listening' && 'تسمعك...'}
                    {callState === 'processing' && 'تجهز الرد...'}
                    {callState === 'speaking' && 'ترد عليك...'}
                  </p>
                  <p className="text-gray-400 text-xs mb-8">
                    {callState === 'active' && 'اضغط زر الميكروفون وابدأ تتكلم'}
                    {callState === 'listening' && 'تكلم الحين واضغط مرة ثانية لما تخلص'}
                    {callState === 'processing' && 'ثواني ونرد عليك'}
                    {callState === 'speaking' && 'اسمع الرد'}
                  </p>

                  {/* Live waveform visualization */}
                  {(callState === 'listening' || callState === 'speaking') && (
                    <div className="flex items-center justify-center gap-1 mb-8 h-12">
                      {Array.from({ length: 20 }).map((_, i) => (
                        <motion.div
                          key={i}
                          className={`w-1 rounded-full ${
                            callState === 'speaking' ? 'bg-emerald-400' : 'bg-blue-400'
                          }`}
                          animate={{
                            height: callState === 'listening' || callState === 'speaking'
                              ? [8, Math.random() * 40 + 8, 8]
                              : 8,
                          }}
                          transition={{
                            duration: 0.4 + Math.random() * 0.3,
                            repeat: Infinity,
                            delay: i * 0.05,
                          }}
                        />
                      ))}
                    </div>
                  )}

                  {/* Call Control Buttons */}
                  <div className="flex items-center justify-center gap-6 mt-4">
                    {/* Mute */}
                    <button
                      onClick={() => setIsMuted(!isMuted)}
                      className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                        isMuted
                          ? 'bg-red-100 text-red-500'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                    </button>

                    {/* Main mic button - push to talk */}
                    {callState === 'active' ? (
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={startListening}
                        className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center shadow-xl shadow-blue-200 active:shadow-none"
                      >
                        <Mic className="w-8 h-8 text-white" />
                      </motion.button>
                    ) : callState === 'listening' ? (
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={stopListening}
                        className="w-20 h-20 bg-gradient-to-br from-red-500 to-red-700 rounded-full flex items-center justify-center shadow-xl shadow-red-200"
                      >
                        <motion.div
                          animate={{ scale: [1, 1.1, 1] }}
                          transition={{ duration: 1, repeat: Infinity }}
                        >
                          <Mic className="w-8 h-8 text-white" />
                        </motion.div>
                      </motion.button>
                    ) : (
                      <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          className="w-8 h-8 border-3 border-gray-400 border-t-transparent rounded-full"
                        />
                      </div>
                    )}

                    {/* Speaker */}
                    <button
                      onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                      className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                        isSpeakerOn
                          ? 'bg-emerald-100 text-emerald-600'
                          : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                      }`}
                    >
                      {isSpeakerOn ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
                    </button>
                  </div>

                  {/* End Call */}
                  <button
                    onClick={endCall}
                    className="mt-8 flex items-center gap-2 px-8 py-3 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors active:scale-95"
                  >
                    <PhoneOff className="w-5 h-5" />
                    <span className="font-medium">إنهاء المكالمة</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          /* ---- CHAT UI ---- */
          <>
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
                      <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="8" r="4" />
                      <path d="M5.5 21c0-3.5 3-6.5 6.5-6.5s6.5 3 6.5 6.5" />
                    </svg>
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

                    {/* Call CTA */}
                    <motion.button
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.1 }}
                      onClick={startCall}
                      className="mt-4 flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-sm font-medium shadow-lg shadow-emerald-200 transition-all active:scale-95"
                    >
                      <Phone className="w-4 h-4" />
                      تكلمي معاي صوت
                    </motion.button>

                    {/* Quick Actions */}
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.3 }}
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
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 15, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className={`flex gap-2 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <div className="flex-shrink-0 mt-1">
                    {message.role === 'assistant' ? (
                      <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="8" r="4" />
                          <path d="M5.5 21c0-3.5 3-6.5 6.5-6.5s6.5 3 6.5 6.5" />
                        </svg>
                      </div>
                    ) : (
                      <div className="w-8 h-8 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>

                  <div className={`max-w-[75%] ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                        message.role === 'user'
                          ? 'bg-emerald-600 text-white rounded-br-md'
                          : 'bg-gray-100 text-gray-800 rounded-bl-md'
                      }`}
                    >
                      <span>{message.content}</span>
                      {message.isVoice && (
                        <span className="inline-block mr-1 opacity-60">
                          <Mic className="w-3 h-3 inline" />
                        </span>
                      )}
                    </div>
                    <div className={`flex items-center gap-2 mt-1 px-2 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                      <p className="text-[10px] text-gray-400">
                        {formatTime(message.timestamp)}
                      </p>
                      {message.role === 'assistant' && (
                        <button
                          onClick={() => playTTS(message.content)}
                          className="text-emerald-500 hover:text-emerald-700 transition-colors active:scale-90"
                          title="اسمع الرد"
                          aria-label="تشغيل الصوت"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
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
                      <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="8" r="4" />
                        <path d="M5.5 21c0-3.5 3-6.5 6.5-6.5s6.5 3 6.5 6.5" />
                      </svg>
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

              {/* Quick Actions after response */}
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
          </>
        )}

        {/* Bottom Home Indicator */}
        <div className="hidden sm:flex justify-center pb-2 bg-white">
          <div className="w-32 h-1 bg-gray-200 rounded-full" />
        </div>
      </motion.div>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowSettings(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
              dir="rtl"
            >
              {/* Settings Header */}
              <div className="bg-gradient-to-l from-emerald-700 to-emerald-600 text-white px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  <h2 className="font-bold text-lg">إعدادات الصوت</h2>
                </div>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-white/80 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-5">
                {/* TTS Provider Selection */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <h3 className="font-bold text-emerald-800 mb-2 flex items-center gap-2">
                    <Key className="w-4 h-4" />
                    مفتاح API للتحويل الصوتي
                  </h3>
                  <p className="text-emerald-700 text-xs leading-relaxed mb-3">
                    عشان المساعدة تتكلم عربي بصوت واضح وطبيعي، تحتاج مفتاح API. يدعم OpenAI و Google Cloud.
                  </p>
                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={() => {
                        setTtsProvider('openai')
                        setTtsVoice('nova')
                      }}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                        ttsProvider === 'openai'
                          ? 'bg-emerald-600 text-white shadow'
                          : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                      }`}
                    >
                      OpenAI (sk-...)
                    </button>
                    <button
                      onClick={() => {
                        setTtsProvider('google')
                        setTtsVoice('ar-XA-Standard-A')
                      }}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                        ttsProvider === 'google'
                          ? 'bg-emerald-600 text-white shadow'
                          : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                      }`}
                    >
                      Google (AIza...)
                    </button>
                    <button
                      onClick={() => setTtsProvider('auto')}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                        ttsProvider === 'auto'
                          ? 'bg-emerald-600 text-white shadow'
                          : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                      }`}
                    >
                      تلقائي
                    </button>
                  </div>
                  {ttsProvider === 'auto' && (
                    <p className="text-emerald-600 text-[10px]">يكتف تلقائياً بناءً على شكل المفتاح</p>
                  )}
                </div>

                {/* Voice Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    الصوت
                  </label>
                  <select
                    value={ttsVoice}
                    onChange={(e) => setTtsVoice(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
                    dir="rtl"
                  >
                    {(ttsProvider === 'openai' || ttsProvider === 'auto') && (
                      <>
                        <option disabled value="">─ أصوات OpenAI ─</option>
                        <option value="alloy">Alloy (متوازن)</option>
                        <option value="echo">Echo (ذكر)</option>
                        <option value="fable">Fable (معبر)</option>
                        <option value="onyx">Onyx (ذكر عميق)</option>
                        <option value="nova">Nova (أنثى)</option>
                        <option value="shimmer">Shimmer (أنثى ناعم)</option>
                      </>
                    )}
                    {(ttsProvider === 'google' || ttsProvider === 'auto') && (
                      <>
                        <option disabled value="">─ أصوات Google ─</option>
                        <option value="ar-XA-Standard-A">عربي - أنثى (قياسي)</option>
                        <option value="ar-XA-Standard-B">عربي - ذكر (قياسي)</option>
                        <option value="ar-XA-Wavenet-A">عربي - أنثى (عالي الجودة)</option>
                        <option value="ar-XA-Wavenet-B">عربي - ذكر (عالي الجودة)</option>
                      </>
                    )}
                  </select>
                </div>

                {/* API Key Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    مفتاح API
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={ttsApiKey}
                      onChange={(e) => {
                        setTtsApiKey(e.target.value)
                        setTtsApiSaved(false)
                      }}
                      placeholder={ttsProvider === 'google' ? 'AIzaSy...' : 'sk-proj-...'}
                      className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 font-mono"
                      dir="ltr"
                    />
                    <Button
                      onClick={saveTtsApiKey}
                      disabled={!ttsApiKey.trim() || ttsApiStatus === 'testing'}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 rounded-lg text-sm"
                    >
                      {ttsApiStatus === 'testing' ? '...' : 'حفظ'}
                    </Button>
                  </div>
                </div>

                {/* Status */}
                {ttsApiStatus === 'success' && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 text-green-600 text-sm bg-green-50 border border-green-200 rounded-lg px-3 py-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    تم حفظ المفتاح بنجاح! المساعدة الحين تتكلم عربي
                  </motion.div>
                )}

                {ttsApiStatus === 'error' && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2"
                  >
                    <AlertCircle className="w-4 h-4" />
                    المفتاح ما اشتغل، تأكد إنه صح
                  </motion.div>
                )}

                {ttsApiSaved && (
                  <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                    <span className="text-sm text-gray-600 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      مفتاح محفوظ ({ttsProvider === 'openai' ? 'OpenAI' : ttsProvider === 'google' ? 'Google' : 'تلقائي'})
                    </span>
                    <button
                      onClick={removeTtsApiKey}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      حذف
                    </button>
                  </div>
                )}

                {/* Steps Guide */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <h4 className="font-bold text-gray-700 text-sm mb-2">كيف تحصل على المفتاح؟</h4>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-medium text-gray-700 mb-1">OpenAI (سهل وسريع):</p>
                      <ol className="text-gray-600 text-xs space-y-1 list-decimal pr-4">
                        <li>ادخل على <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-emerald-600 underline">platform.openai.com</a></li>
                        <li>اضغط Create API Key</li>
                        <li>انسخ المفتاح وحطه فوق</li>
                      </ol>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-700 mb-1">Google Cloud (أصوات عربية أصيلة):</p>
                      <ol className="text-gray-600 text-xs space-y-1 list-decimal pr-4">
                        <li>ادخل على <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-emerald-600 underline">Google Cloud Console</a></li>
                        <li>فعّل <a href="https://console.cloud.google.com/apis/library/texttospeech.googleapis.com" target="_blank" rel="noopener noreferrer" className="text-emerald-600 underline">Text-to-Speech API</a></li>
                        <li>روح لـ Credentials → Create API Key</li>
                      </ol>
                    </div>
                  </div>
                </div>

                {/* Current Mode */}
                <div className="border-t border-gray-200 pt-4">
                  <h4 className="font-bold text-gray-700 text-sm mb-2">وضع الصوت الحالي:</h4>
                  <div className="flex items-center gap-2">
                    {ttsApiSaved ? (
                      <>
                        <span className="w-3 h-3 bg-green-400 rounded-full" />
                        <span className="text-sm text-green-700">
                          {ttsProvider === 'google' ? 'Google Cloud TTS' : 'OpenAI TTS'} (عربي بجودة عالية)
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="w-3 h-3 bg-amber-400 rounded-full" />
                        <span className="text-sm text-amber-700">متصفح الصوت (جودة تعتمد على المتصفح)</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
