import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchLiveStockBySymbol, fetchHistoricalBySymbol, fetchLiveBatch, fetchStockSentiment } from '../api/stocks.js'
import LiveChartMini from '../components/LiveChartMini.jsx'
import {
  MLForecastTab, ClusterTab, GrowthTab, SummaryTab, RecommendTab,
} from '../components/portfolio/AnalyticsTabs.jsx'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// ── Inline keyframes ──────────────────────────────────────────────────────────
const STYLES = `
  @keyframes shimmer { from{background-position:-200% 0} to{background-position:200% 0} }
  @keyframes fade-up  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  @keyframes blink    { 0%,100%{opacity:1} 50%{opacity:.2} }
  @keyframes spin     { to{transform:rotate(360deg)} }
  .shimmer { background:linear-gradient(90deg,#151C26 25%,#1E2530 50%,#151C26 75%);
             background-size:200% 100%; animation:shimmer 2s linear infinite; border-radius:4px; }
  .fade-up { animation: fade-up 0.35s ease-out both; }
  .dot-live { animation: blink 1.2s ease-in-out infinite; }
  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
`

// ── Helpers ───────────────────────────────────────────────────────────────────
function toFin(v) { const n = Number(v); return Number.isFinite(n) ? n : null }
function fmtINR(v, d = 2) {
  const n = toFin(v); if (n === null) return '—'
  return n.toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d })
}

const Sk = ({ h = '14px', w = '100%', className = '' }) => (
  <span className={`block shimmer ${className}`} style={{ height: h, width: w }} />
)
const SortIco = ({ dir }) => (
  <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3 inline ml-0.5 opacity-50">
    <path d="M8 3L5 7h6L8 3Z" opacity={dir === 'asc' ? 1 : 0.3}/>
    <path d="M8 13L5 9h6L8 13Z" opacity={dir === 'desc' ? 1 : 0.3}/>
  </svg>
)

// ── Analytics Tabs config ─────────────────────────────────────────────────────
const TABS = [
  { id: 'lr',      label: 'ML Forecast',     icon: '📈' },
  { id: 'cluster', label: 'Cluster Analysis', icon: '⬡' },
  { id: 'growth',  label: 'Growth Analysis',  icon: '📊' },
  { id: 'summary', label: 'AI Summary',       icon: '✦' },
  { id: 'reco',    label: 'Recommendations',  icon: '💡' },
]

