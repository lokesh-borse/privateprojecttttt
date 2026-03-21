import { useEffect, useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function Login() {
  const { isAuthenticated, login, loading, error } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()
  const location = useLocation()
  useEffect(() => {
    if (isAuthenticated) {
      const to = location.state?.from?.pathname || '/portfolio'
      navigate(to, { replace: true })
    }
  }, [isAuthenticated, navigate, location])
  async function onSubmit(e) {
    e.preventDefault()
    const ok = await login(email, password)
    if (ok) navigate('/portfolio')
  }
  return (
    <div className="mx-auto w-[94vw] max-w-md p-4 md:p-8">
      <div className="rounded-3xl border border-white/70 bg-white/85 p-7 shadow-xl shadow-teal-900/10 backdrop-blur">
        <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Welcome Back</div>
        <h1 className="text-3xl font-bold text-slate-900 mt-1 mb-6">Sign in to your portfolio</h1>
        <form onSubmit={onSubmit} className="space-y-4">
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
          {location.state?.message && (
            <div className="text-emerald-700 text-sm bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
              ✓ {location.state.message}
            </div>
          )}
          {error && <div className="text-rose-700 text-sm">{error}</div>}
          <button
            className="w-full bg-gradient-to-r from-teal-700 to-cyan-700 text-white rounded-xl px-4 py-3 font-semibold hover:from-teal-600 hover:to-cyan-600 transition"
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Login'}
          </button>
        </form>
        <div className="mt-5 text-sm text-slate-600">
          New here? <Link to="/register" className="text-teal-700 font-semibold hover:text-teal-800">Create account</Link>
        </div>
        <div className="mt-2 text-sm text-slate-500">
          <Link to="/forgot-password" className="text-teal-600 hover:text-teal-800 hover:underline">Forgot password?</Link>
        </div>
      </div>
    </div>
  )
}
