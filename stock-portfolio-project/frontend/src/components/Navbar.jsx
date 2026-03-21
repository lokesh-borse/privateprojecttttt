import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const navItemClass = ({ isActive }) =>
    `px-3.5 py-2 rounded-xl text-sm font-medium transition ${
      isActive
        ? 'bg-white text-slate-900 shadow-sm'
        : 'text-white/90 hover:text-white hover:bg-white/10'
    }`

  return (
    <header className="sticky top-0 z-40 border-b border-teal-900/40 bg-gradient-to-r from-teal-950 via-teal-900 to-cyan-900 text-white shadow-xl shadow-teal-950/20 backdrop-blur">
      <div className="mx-auto w-[96vw] max-w-[1700px] px-3 py-3.5 flex items-center justify-between gap-4">
        <Link to="/" className="font-extrabold tracking-wide text-xl leading-tight whitespace-nowrap">
          AI Stock Portfolio
        </Link>
        {isAuthenticated ? (
          <nav className="flex items-center gap-2 md:gap-3 flex-wrap justify-end">
            <NavLink to="/portfolio" className={navItemClass}>Dashboard</NavLink>
            <NavLink to="/stocks" className={navItemClass}>Stocks</NavLink>
            <NavLink to="/time-series-forecast" className={navItemClass}>Forecast</NavLink>
            <NavLink to="/metals" className={navItemClass}>Gold-Silver</NavLink>
            <NavLink to="/nifty-clusters" className={navItemClass}>Nifty Clusters</NavLink>
            {user?.is_staff && (
              <NavLink to="/admin-panel" className={navItemClass}>
                🛡 Admin
              </NavLink>
            )}
            {!user?.mpin_set && (
              <NavLink to="/set-mpin" className="px-3.5 py-2 rounded-xl text-sm font-medium bg-amber-500/20 text-amber-200 hover:bg-amber-400/30 transition">
                🔐 Set MPIN
              </NavLink>
            )}
            <span className="hidden sm:inline text-xs text-white/70 px-2">{user?.username || ''}</span>
            <button
              className="bg-amber-400/95 text-slate-900 px-3.5 py-2 rounded-xl text-sm font-semibold hover:bg-amber-300 transition"
              onClick={handleLogout}
            >
              Logout
            </button>
          </nav>
        ) : (
          <nav className="flex items-center gap-2">
            <NavLink to="/login" className={navItemClass}>Login</NavLink>
            <NavLink to="/register" className={navItemClass}>Register</NavLink>
          </nav>
        )}
      </div>
    </header>
  )
}
