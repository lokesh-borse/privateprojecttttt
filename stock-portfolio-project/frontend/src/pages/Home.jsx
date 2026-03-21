import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

// ─── Rule-based chatbot engine ────────────────────────────────────────────────
const ALLOWED_TOPICS = [
  'founder', 'market analysis', 'suggestion', 'recommendation', 'comparison',
  'prediction', 'overview', 'risk level', 'best mutual fund',
]

const CHATBOT_KB = [
  {
    keys: ['founder', 'who made', 'who created', 'who built', 'developed by'],
    answer: '🧑‍💻 **Founder**: This AI Stock Portfolio platform was built by a passionate team of developers and data scientists focused on democratising investment intelligence using machine learning and modern web technologies.',
  },
  {
    keys: ['market analysis', 'market trend', 'market overview', 'nifty', 'sensex', 'bse', 'nse'],
    answer: '📊 **Market Analysis**: I can help you analyse market trends — log in to explore the Nifty Cluster Analysis, Gold-Silver correlation, and your personalised portfolio EDA with sector breakdowns.',
  },
  {
    keys: ['suggestion', 'suggest', 'advice', 'advise', 'recommend stock', 'recommendation', 'which stock', 'buy stock'],
    answer: '💡 **Stock Recommendations**: After logging in, open any portfolio and click **"Recommend Stocks"** to get AI-powered suggestions of stocks in the same sector that are not yet in your portfolio.',
  },
  {
    keys: ['comparison', 'compare', 'vs', 'versus', 'better than'],
    answer: '⚖️ **Stock Comparison**: Log in and use the portfolio K-Means Clustering feature to see how stocks compare across return, volatility, and risk. You can also view individual stock metrics side by side.',
  },
  {
    keys: ['prediction', 'predict', 'forecast', 'future price', 'next price'],
    answer: '🔮 **Price Prediction**: We support ARIMA and RNN-based time series forecasting with 1-day and 7-day horizons. Log in → Open any portfolio → Use **Time Series Forecast**. Linear Regression forecasts are also shown inline for each stock.',
  },
  {
    keys: ['overview', 'what is', 'about', 'features', 'platform'],
    answer: '🌟 **Platform Overview**: AI Stock Portfolio is an intelligent investment platform offering:\n• Portfolio management & EDA\n• K-Means clustering of stocks by risk\n• ARIMA & RNN forecasting\n• Sentiment analysis on stock news\n• Portfolio growth analysis & star rating\n• Stock recommendations\n• Telegram-based password reset',
  },
  {
    keys: ['risk level', 'risk', 'risky', 'safe', 'volatile', 'volatility'],
    answer: '⚠️ **Risk Level**: After logging in, the portfolio clustering feature labels each stock as **High-Risk**, **Medium-Risk**, or **Low-Risk** based on 1-year return, volatility, max drawdown, and 52-week position. The Portfolio Rating gives you an overall 1–5 star score.',
  },
  {
    keys: ['mutual fund', 'mf', 'sip', 'index fund', 'etf', 'best fund'],
    answer: '📈 **Best Mutual Funds**: While this platform focuses on direct equity stocks, some well-regarded categories include:\n• **Large Cap**: Mirae Asset Large Cap, Axis Bluechip\n• **Mid Cap**: Kotak Emerging Equity, HDFC Mid-Cap\n• **Index**: UTI Nifty 50 Index, HDFC Nifty 50\n• **ELSS (Tax Saving)**: Mirae Asset Tax Saver, Axis Long Term\n\n*Always consult a SEBI-registered advisor before investing.*',
  },
]

function getBotReply(message) {
  const lower = message.toLowerCase()
  for (const entry of CHATBOT_KB) {
    if (entry.keys.some((k) => lower.includes(k))) {
      return entry.answer
    }
  }
  return `🤖 I can only answer questions about these topics:\n\n${ALLOWED_TOPICS.map((t) => `• **${t.charAt(0).toUpperCase() + t.slice(1)}**`).join('\n')}\n\n📬 For further help, reach out via Telegram to our team.`
}

// ─── Voice recognition helper ─────────────────────────────────────────────────
function useSpeechRecognition(onResult) {
  const recognitionRef = useRef(null)
  const [listening, setListening] = useState(false)
  const supported = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  function startListening() {
    if (!supported) return
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const rec = new SpeechRecognition()
    rec.lang = 'en-IN'
    rec.interimResults = false
    rec.onresult = (e) => { onResult(e.results[0][0].transcript); setListening(false) }
    rec.onerror = () => setListening(false)
    rec.onend = () => setListening(false)
    recognitionRef.current = rec
    rec.start()
    setListening(true)
  }

  return { startListening, listening, supported }
}

