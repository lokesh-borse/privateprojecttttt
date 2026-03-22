import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  fetchStocks, searchLiveStocks,
  addStockToPortfolio, fetchPortfolio,
} from '../api/stocks.js'

// ── Inline keyframes ──────────────────────────────────────────────────────────
const STYLES = `
  @keyframes shimmer { from{background-position:-200% 0} to{background-position:200% 0} }
  @keyframes fade-up  { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  @keyframes slide-in { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
  @keyframes spin { to { transform: rotate(360deg); } }

  .shimmer {
    background:linear-gradient(90deg,#151C26 25%,#1E2530 50%,#151C26 75%);
    background-size:200% 100%; animation:shimmer 2s linear infinite; border-radius:4px;
  }
  .fade-up  { animation:fade-up  0.35s ease-out both; }
  .slide-in { animation:slide-in 0.2s ease-out both; }
  .spin-icon { animation:spin 0.8s linear infinite; }

  .stock-row {
    transition: background 0.15s ease;
  }
  .stock-row:hover {
    background: rgba(14,165,233,0.04) !important;
  }
  .live-result {
    transition: background 0.15s ease, border-color 0.15s ease;
  }
  .live-result:hover {
    background: rgba(14,165,233,0.06) !important;
    border-color: rgba(14,165,233,0.3) !important;
  }

  .search-bar:focus-within {
    border-color: rgba(14,165,233,0.5) !important;
    box-shadow: 0 0 0 3px rgba(14,165,233,0.08);
  }
`

// ── Helpers ───────────────────────────────────────────────────────────────────
const toFin  = v => { const n = Number(v); return Number.isFinite(n) ? n : null }
const fmtINR = (v, d = 2) => {
  const n = toFin(v); if (n === null) return '—'
  return n.toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d })
}

// Skeleton row
const Sk = ({ h = '14px', w = '100%' }) => (
  <span className="block shimmer" style={{ height: h, width: w }} />
)

function SkRow() {
  return (
    <tr style={{ borderBottom: '1px solid #1E2530' }}>
      {[45, 60, 20, 20, 20, 18].map((w, i) => (
        <td key={i} className="px-4 py-3.5">
          <Sk h="13px" w={`${w}%`} />
        </td>
      ))}
    </tr>
  )
}

