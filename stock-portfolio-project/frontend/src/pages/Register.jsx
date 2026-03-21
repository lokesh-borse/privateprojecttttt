import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function Register() {
  const { isAuthenticated, register, loading, error } = useAuth()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [telegramChatId, setTelegramChatId] = useState('')
  const [telegramHandle, setTelegramHandle] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    if (isAuthenticated) navigate('/portfolio', { replace: true })
  }, [isAuthenticated, navigate])

  async function onSubmit(e) {
    e.preventDefault()
    const ok = await register(username, email, password, telegramChatId, telegramHandle)
    if (ok) navigate('/login', { state: { message: 'Account created! Please log in.' } })
  }

  return (
    <div className="mx-auto w-[94vw] max-w-md p-4 md:p-8">
      <div className="rounded-3xl border border-white/70 bg-white/85 p-7 shadow-xl shadow-teal-900/10 backdrop-blur">
        <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Get Started</div>
        <h1 className="text-3xl font-bold text-slate-900 mt-1 mb-6">Create your account</h1>
        <form onSubmit={onSubmit} className="space-y-4">
          <input
            className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-white/90 focus:outline-none focus:ring-2 focus:ring-teal-500"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-white/90 focus:outline-none focus:ring-2 focus:ring-teal-500"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-white/90 focus:outline-none focus:ring-2 focus:ring-teal-500"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {/* Telegram Handle for communication */}
          <div>
            <input
              className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-white/90 focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Telegram Handle (e.g. @yourhandle)"
              value={telegramHandle}
              onChange={(e) => setTelegramHandle(e.target.value)}
            />
            <p className="text-xs text-slate-400 mt-1 ml-1">
              Your Telegram @username for further communication and notifications. <span className="text-teal-600 font-medium">Recommended</span>
            </p>
          </div>

          {/* Telegram Chat ID for password reset */}
          <div>
            <input
              className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-white/90 focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Telegram Chat ID (optional, for password reset OTP)"
              value={telegramChatId}
              onChange={(e) => setTelegramChatId(e.target.value)}
            />
            <p className="text-xs text-slate-400 mt-1 ml-1">
              Find your Chat ID by messaging{' '}
              <a href="https://t.me/userinfobot" target="_blank" rel="noreferrer" className="text-teal-600 underline">@userinfobot</a>{' '}on Telegram.
            </p>
          </div>

          {error && <div className="text-rose-700 text-sm">{error}</div>}
          <button
            className="w-full bg-gradient-to-r from-teal-700 to-cyan-700 text-white rounded-xl px-4 py-3 font-semibold hover:from-teal-600 hover:to-cyan-600 transition"
            disabled={loading}
          >
            {loading ? 'Creating account...' : 'Register'}
          </button>
        </form>
        <div className="mt-5 text-sm text-slate-600">
          Already have an account? <Link to="/login" className="text-teal-700 font-semibold hover:text-teal-800">Login</Link>
        </div>
      </div>
    </div>
  )
}