// ─── Chatbot Widget ────────────────────────────────────────────────────────────
function ChatbotWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'bot', text: '👋 Hi! I\'m your AI Stock Assistant. Ask me about:\n\n• Market Analysis • Predictions • Risk Levels\n• Recommendations • Best Mutual Funds • Platform Overview\n\nWhat would you like to know?' }
  ])
  const [input, setInput] = useState('')
  const bottomRef = useRef(null)

  const { startListening, listening, supported } = useSpeechRecognition((text) => {
    setInput(text)
  })

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  function sendMessage(text) {
    if (!text.trim()) return
    const userMsg = { role: 'user', text: text.trim() }
    const botReply = { role: 'bot', text: getBotReply(text.trim()) }
    setMessages((prev) => [...prev, userMsg, botReply])
    setInput('')
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {open && (
        <div className="mb-4 w-[340px] max-h-[520px] flex flex-col rounded-2xl shadow-2xl border border-teal-200 bg-white overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-teal-800 to-cyan-700 px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-xl">🤖</div>
            <div>
              <div className="font-bold text-white text-sm">AI Stock Assistant</div>
              <div className="text-xs text-teal-100">Rule-based · Fenced to finance topics</div>
            </div>
            <button onClick={() => setOpen(false)} className="ml-auto text-white/80 hover:text-white text-lg">✕</button>
          </div>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-teal-700 text-white rounded-br-none'
                    : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-sm'
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
          {/* Input */}
          <div className="border-t border-slate-200 bg-white px-3 py-2 flex items-center gap-2">
            <input
              className="flex-1 text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400"
              placeholder="Ask about stocks, risk, funds..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
            />
            {supported && (
              <button
                onClick={startListening}
                title="Voice input"
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition ${listening ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-100 text-slate-600 hover:bg-teal-100 hover:text-teal-700'}`}
              >
                🎤
              </button>
            )}
            <button
              onClick={() => sendMessage(input)}
              className="w-8 h-8 rounded-xl bg-teal-700 text-white flex items-center justify-center hover:bg-teal-800 transition"
            >
              ➤
            </button>
          </div>
        </div>
      )}
      {/* FAB */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-14 h-14 rounded-full bg-gradient-to-br from-teal-700 to-cyan-600 text-white text-2xl shadow-xl hover:scale-110 transition-transform flex items-center justify-center"
      >
        {open ? '✕' : '🤖'}
      </button>
    </div>
  )
}

// ─── Home Page ─────────────────────────────────────────────────────────────────
const FEATURES = [
  { icon: '📊', title: 'Portfolio EDA', desc: 'P/E analysis, clustering, and summary reports for your holdings.' },
  { icon: '🔮', title: 'AI Forecasting', desc: 'ARIMA & RNN time-series predictions for 1-day and 7-day horizons.' },
  { icon: '💡', title: 'Stock Recommendations', desc: "Discover stocks in your sectors that you haven't added yet." },
  { icon: '😊', title: 'Sentiment Analysis', desc: 'Real-time news sentiment for each stock — positive, neutral, or negative.' },
  { icon: '⚠️', title: 'Risk Rating', desc: 'ML-powered 1–5 star portfolio rating and cluster-based risk categorisation.' },
  { icon: '📈', title: '5-Year Performance', desc: 'Full 5-year monthly performance chart for any stock.' },
]

export default function Home() {
  const { isAuthenticated } = useAuth()
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50 to-cyan-50">
      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 pt-20 pb-16 text-center">
        <div className="inline-block mb-4 rounded-full bg-teal-100 px-4 py-1 text-sm font-semibold text-teal-800 tracking-wide">
          AI-Powered • Real-Time • Personalised
        </div>
        <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 leading-tight mb-5">
          Your Smart <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-cyan-500">Stock Portfolio</span> Platform
        </h1>
        <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-8">
          Manage, analyse, and grow your investments using machine learning, AI forecasting, and real-time market intelligence.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          {isAuthenticated ? (
            <Link to="/portfolio" className="bg-gradient-to-r from-teal-700 to-cyan-600 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-lg hover:scale-105 transition-transform">
              Go to Dashboard →
            </Link>
          ) : (
            <>
              <Link to="/register" className="bg-gradient-to-r from-teal-700 to-cyan-600 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-lg hover:scale-105 transition-transform">
                Get Started Free →
              </Link>
              <Link to="/login" className="border-2 border-teal-700 text-teal-700 px-8 py-4 rounded-2xl font-bold text-lg hover:bg-teal-50 transition">
                Sign In
              </Link>
            </>
          )}
        </div>
      </section>

      {/* Chatbot explainer */}
      <section className="mx-auto max-w-5xl px-6 pb-8">
        <div className="rounded-3xl bg-gradient-to-r from-teal-800 to-cyan-700 p-6 text-white flex flex-col md:flex-row items-center gap-6 shadow-xl">
          <div className="text-5xl">🤖</div>
          <div className="flex-1">
            <div className="font-bold text-xl mb-1">AI Stock Assistant — Available Now</div>
            <p className="text-teal-100 text-sm">
              Get instant answers on: <strong>market analysis • predictions • risk levels • recommendations • best mutual funds • platform overview</strong>. Click the chat bubble at the bottom-right ↘
            </p>
            <p className="text-teal-200 text-xs mt-2">
              🎤 Voice input supported · 📬 For deeper queries, share your Telegram handle when registering
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-6 pb-20">
        <h2 className="text-3xl font-extrabold text-slate-900 text-center mb-8">Everything You Need to Invest Smarter</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl bg-white/90 border border-white/80 p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all">
              <div className="text-3xl mb-3">{f.icon}</div>
              <div className="font-bold text-slate-900 mb-1 text-lg">{f.title}</div>
              <div className="text-slate-600 text-sm">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Chatbot widget */}
      <ChatbotWidget />
    </div>
  )
}