// ── Sector fetch helpers (using same shape as portfolio endpoints) ─────────────
async function fetchSectorClusters(slug) {
  const r = await fetch(`${API_BASE}/api/sector-portfolios/${slug}/analytics/clusters/`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('access')}` }
  })
  if (!r.ok) throw new Error('Cluster failed')
  return r.json()
}
async function fetchSectorGrowth(slug) {
  const r = await fetch(`${API_BASE}/api/sector-portfolios/${slug}/analytics/growth/`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('access')}` }
  })
  if (!r.ok) throw new Error('Growth failed')
  return r.json()
}
async function fetchSectorSummary(slug) {
  const r = await fetch(`${API_BASE}/api/sector-portfolios/${slug}/analytics/summary/`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('access')}` }
  })
  if (!r.ok) throw new Error('Summary failed')
  return r.json()
}
async function apiFetchSectorRecommend(slug) {
  const r = await fetch(`${API_BASE}/api/sector-portfolios/${slug}/analytics/recommend/`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('access')}` }
  })
  if (!r.ok) throw new Error('Reco failed')
  return r.json()
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function SectorPortfolioDetail() {
  const { slug } = useParams()

  const [sector,         setSector]         = useState(null)
  const [loading,        setLoading]        = useState(true)
  const [error,          setError]          = useState(null)
  const [metricsMap,     setMetricsMap]     = useState({})
  const [lrData,         setLrData]         = useState(null)
  const [lrLoading,      setLrLoading]      = useState(false)
  const [logData,        setLogData]        = useState(null)
  const [logLoading,     setLogLoading]     = useState(false)
  const [search,         setSearch]         = useState('')
  const [sortKey,        setSortKey]        = useState('symbol')
  const [sortDir,        setSortDir]        = useState('asc')
  const [expandedRow,    setExpandedRow]    = useState(null)
  const [lastRefresh,    setLastRefresh]    = useState(new Date())
  const [refreshing,     setRefreshing]     = useState(false)
  const [rowSentiment,    setRowSentiment]   = useState({})

  // ── Analytics tab state ───────────────────────────────────────────────────
  const [activeTab,        setActiveTab]        = useState(null)
  const [growthData,       setGrowthData]       = useState(null)
  const [growthLoading,    setGrowthLoading]    = useState(false)
  const [summaryData,      setSummaryData]      = useState(null)
  const [summaryLoading,   setSummaryLoading]   = useState(false)
  const [recommendData,    setRecommendData]    = useState(null)
  const [recommendLoading, setRecommendLoading] = useState(false)

  // ── Load sector ──────────────────────────────────────────────────────────
  async function loadSector() {
    setLoading(true); setError(null)
    try {
      const r = await fetch(`${API_BASE}/api/sector-portfolios/${slug}/`)
      if (!r.ok) throw new Error('Sector not found')
      setSector(await r.json())
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  // ── ML predictions ────────────────────────────────────────────────────────
  async function loadLR() {
    setLrLoading(true)
    try {
      const r = await fetch(`${API_BASE}/api/sector-portfolios/${slug}/analytics/linear-regression/`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('access')}` }
      })
      setLrData(r.ok ? await r.json() : { predictions: [] })
    } catch { setLrData({ predictions: [] }) }
    finally { setLrLoading(false) }
  }

  async function loadLog() {
    setLogLoading(true)
    try {
      const r = await fetch(`${API_BASE}/api/sector-portfolios/${slug}/analytics/logistic-regression/`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('access')}` }
      })
      setLogData(r.ok ? await r.json() : { predictions: [] })
    } catch { setLogData({ predictions: [] }) }
    finally { setLogLoading(false) }
  }

  useEffect(() => { loadSector() }, [slug])
  useEffect(() => { if (slug) { loadLR(); loadLog() } }, [slug])

  // ── Live price + OHLC ─────────────────────────────────────────────────────
  useEffect(() => {
    async function loadPrices() {
      if (!sector?.stocks?.length) return
      
      const symbols = sector.stocks.map(e => e.stock.symbol)
      
      try {
        // Fetch all live data in one batch
        const batchLiveData = await fetchLiveBatch(symbols).catch(() => ({}))
        
        // Fetch history data in parallel
        const pairs = await Promise.all(
          symbols.map(async (sym) => {
            try {
              const live = batchLiveData[sym] || null
              const [hist, allHist] = await Promise.all([
                fetchHistoricalBySymbol(sym, '5d', '1d').catch(() => ({ prices: [] })),
                fetchHistoricalBySymbol(sym, '1y', '1d').catch(() => ({ prices: [] }))
              ])
              
              const prices = hist?.prices || []
              const allCloses = (allHist?.prices || []).map(p => Number(p.close_price)).filter(v => Number.isFinite(v))
              
              const livePrice = Number(live?.price)
              const last = Number.isFinite(livePrice) ? livePrice : null
              const prev = Number(live?.prev_close) || null
              
              const latest = prices[prices.length - 1] || {}
              return [sym, {
                last,
                prev,
                open:  toFin(latest.open_price),
                high:  toFin(latest.high_price),
                low:   toFin(latest.low_price),
                close: last ?? toFin(latest.close_price),
                min365: allCloses.length ? Math.min(...allCloses) : null,
                max365: allCloses.length ? Math.max(...allCloses) : null,
              }]
            } catch {
              return [sym, { last: null, prev: null, open: null, high: null, low: null, close: null, min365: null, max365: null }]
            }
          })
        )
        setMetricsMap(Object.fromEntries(pairs))
      } catch (err) {
        console.error("Failed to load prices", err)
      } finally {
        setLastRefresh(new Date())
      }
    }
    loadPrices()
  }, [sector])

  // ── Tab toggling (lazy load) ───────────────────────────────────────────────
  function toggleTab(tab) {
    if (activeTab === tab) { setActiveTab(null); return }
    setActiveTab(tab)
    if (tab === 'growth'  && !growthData)   { setGrowthLoading(true);    fetchSectorGrowth(slug).then(setGrowthData).catch(e => setGrowthData({ error: String(e) })).finally(() => setGrowthLoading(false)) }
    if (tab === 'summary' && !summaryData)  { setSummaryLoading(true);   fetchSectorSummary(slug).then(setSummaryData).catch(e => setSummaryData({ error: String(e) })).finally(() => setSummaryLoading(false)) }
    if (tab === 'reco'    && !recommendData){ setRecommendLoading(true); apiFetchSectorRecommend(slug).then(setRecommendData).catch(e => setRecommendData({ error: String(e) })).finally(() => setRecommendLoading(false)) }
  }

  // ── Memoised lookups ──────────────────────────────────────────────────────
  const lrBySymbol  = useMemo(() => Object.fromEntries((lrData?.predictions  || []).map(r => [r.symbol, r])), [lrData])
  const logBySymbol = useMemo(() => Object.fromEntries((logData?.predictions || []).map(r => [r.symbol, r])), [logData])

  const holdingsRows = useMemo(() => {
    if (!sector?.stocks?.length) return []
    return sector.stocks.map(entry => {
      const sym  = entry.stock.symbol
      const m    = metricsMap[sym] || {}
      const lr   = lrBySymbol[sym]
      const log  = logBySymbol[sym]
      const last = toFin(m.last)
      const prev = toFin(m.prev)
      const dayPnl    = last !== null && prev !== null ? last - prev : null
      const dayPnlPct = prev && prev > 0 && last !== null ? ((last - prev) / prev) * 100 : null
      const discount  = last !== null && m.max365 > 0 ? ((m.max365 - last) / m.max365) * 100 : null
      return {
        id: entry.id, symbol: sym,
        name: entry.stock.name, sector: entry.stock.sector,
        last, prev, open: toFin(m.open), high: toFin(m.high), low: toFin(m.low), close: toFin(m.close),
        dayPnl, dayPnlPct,
        min365: toFin(m.min365), max365: toFin(m.max365), discount,
        predictedNextClose: toFin(lr?.predicted_next_close),
        predictedChangePct: toFin(lr?.predicted_change_percent),
        signal: log?.signal || null,
      }
    })
  }, [sector, metricsMap, lrBySymbol, logBySymbol])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return holdingsRows
    return holdingsRows.filter(r => r.symbol.toLowerCase().includes(q) || (r.name || '').toLowerCase().includes(q))
  }, [holdingsRows, search])

  const sortedRows = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey]
      if (av === null || av === undefined) return 1
      if (bv === null || bv === undefined) return -1
      const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv))
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortKey, sortDir])

  function handleSort(key) {
    setSortDir(prev => sortKey === key ? (prev === 'asc' ? 'desc' : 'asc') : 'asc')
    setSortKey(key)
  }

  async function onRefresh() {
    setRefreshing(true)
    await Promise.all([loadSector(), loadLR(), loadLog()])
    setRefreshing(false)
  }

  // ── Loading / Error states ────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-[#070B14] p-6">
      <style>{STYLES}</style>
      <div className="max-w-7xl mx-auto space-y-4">
        <Sk h="64px" className="rounded-xl" />
        <div className="grid grid-cols-3 gap-4">{[1,2,3].map(i => <Sk key={i} h="80px" className="rounded-xl" />)}</div>
        <Sk h="400px" className="rounded-xl" />
      </div>
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-[#070B14] flex items-center justify-center">
      <style>{STYLES}</style>
      <div className="text-center">
        <div className="text-4xl mb-3">⚠️</div>
        <div className="text-neutral-300">{error}</div>
        <Link to="/portfolio" className="mt-4 inline-block text-sm text-sky-400 hover:underline">← Back</Link>
      </div>
    </div>
  )

  const isIndian = sector.market === 'IN'

  return (
    <>
      <style>{STYLES}</style>
      <div className="min-h-screen bg-[#070B14] pb-24">
        <div className="max-w-[1700px] mx-auto px-4 md:px-6 py-5 space-y-5">

          {/* BREADCRUMB */}
          <div className="fade-up flex items-center gap-2 text-xs text-neutral-500">
            <Link to="/portfolio" className="hover:text-sky-400 transition-colors">Portfolio</Link>
            <span>›</span>
            <span className="text-sky-400">Sector Market</span>
            <span>›</span>
            <span className="text-neutral-300">{sector.name}</span>
          </div>

          {/* HEADER */}
          <div className="fade-up rounded-xl border border-surface-700 bg-surface-900 p-5"
            style={{ boxShadow: '0 1px 0 rgba(255,255,255,0.03) inset' }}>
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className="flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center text-3xl"
                  style={{ background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.2)' }}>
                  {sector.icon || '📊'}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-2xs uppercase tracking-widest font-medium" style={{ color: '#0EA5E9', fontSize: 10 }}>Sector Portfolio</span>
                    <span className="text-neutral-700">·</span>
                    <span className="text-2xs font-semibold px-2 py-0.5 rounded border"
                      style={isIndian
                        ? { color: '#22C55E', background: 'rgba(34,197,94,0.08)', borderColor: 'rgba(34,197,94,0.25)' }
                        : { color: '#A78BFA', background: 'rgba(167,139,250,0.08)', borderColor: 'rgba(167,139,250,0.25)' }}>
                      {isIndian ? '🇮🇳 Indian' : '🌐 Global'}
                    </span>
                    <span className="text-2xs font-medium px-2 py-0.5 rounded border"
                      style={{ color: '#F59E0B', background: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.2)', fontSize: 9 }}>
                      Pre-built
                    </span>
                  </div>
                  <h1 className="text-2xl font-bold text-neutral-100 truncate">{sector.name}</h1>
                  {sector.description && <p className="text-xs text-neutral-500 mt-1 truncate max-w-lg">{sector.description}</p>}
                </div>
              </div>
              <div className="flex-shrink-0 text-right">
                <div className="text-2xs uppercase tracking-widest text-neutral-500 mb-1">Total Stocks</div>
                <div className="text-3xl font-bold font-mono text-neutral-100">{sector.stock_count}</div>
                <div className="text-2xs text-neutral-600 mt-2 font-mono">
                  ⌚ {lastRefresh.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} IST
                </div>
              </div>
            </div>
          </div>

          {/* STATS ROW */}
          <div className="fade-up grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { label: 'Total Stocks', value: sector.stock_count, color: 'brand' },
              { label: 'Market',       value: isIndian ? 'NSE / BSE' : 'NYSE / NASDAQ', color: 'gain' },
              { label: 'Sector',       value: sector.name, color: 'brand' },
            ].map(card => {
              const borderTop = { gain: '#22C55E', brand: '#0EA5E9' }[card.color]
              const textColor = { gain: '#22C55E', brand: '#e2e8f0' }[card.color]
              return (
                <div key={card.label} className="bg-surface-900 border border-surface-700 rounded-xl p-4 border-t-2"
                  style={{ borderTopColor: borderTop }}>
                  <div className="text-2xs uppercase tracking-widest text-neutral-500 mb-1">{card.label}</div>
                  <div className="text-lg font-bold font-mono truncate" style={{ color: textColor }}>{card.value}</div>
                </div>
              )
            })}
          </div>

          {/* HOLDINGS TABLE */}
          <div className="fade-up bg-surface-900 border border-surface-700 rounded-xl overflow-hidden">

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 py-3 border-b border-surface-700 bg-surface-950/40 gap-3">
              <div className="flex items-center gap-2">
                <span className="inline-block w-0.5 h-4 bg-brand-500 rounded-full" />
                <span className="text-sm font-semibold text-neutral-200">Holdings</span>
                <span className="text-xs text-neutral-600 ml-1">({holdingsRows.length} stocks)</span>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-gain-500 dot-live ml-1" />
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-none">
                  <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: '#64748b' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input type="text" placeholder="Search symbol or name…" value={search} onChange={e => setSearch(e.target.value)}
                    className="w-full sm:w-52 h-8 pl-8 pr-3 rounded-lg text-xs focus:outline-none"
                    style={{ background: '#151C26', border: '1px solid #1E2530', color: '#e2e8f0' }}
                    onFocus={e => e.currentTarget.style.borderColor = '#0EA5E9'}
                    onBlur={e  => e.currentTarget.style.borderColor = '#1E2530'}
                  />
                </div>
                <button onClick={onRefresh} disabled={refreshing}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-surface-700 text-neutral-400 hover:text-neutral-200 hover:border-neutral-600 transition-colors disabled:opacity-50">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`}>
                    <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                  </svg>
                  {refreshing ? 'Refreshing…' : 'Refresh'}
                </button>
              </div>
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-xs min-w-[1200px]">
                <thead>
                  <tr className="border-b border-surface-700 bg-surface-950/60">
                    {[
                      { key: 'symbol',             label: 'Symbol',       align: 'left'   },
                      { key: 'name',               label: 'Company',      align: 'left'   },
                      { key: 'open',               label: 'Open',         align: 'right'  },
                      { key: 'high',               label: 'High',         align: 'right'  },
                      { key: 'low',                label: 'Low',          align: 'right'  },
                      { key: 'last',               label: 'Close / LTP',  align: 'right'  },
                      { key: 'dayPnlPct',          label: 'Day %',        align: 'right'  },
                      { key: 'predictedNextClose', label: 'LR Next Day',  align: 'right'  },
                      { key: 'signal',             label: 'Signal',       align: 'center' },
                      { key: null,                 label: 'Actions',      align: 'center' },
                    ].map((col, i) => (
                      <th key={i}
                        onClick={col.key ? () => handleSort(col.key) : undefined}
                        className={`px-3 py-2.5 text-2xs uppercase tracking-widest text-neutral-500 whitespace-nowrap
                          ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}
                          ${col.key ? 'cursor-pointer hover:text-neutral-300 select-none' : ''}`}>
                        {col.label}
                        {col.key && <SortIco dir={sortKey === col.key ? sortDir : null} />}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedRows.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <span className="text-4xl">📭</span>
                          <div className="text-sm" style={{ color: '#64748b' }}>
                            {search ? `No stocks match "${search}"` : 'No stocks in this sector.'}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : sortedRows.map((s) => {
                    const isGain   = (s.dayPnlPct ?? 0) >= 0
                    const rowBg    = isGain ? 'rgba(34,197,94,0.02)' : 'rgba(239,68,68,0.02)'
                    const ltpColor = s.last !== null ? (isGain ? '#22C55E' : '#EF4444') : '#94a3b8'
                    const sigCfg   = {
                      BUY:  { bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.3)',  color: '#22C55E' },
                      HOLD: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', color: '#F59E0B' },
                      SELL: { bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.3)',  color: '#EF4444' },
                    }[s.signal] || null

                    return (
                      <>
                        <tr key={s.id ?? s.symbol}
                          className="border-b border-surface-700/50 transition-colors duration-100 cursor-pointer"
                          style={{ background: expandedRow === s.symbol ? 'rgba(14,165,233,0.04)' : rowBg }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(14,165,233,0.04)'}
                          onMouseLeave={e => e.currentTarget.style.background = expandedRow === s.symbol ? 'rgba(14,165,233,0.04)' : rowBg}
                          onClick={() => {
                            const next = expandedRow === s.symbol ? null : s.symbol
                            setExpandedRow(next)
                            if (next && !rowSentiment[next]) {
                              fetchStockSentiment(next).then(data => {
                                setRowSentiment(prev => ({ ...prev, [next]: data }))
                              }).catch(() => {})
                            }
                          }}>

                          {/* Symbol */}
                          <td className="px-3 py-2.5 font-semibold text-left sticky left-0 bg-surface-900 z-[5]">
                            <Link to={`/stocks/live/${s.symbol}`} onClick={e => e.stopPropagation()}
                              className="text-brand-400 hover:text-brand-300 transition-colors font-mono">
                              {s.symbol.replace('.NS','').replace('.BO','')}
                            </Link>
                          </td>
                          <td className="px-3 py-2.5 text-neutral-400 truncate max-w-[140px]">{s.name || '—'}</td>

                          {/* OHLC */}
                          <td className="px-3 py-2.5 text-right font-mono text-neutral-400">
                            {s.open !== null ? `₹${fmtINR(s.open)}` : <span className="shimmer inline-block w-14 h-3 rounded" />}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono text-gain-400">
                            {s.high !== null ? `₹${fmtINR(s.high)}` : <span className="shimmer inline-block w-14 h-3 rounded" />}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono text-loss-400">
                            {s.low !== null ? `₹${fmtINR(s.low)}` : <span className="shimmer inline-block w-14 h-3 rounded" />}
                          </td>

                          {/* LTP / Close */}
                          <td className="px-3 py-2.5 text-right font-mono font-medium" style={{ color: ltpColor }}>
                            <span className="inline-flex items-center justify-end gap-1">
                              {s.last !== null && <span className="inline-block w-1 h-1 rounded-full dot-live" style={{ background: ltpColor }} />}
                              {s.last !== null ? `₹${fmtINR(s.last)}` : <span className="shimmer inline-block w-16 h-3 rounded" />}
                            </span>
                          </td>

                          {/* Day % */}
                          <td className="px-3 py-2.5 text-right">
                            {s.dayPnlPct !== null ? (
                              <span className={`text-2xs font-mono font-medium px-1.5 py-0.5 rounded border
                                ${isGain ? 'text-gain-400 bg-gain-500/10 border-gain-500/25' : 'text-loss-400 bg-loss-500/10 border-loss-500/25'}`}>
                                {isGain ? '▲' : '▼'} {Math.abs(s.dayPnlPct).toFixed(2)}%
                              </span>
                            ) : '—'}
                          </td>

                          {/* LR Next Day */}
                          <td className="px-3 py-2.5 text-right font-mono">
                            {s.predictedNextClose !== null ? (
                              <span className="text-neutral-400">
                                ₹{fmtINR(s.predictedNextClose)}
                                {s.predictedChangePct !== null && (
                                  <span className={`ml-1 ${s.predictedChangePct >= 0 ? 'text-gain-500' : 'text-loss-500'}`}>
                                    ({s.predictedChangePct >= 0 ? '+' : ''}{s.predictedChangePct.toFixed(1)}%)
                                  </span>
                                )}
                              </span>
                            ) : lrLoading ? <span className="shimmer inline-block w-16 h-3 rounded" /> : '—'}
                          </td>

                          {/* Signal */}
                          <td className="px-3 py-2.5 text-center">
                            {sigCfg ? (
                              <span className="text-2xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded border"
                                style={{ color: sigCfg.color, background: sigCfg.bg, borderColor: sigCfg.border }}>
                                {s.signal}
                              </span>
                            ) : logLoading ? <span className="shimmer inline-block w-10 h-4 rounded" /> : '—'}
                          </td>

                          {/* Actions */}
                          <td className="px-3 py-2.5 text-center" onClick={e => e.stopPropagation()}>
                            <Link to={`/stocks/live/${s.symbol}`}
                              className="px-2 py-1 rounded text-2xs font-medium text-brand-400 border border-brand-500/20 bg-brand-500/5 hover:bg-brand-500/15 transition-colors">
                              View
                            </Link>
                          </td>
                        </tr>

                          {/* Expanded detail row */}
                        {expandedRow === s.symbol && (
                          <tr key={`${s.symbol}-x`} style={{ background: '#0D1117' }} className="border-b border-surface-700/50">
                            <td colSpan={10} className="p-0">
                              <div className="p-5 border-t border-surface-700/30 flex flex-col md:flex-row gap-6 animate-in fade-in zoom-in-95 duration-200">
                                
                                {/* Left side: Metric Cards */}
                                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 w-full md:w-4/12">
                                  {/* Market Cap (simulated if missing, or use DB value if available) */}
                                  <div className="rounded-xl p-3 border-t-2 bg-surface-900 border-surface-700" style={{ borderTopColor: '#0EA5E9' }}>
                                    <div className="text-2xs uppercase tracking-widest mb-1 text-neutral-500">Sector</div>
                                    <div className="text-sm font-bold font-mono text-neutral-200 truncate">{s.sector || '—'}</div>
                                  </div>
                                  
                                  <div className="rounded-xl p-3 border-t-2 bg-surface-900 border-surface-700" style={{ borderTopColor: '#8B5CF6' }}>
                                    <div className="text-2xs uppercase tracking-widest mb-1 text-neutral-500">Open</div>
                                    <div className="text-sm font-bold font-mono text-neutral-200">
                                      {s.open !== null ? `₹${fmtINR(s.open)}` : '—'}
                                    </div>
                                  </div>

                                  <div className="rounded-xl p-3 border-t-2 bg-surface-900 border-surface-700" style={{ borderTopColor: '#22C55E' }}>
                                    <div className="text-2xs uppercase tracking-widest mb-1 text-neutral-500">High</div>
                                    <div className="text-sm font-bold font-mono text-neutral-200">
                                      {s.high !== null ? `₹${fmtINR(s.high)}` : '—'}
                                    </div>
                                  </div>

                                  <div className="rounded-xl p-3 border-t-2 bg-surface-900 border-surface-700" style={{ borderTopColor: '#EF4444' }}>
                                    <div className="text-2xs uppercase tracking-widest mb-1 text-neutral-500">Low</div>
                                    <div className="text-sm font-bold font-mono text-neutral-200">
                                      {s.low !== null ? `₹${fmtINR(s.low)}` : '—'}
                                    </div>
                                  </div>

                                  <div className="rounded-xl p-3 border-t-2 bg-surface-900 border-surface-700" style={{ borderTopColor: '#F59E0B' }}>
                                    <div className="text-2xs uppercase tracking-widest mb-1 text-neutral-500">52W High</div>
                                    <div className="text-sm font-bold font-mono text-neutral-200">
                                      {s.max365 !== null ? `₹${fmtINR(s.max365)}` : '—'}
                                    </div>
                                  </div>

                                  <div className="rounded-xl p-3 border-t-2 bg-surface-900 border-surface-700" style={{ borderTopColor: '#06B6D4' }}>
                                    <div className="text-2xs uppercase tracking-widest mb-1 text-neutral-500">52W Low</div>
                                    <div className="text-sm font-bold font-mono text-neutral-200">
                                      {s.min365 !== null ? `₹${fmtINR(s.min365)}` : '—'}
                                    </div>
                                  </div>
                                </div>

                                {/* Center: Chart */}
                                <div className="w-full md:w-5/12 flex flex-col min-h-[160px] relative">
                                  <div className="absolute top-0 right-0 z-10">
                                    <Link to={`/stocks/live/${s.symbol}`} className="bg-brand-500 hover:bg-brand-400 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors shadow-lg flex items-center gap-1.5">
                                      <span>Full Analysis</span>
                                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                    </Link>
                                  </div>
                                  <div className="text-xs uppercase tracking-widest text-neutral-500 mb-2 font-medium">1Y Price History</div>
                                  <div className="flex-1 border border-surface-700 rounded-xl bg-surface-900/50 p-1 overflow-hidden">
                                     <LiveChartMini symbol={s.symbol} />
                                  </div>
                                </div>

                                {/* Extra side: Sentiment (Simple Gauge) */}
                                <div className="w-full md:w-3/12 flex flex-col min-h-[160px]">
                                  <div className="text-xs uppercase tracking-widest text-neutral-500 mb-2 font-medium">Sentiment</div>
                                  <div className="flex-1 border border-surface-700 rounded-xl bg-surface-900/50 p-4 flex flex-col items-center justify-center text-center">
                                    {rowSentiment[s.symbol] ? (
                                      <div className="space-y-2">
                                        <div className="text-2xl font-bold" style={{ color: rowSentiment[s.symbol].sentiment === 'Positive' ? '#22C55E' : rowSentiment[s.symbol].sentiment === 'Negative' ? '#EF4444' : '#F59E0B' }}>
                                          {rowSentiment[s.symbol].score?.toFixed(1) || '0.0'}
                                        </div>
                                        <div className="text-2xs uppercase tracking-widest text-neutral-400 font-bold">{rowSentiment[s.symbol].sentiment}</div>
                                        <div className="text-2xs text-neutral-500 mt-1">{rowSentiment[s.symbol].news_count || 0} recent headlines</div>
                                      </div>
                                    ) : (
                                      <div className="space-y-2 flex flex-col items-center">
                                        <div className="w-10 h-10 border-2 border-surface-700 border-t-brand-500 rounded-full animate-spin" />
                                        <div className="text-2xs text-neutral-600">Analyzing headlines…</div>
                                      </div>
                                    )}
                                  </div>
                                </div>

                              </div>
                              {s.min365 !== null && s.max365 !== null && s.last !== null && (
                                <div className="mt-2.5 max-w-xs">
                                  <div className="flex justify-between text-2xs text-neutral-600 mb-1"><span>52W Low</span><span>52W High</span></div>
                                  <div className="h-1.5 bg-surface-700 rounded-full overflow-hidden">
                                    <div className="h-full bg-brand-500 rounded-full"
                                      style={{ width: `${Math.min(100,Math.max(0,((s.last - s.min365)/(s.max365 - s.min365))*100))}%` }} />
                                  </div>
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-surface-700">
              {sortedRows.map(s => {
                const isGain  = (s.dayPnlPct ?? 0) >= 0
                const ltpColor = s.last !== null ? (isGain ? '#22C55E' : '#EF4444') : '#94a3b8'
                return (
                  <div key={s.symbol} className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <Link to={`/stocks/live/${s.symbol}`} className="text-base font-bold font-mono text-brand-400">
                          {s.symbol.replace('.NS','').replace('.BO','')}
                        </Link>
                        <div className="text-xs text-neutral-500 truncate">{s.name}</div>
                      </div>
                      {s.last !== null && <span className="text-sm font-bold font-mono" style={{ color: ltpColor }}>₹{fmtINR(s.last)}</span>}
                    </div>
                    <div className="grid grid-cols-3 gap-1 text-2xs">
                      <div><span className="text-neutral-600">Open</span><br/><span className="font-mono text-neutral-400">{s.open !== null ? `₹${fmtINR(s.open)}` : '—'}</span></div>
                      <div><span className="text-neutral-600">High</span><br/><span className="font-mono text-gain-400">{s.high !== null ? `₹${fmtINR(s.high)}` : '—'}</span></div>
                      <div><span className="text-neutral-600">Low</span><br/><span className="font-mono text-loss-400">{s.low !== null ? `₹${fmtINR(s.low)}` : '—'}</span></div>
                    </div>
                    <div className="flex items-center gap-2">
                      {s.dayPnlPct !== null && (
                        <span className={`text-2xs font-mono font-medium px-1.5 py-0.5 rounded border
                          ${isGain ? 'text-gain-400 bg-gain-500/10 border-gain-500/25' : 'text-loss-400 bg-loss-500/10 border-loss-500/25'}`}>
                          {isGain ? '▲' : '▼'} {Math.abs(s.dayPnlPct).toFixed(2)}%
                        </span>
                      )}
                      {s.signal && (
                        <span className="text-2xs font-semibold uppercase px-2 py-0.5 rounded border"
                          style={s.signal === 'BUY'
                            ? { color: '#22C55E', background: 'rgba(34,197,94,0.12)', borderColor: 'rgba(34,197,94,0.3)' }
                            : s.signal === 'SELL'
                            ? { color: '#EF4444', background: 'rgba(239,68,68,0.12)', borderColor: 'rgba(239,68,68,0.3)' }
                            : { color: '#F59E0B', background: 'rgba(245,158,11,0.12)', borderColor: 'rgba(245,158,11,0.3)' }}>
                          {s.signal}
                        </span>
                      )}
                      <Link to={`/stocks/live/${s.symbol}`} className="ml-auto px-2.5 py-1 rounded text-2xs font-medium text-brand-400 border border-brand-500/20 bg-brand-500/5">
                        View →
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>

            {sortedRows.length > 0 && (
              <div className="px-4 py-2.5 border-t border-surface-700/50 text-xs text-neutral-600 text-center">
                Showing {sortedRows.length} of {holdingsRows.length} stocks{search && ` (filtered by "${search}")`}
              </div>
            )}
          </div>

          {/* ═══ ANALYTICS TABS ════════════════════════════════════════════════ */}
          <div className="fade-up bg-surface-900 border border-surface-700 rounded-xl overflow-hidden">
            {/* Tab bar */}
            <div className="flex overflow-x-auto border-b border-surface-700 no-scrollbar">
              {TABS.map(tab => {
                const isActive = activeTab === tab.id
                return (
                  <button key={tab.id} onClick={() => toggleTab(tab.id)}
                    className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-all duration-150 flex-shrink-0
                      ${isActive
                        ? 'border-brand-500 text-brand-400 bg-brand-500/5'
                        : 'border-transparent text-neutral-500 hover:text-neutral-300 hover:bg-surface-800'}`}>
                    <span>{tab.icon}</span>
                    {tab.label}
                  </button>
                )
              })}
            </div>

            {/* Tab content */}
            {activeTab && (
              <div className="fade-up">
                {activeTab === 'lr'      && <MLForecastTab lrData={lrData} loading={lrLoading} />}
                {activeTab === 'cluster' && <ClusterTab portfolioId={slug} fetchFn={fetchSectorClusters} />}
                {activeTab === 'growth'  && <GrowthTab growthData={growthData} loading={growthLoading} />}
                {activeTab === 'summary' && <SummaryTab summaryData={summaryData} loading={summaryLoading} />}
                {activeTab === 'reco'    && <RecommendTab recommendData={recommendData} loading={recommendLoading} />}
              </div>
            )}
            {!activeTab && (
              <div className="px-5 py-6 text-xs text-neutral-600">
                Select a tab above to view analytics for this sector portfolio.
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  )
}
