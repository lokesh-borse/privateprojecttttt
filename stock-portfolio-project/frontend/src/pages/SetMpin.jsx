import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { setMpin } from '../api/stocks.js'

export default function SetMpin() {
  const { isAuthenticated, user } = useAuth()
  const navigate = useNavigate()
  const [pin, setPin] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) navigate('/login')
  }, [isAuthenticated, navigate])

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    if (!/^\d{6}$/.test(pin)) { setError('MPIN must be exactly 6 digits.'); return }
    if (pin !== confirm) { setError('PINs do not match.'); return }
    setLoading(true)
    try {
      await setMpin(pin)
      setSuccess(true)
      setTimeout(() => navigate('/portfolio'), 1500)
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to set MPIN.')
    } finally { setLoading(false) }
  }

  if (success) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-5xl mb-4">✅</div>
        <div className="text-2xl font-bold text-teal-700">MPIN Set Successfully!</div>
        <div className="text-slate-500 mt-2">Redirecting to dashboard...</div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-teal-50">
      <div className="w-full max-w-sm mx-4">
        <div className="rounded-3xl border border-white/70 bg-white/90 p-8 shadow-xl">
          <div className="text-center mb-6">
            <div className="text-4xl mb-3">🔐</div>
            <h1 className="text-2xl font-extrabold text-slate-900">Set Your MPIN</h1>
            <p className="text-sm text-slate-500 mt-2">A 6-digit security PIN required for buy/sell operations</p>
          </div>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">6-Digit MPIN</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                pattern="\d{6}"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-2xl tracking-[0.5em] text-center bg-white/90 focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="••••••"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Confirm MPIN</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                pattern="\d{6}"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-2xl tracking-[0.5em] text-center bg-white/90 focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="••••••"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value.replace(/\D/g, '').slice(0, 6))}
              />
            </div>
            {error && <div className="text-rose-600 text-sm text-center">{error}</div>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-teal-700 to-cyan-700 text-white rounded-xl px-4 py-3 font-bold hover:from-teal-600 hover:to-cyan-600 transition disabled:opacity-50"
            >
              {loading ? 'Setting MPIN...' : 'Set MPIN'}
            </button>
          </form>
          <div className="mt-4 text-xs text-slate-400 text-center">
            You can change your MPIN anytime from profile settings.
          </div>
        </div>
      </div>
    </div>
  )
}