// Badge chip
function Chip({ label, color, bg, border }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-2xs font-bold font-mono"
      style={{ background: bg, border: `1px solid ${border}`, color }}>
      {label}
    </span>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Stocks() {
  const navigate = useNavigate()

  const [stocks,     setStocks]     = useState([])
  const [portfolios, setPortfolios] = useState([])
  const [portId,     setPortId]     = useState('')
  const [query,      setQuery]      = useState('')
  const [liveRes,    setLiveRes]    = useState([])
  const [loading,    setLoading]    = useState(true)
  const [liveLoading,setLiveLoading]= useState(false)
  const [adding,     setAdding]     = useState(null)   // symbol being added
  const [flash,      setFlash]      = useState(null)   // { sym, ok }
  const [sortCol,    setSortCol]    = useState('symbol')
  const [sortDir,    setSortDir]    = useState('asc')
  const [filterSec,  setFilterSec]  = useState('')
  const debounceRef = useRef(null)

  // ── Load stored stocks & portfolios ─────────────────────────────────────────
  async function loadAll() {
    setLoading(true)
    try {
      const [s, p] = await Promise.all([fetchStocks(), fetchPortfolio()])
      setStocks(s || [])
      setPortfolios(p || [])
      if (p?.length) setPortId(String(p[0].id))
    } catch { setStocks([]) }
    finally { setLoading(false) }
  }
  useEffect(() => { loadAll() }, [])

  // ── Live search ─────────────────────────────────────────────────────────────
  useEffect(() => {
    clearTimeout(debounceRef.current)
    if (!query.trim()) { setLiveRes([]); return }
    debounceRef.current = setTimeout(async () => {
      setLiveLoading(true)
      try { setLiveRes(await searchLiveStocks(query.trim(), 8) || []) }
      catch { setLiveRes([]) }
      finally { setLiveLoading(false) }
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [query])

  // ── Add stock ───────────────────────────────────────────────────────────────
  async function addStock(symbol, priceHint = 0) {
    if (!portId) { showFlash(symbol, false, 'Select a portfolio first'); return }
    setAdding(symbol)
    try {
      await addStockToPortfolio(
        Number(portId), symbol, 1,
        toFin(priceHint) || 0,
        new Date().toISOString().slice(0, 10)
      )
      showFlash(symbol, true)
      await loadAll()
    } catch { showFlash(symbol, false) }
    finally { setAdding(null) }
  }

  function showFlash(sym, ok, msg) {
    setFlash({ sym, ok, msg })
    setTimeout(() => setFlash(null), 3000)
  }

  // ── Sorting / filtering ─────────────────────────────────────────────────────
  const sectors = useMemo(() => {
    const s = new Set(stocks.map(s => s.sector).filter(Boolean))
    return [...s].sort()
  }, [stocks])

  function toggleSort(col) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  const displayed = useMemo(() => {
    let arr = stocks
    if (filterSec) arr = arr.filter(s => s.sector === filterSec)
    return [...arr].sort((a, b) => {
      const fA = toFin(a[sortCol]) ?? String(a[sortCol] || '')
      const fB = toFin(b[sortCol]) ?? String(b[sortCol] || '')
      const cmp = typeof fA === 'number' && typeof fB === 'number'
        ? fA - fB
        : String(fA).localeCompare(String(fB))
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [stocks, filterSec, sortCol, sortDir])

  // ── Column def ──────────────────────────────────────────────────────────────
  const cols = [
    { key: 'symbol',       label: 'Symbol',   mono: true  },
    { key: 'name',         label: 'Name',     mono: false },
    { key: 'price',        label: 'Price',    mono: true  },
    { key: '52_week_high', label: '52W High', mono: true  },
    { key: '52_week_low',  label: '52W Low',  mono: true  },
    { key: 'action',       label: '',         mono: false, noSort: true },
  ]

  function SortIcon({ col }) {
    if (sortCol !== col) return <span style={{ color: '#334155' }}>⇅</span>
    return <span style={{ color: '#0EA5E9' }}>{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{STYLES}</style>
      <div className="min-h-screen pb-20" style={{ background: '#070B14' }}>
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 pt-6 space-y-5">

          {/* ════ PAGE HEADER ═════════════════════════════════════════════════ */}
          <div className="fade-up">
            <div className="text-2xs uppercase tracking-widest mb-1" style={{ color: '#0EA5E9', fontSize: 10 }}>Market</div>
            <h1 className="text-2xl md:text-3xl font-extrabold" style={{ color: '#e2e8f0', letterSpacing: '-0.01em' }}>
              Stocks Explorer
            </h1>
            <p className="text-sm mt-1" style={{ color: '#64748b' }}>
              Search live NSE/BSE symbols and add them to your portfolios.
            </p>
          </div>

          {/* ════ CONTROLS BAR ════════════════════════════════════════════════ */}
          <div className="flex flex-col md:flex-row gap-3 fade-up">

            {/* Live search */}
            <div className="relative flex-1 search-bar rounded-xl border transition-all"
                 style={{ border: '1px solid #1E2530', background: '#0D1117' }}>
              <div className="flex items-center gap-2 px-3.5 py-2.5">
                <svg viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" className="w-4 h-4 flex-shrink-0">
                  <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                </svg>
                <input
                  className="flex-1 text-sm bg-transparent focus:outline-none"
                  style={{ color: '#e2e8f0' }}
                  placeholder="Search symbol or company name…"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                />
                {liveLoading && (
                  <svg className="spin-icon w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="#64748b" strokeWidth="4"/>
                    <path className="opacity-75" fill="#0EA5E9" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                  </svg>
                )}
                {query && (
                  <button onClick={() => { setQuery(''); setLiveRes([]) }}
                    className="flex-shrink-0 text-neutral-600 hover:text-neutral-400 transition-colors">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                      <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                  </button>
                )}
              </div>

              {/* Live results dropdown */}
              {query && liveRes.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-50 slide-in"
                     style={{ background: '#0D1117', border: '1px solid #1E2530', boxShadow: '0 16px 48px rgba(0,0,0,0.6)' }}>
                  <div className="px-4 py-2 border-b text-2xs uppercase tracking-widest"
                       style={{ borderColor: '#1E2530', color: '#475569' }}>
                    Live search results
                  </div>
                  {liveRes.map(r => (
                    <div key={r.symbol}
                         className="live-result flex items-center justify-between px-4 py-3 border-b cursor-pointer"
                         style={{ borderColor: '#1E2530' }}
                         onClick={() => { setQuery(''); setLiveRes([]) }}>
                      <div>
                        <div className="font-bold font-mono text-sm" style={{ color: '#38BDF8' }}>{r.symbol}</div>
                        <div className="text-xs mt-0.5" style={{ color: '#64748b' }}>{r.name || '—'}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {r.price && (
                          <span className="font-mono text-sm font-medium" style={{ color: '#e2e8f0' }}>
                            ₹{fmtINR(r.price)}
                          </span>
                        )}
                        <button
                          disabled={adding === r.symbol}
                          onClick={e => { e.stopPropagation(); addStock(r.symbol, r.price) }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all active:scale-95 disabled:opacity-50"
                          style={{ background: 'linear-gradient(135deg,#0369a1,#0EA5E9)' }}>
                          {adding === r.symbol ? '…' : '+ Add'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {query && !liveLoading && liveRes.length === 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 rounded-xl slide-in"
                     style={{ background: '#0D1117', border: '1px solid #1E2530', boxShadow: '0 16px 48px rgba(0,0,0,0.6)' }}>
                  <div className="px-4 py-4 text-sm text-center" style={{ color: '#475569' }}>
                    No results for "<span style={{ color: '#94a3b8' }}>{query}</span>"
                  </div>
                </div>
              )}
            </div>

            {/* Portfolio selector */}
            <div className="relative" style={{ minWidth: 220 }}>
              <select
                value={portId}
                onChange={e => setPortId(e.target.value)}
                className="w-full appearance-none px-4 py-2.5 rounded-xl text-sm font-medium focus:outline-none transition-colors pr-9"
                style={{ background: '#0D1117', border: '1px solid #1E2530', color: '#94a3b8' }}
                onFocus={e => e.currentTarget.style.borderColor = '#0EA5E9'}
                onBlur={e  => e.currentTarget.style.borderColor = '#1E2530'}
              >
                {portfolios.length === 0
                  ? <option value="">No portfolios — create one first</option>
                  : portfolios.map(p => <option key={p.id} value={p.id}>{p.name}</option>)
                }
              </select>
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                <svg viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" className="w-4 h-4">
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </div>
            </div>

            {/* Sector filter */}
            <div className="relative" style={{ minWidth: 180 }}>
              <select
                value={filterSec}
                onChange={e => setFilterSec(e.target.value)}
                className="w-full appearance-none px-4 py-2.5 rounded-xl text-sm font-medium focus:outline-none transition-colors pr-9"
                style={{ background: '#0D1117', border: '1px solid #1E2530', color: '#94a3b8' }}
                onFocus={e => e.currentTarget.style.borderColor = '#0EA5E9'}
                onBlur={e  => e.currentTarget.style.borderColor = '#1E2530'}
              >
                <option value="">All Sectors</option>
                {sectors.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                <svg viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" className="w-4 h-4">
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </div>
            </div>
          </div>

          {/* Flash notification */}
          {flash && (
            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium slide-in"
                 style={{
                   background: flash.ok ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                   border: `1px solid ${flash.ok ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                   color: flash.ok ? '#4ade80' : '#f87171',
                 }}>
              {flash.ok ? '✓' : '⚠'}&nbsp;
              {flash.msg || (flash.ok ? `${flash.sym} added to portfolio` : `Failed to add ${flash.sym}`)}
            </div>
          )}

          {/* ════ STOCKS TABLE ════════════════════════════════════════════════ */}
          <div className="fade-up rounded-2xl overflow-hidden"
               style={{ border: '1px solid #1E2530', background: '#0D1117' }}>

            {/* Table toolbar */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b"
                 style={{ borderColor: '#1E2530', background: '#080C12' }}>
              <div className="flex items-center gap-2">
                <span className="inline-block w-0.5 h-4 rounded-full" style={{ background: '#0EA5E9' }} />
                <span className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>Stored Stocks</span>
                <span className="text-2xs px-2 py-0.5 rounded-full font-mono"
                      style={{ background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.2)', color: '#38BDF8' }}>
                  {displayed.length} / {stocks.length}
                </span>
              </div>
              <button onClick={loadAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors"
                style={{ border: '1px solid #1E2530', color: '#64748b' }}
                onMouseEnter={e => e.currentTarget.style.color = '#94a3b8'}
                onMouseLeave={e => e.currentTarget.style.color = '#64748b'}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
                  <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" strokeLinecap="round"/>
                </svg>
                Refresh
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left" style={{ minWidth: 780 }}>
                <thead>
                  <tr style={{ background: '#080C12', borderBottom: '1px solid #1E2530' }}>
                    {cols.map(c => (
                      <th key={c.key}
                          onClick={() => !c.noSort && toggleSort(c.key)}
                          className={`px-4 py-3 text-2xs font-semibold uppercase tracking-widest select-none ${!c.noSort ? 'cursor-pointer hover:text-neutral-300' : ''}`}
                          style={{ color: sortCol === c.key ? '#0EA5E9' : '#475569', fontSize: 10 }}>
                        {c.label} {!c.noSort && <SortIcon col={c.key} />}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading
                    ? Array.from({ length: 8 }).map((_, i) => <SkRow key={i} />)
                    : displayed.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-16 text-center">
                          <div style={{ color: '#475569' }}>
                            <div className="text-3xl mb-3">📊</div>
                            <div className="text-sm font-medium mb-1" style={{ color: '#64748b' }}>
                              {filterSec ? `No stocks in sector "${filterSec}"` : 'No stocks yet'}
                            </div>
                            <div className="text-xs" style={{ color: '#334155' }}>
                              Use the search bar above to find and add stocks.
                            </div>
                          </div>
                        </td>
                      </tr>
                    )
                    : displayed.map((s, rowIdx) => {
                      const price = toFin(s.price)
                      const h52   = toFin(s['52_week_high'])
                      const l52   = toFin(s['52_week_low'])
                      const pct52 = h52 && l52 && price
                        ? ((price - l52) / (h52 - l52)) * 100 : null

                      return (
                        <tr key={s.id}
                            className="stock-row cursor-pointer"
                            style={{ borderBottom: '1px solid #1E2530', background: rowIdx % 2 === 0 ? '#0D1117' : '#080C12' }}
                            onClick={() => navigate(`/stocks/${s.id}`)}>

                          {/* Symbol */}
                          <td className="px-4 py-3.5">
                            <div className="font-bold font-mono text-sm" style={{ color: '#38BDF8' }}>{s.symbol?.replace(/\.(NS|BO)$/, '')}</div>
                            {s.sector && (
                              <div className="text-2xs mt-0.5" style={{ color: '#475569', fontSize: 10 }}>{s.sector}</div>
                            )}
                          </td>

                          {/* Name */}
                          <td className="px-4 py-3.5 max-w-[200px]">
                            <div className="text-sm truncate" style={{ color: '#94a3b8' }}>{s.name || '—'}</div>
                          </td>

                          {/* Price */}
                          <td className="px-4 py-3.5">
                            <div className="font-mono text-sm font-semibold" style={{ color: '#e2e8f0' }}>
                              {price !== null ? `₹${fmtINR(price)}` : '—'}
                            </div>
                            {pct52 !== null && (
                              <div className="w-16 h-1 rounded-full mt-1.5 overflow-hidden" style={{ background: '#1E2530' }}>
                                <div className="h-full rounded-full"
                                     style={{ width: `${Math.min(100, Math.max(0, pct52))}%`, background: '#0EA5E9' }} />
                              </div>
                            )}
                          </td>

                          {/* 52W High */}
                          <td className="px-4 py-3.5">
                            <span className="font-mono text-sm" style={{ color: h52 !== null ? '#22C55E' : '#334155' }}>
                              {h52 !== null ? `₹${fmtINR(h52)}` : '—'}
                            </span>
                          </td>

                          {/* 52W Low */}
                          <td className="px-4 py-3.5">
                            <span className="font-mono text-sm" style={{ color: l52 !== null ? '#EF4444' : '#334155' }}>
                              {l52 !== null ? `₹${fmtINR(l52)}` : '—'}
                            </span>
                          </td>

                          {/* Action */}
                          <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center gap-2">
                              <button
                                disabled={adding === s.symbol}
                                onClick={() => addStock(s.symbol, s.price)}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all active:scale-95 disabled:opacity-50"
                                style={{ background: 'linear-gradient(135deg,#0369a1,#0EA5E9)' }}
                                title="Add to selected portfolio">
                                {adding === s.symbol ? '…' : (
                                  <>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3">
                                      <path d="M12 5v14M5 12h14"/>
                                    </svg>
                                    Add
                                  </>
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  }
                </tbody>
              </table>
            </div>

            {/* Table footer */}
            {!loading && displayed.length > 0 && (
              <div className="flex items-center justify-between px-5 py-2.5 border-t"
                   style={{ borderColor: '#1E2530', background: '#080C12' }}>
                <span className="text-2xs" style={{ color: '#334155' }}>
                  Showing {displayed.length} stock{displayed.length !== 1 ? 's' : ''}
                  {filterSec ? ` in "${filterSec}"` : ''}
                </span>
                <span className="text-2xs" style={{ color: '#334155' }}>
                  Click any row to view full stock details
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
