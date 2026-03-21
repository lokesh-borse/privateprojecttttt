import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
} from 'chart.js'
import { Scatter } from 'react-chartjs-2'
import {
  addStockToPortfolio,
  fetchHistoricalBySymbol,
  fetchLiveStockBySymbol,
  fetchPortfolioById,
  fetchPortfolioLinearRegression,
  fetchPortfolioLogisticRegression,
  fetchPortfolioClusters,
  fetchGrowthAnalysis,
  fetchPortfolioRating,
  fetchSummaryReport,
  fetchRecommendStocks,
  removeStockFromPortfolio,
  searchLiveStocks
} from '../api/stocks.js'
import MpinModal from '../components/MpinModal.jsx'

ChartJS.register(LinearScale, PointElement, Tooltip, Legend)

const CLUSTER_COLORS = ['#2563EB', '#16A34A', '#D97706', '#9333EA', '#DC2626', '#0891B2']

function PeRatioGraph({ points }) {
  if (!points.length) return <div className="text-sm text-slate-500">No P/E data yet.</div>
  const width = 1280
  const height = 560
  const padding = 56
  const values = points.map((p) => p.pe)
  const max = Math.max(...values)
  const steps = 5
  const chartHeight = height - padding * 2
  const innerWidth = width - padding * 2
  const step = innerWidth / points.length
  const barWidth = Math.max(36, step * 0.58)

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[30rem]">
      <defs>
        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#0EA5E9" />
        </linearGradient>
      </defs>
      {[...Array(steps + 1)].map((_, i) => {
        const y = padding + (chartHeight / steps) * i
        return <line key={i} x1={padding} y1={y} x2={width - padding} y2={y} stroke="#E2E8F0" strokeDasharray="4 4" />
      })}
      <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#94A3B8" strokeWidth="2" />
      <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#94A3B8" strokeWidth="2" />
      {points.map((p, i) => {
        const barHeight = max > 0 ? (p.pe / max) * chartHeight : 0
        const x = padding + i * step + (step - barWidth) / 2
        const y = height - padding - barHeight
        return (
          <g key={p.label}>
            <rect x={x} y={y} width={barWidth} height={barHeight} fill="url(#barGradient)" rx="8" />
            <text x={x + barWidth / 2} y={y - 10} textAnchor="middle" fontSize="18" fill="#1E3A8A" fontWeight="600">
              {p.pe.toFixed(2)}
            </text>
            <text x={x + barWidth / 2} y={height - 16} textAnchor="middle" fontSize="16" fill="#334155">
              {p.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function ClusterPanel({ portfolioId }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ran, setRan] = useState(false)

  async function run() {
    setLoading(true)
    setError('')
    try {
      const res = await fetchPortfolioClusters(portfolioId)
      setData(res)
      setRan(true)
    } catch (e) {
      setError(e?.response?.data?.detail || 'Clustering failed.')
    } finally {
      setLoading(false)
    }
  }

  const scatterData = useMemo(() => {
    if (!data?.items?.length) return null
    const map = new Map()
    for (const item of data.items) {
      const cid = item.cluster_id
      if (!map.has(cid)) map.set(cid, { points: [], label: item.cluster_label })
      map.get(cid).points.push({ x: item.pca_x, y: item.pca_y, symbol: item.symbol })
    }
    const datasets = [...map.entries()].map(([cid, payload], idx) => ({
      label: `Cluster ${cid} – ${payload.label}`,
      data: payload.points,
      pointRadius: 8,
      borderColor: CLUSTER_COLORS[idx % CLUSTER_COLORS.length],
      backgroundColor: `${CLUSTER_COLORS[idx % CLUSTER_COLORS.length]}99`,
    }))
    return { datasets }
  }, [data])

  const scatterOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const p = ctx.raw
            return `${ctx.dataset.label} | ${p.symbol} | (${p.x.toFixed(2)}, ${p.y.toFixed(2)})`
          }
        }
      }
    },
    scales: {
      x: { title: { display: true, text: 'PCA 1' } },
      y: { title: { display: true, text: 'PCA 2' } },
    }
  }

  return (
    <div className="rounded-2xl border border-white/80 bg-white/90 p-5 mb-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Portfolio K-Means Clustering</h2>
          <p className="text-sm text-slate-500 mt-0.5">Groups stocks by return, volatility, drawdown & 52-week position</p>
        </div>
        <button
          onClick={run}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-teal-700 text-white font-semibold hover:bg-teal-800 transition disabled:opacity-60"
        >
          {loading ? 'Running…' : ran ? 'Re-run' : 'Run Clustering'}
        </button>
      </div>

      {error && <div className="text-rose-600 text-sm mb-3">{error}</div>}

      {data && (
        <>
          {/* Summary chips */}
          <div className="flex flex-wrap gap-3 mb-4">
            {(data.summary || []).map((s, idx) => (
              <div key={s.cluster_id} className="rounded-xl border px-4 py-2 text-sm" style={{ borderColor: CLUSTER_COLORS[idx % CLUSTER_COLORS.length] }}>
                <span className="font-bold mr-1" style={{ color: CLUSTER_COLORS[idx % CLUSTER_COLORS.length] }}>
                  {s.cluster_label}
                </span>
                <span className="text-slate-600">({s.count} stocks)</span>
                <span className="text-slate-500 ml-2">Ret: {(s.avg_ret_1y * 100).toFixed(1)}% · Vol: {(s.avg_vol * 100).toFixed(1)}%</span>
              </div>
            ))}
          </div>

          {/* Scatter chart */}
          {scatterData && (
            <div className="h-[380px] mb-4">
              <Scatter data={scatterData} options={scatterOptions} />
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[700px]">
              <thead>
                <tr className="bg-slate-50 text-slate-700">
                  <th className="p-3">Symbol</th>
                  <th className="p-3">Cluster</th>
                  <th className="p-3">1Y Return</th>
                  <th className="p-3">Volatility</th>
                  <th className="p-3">Max Drawdown</th>
                  <th className="p-3">52W Position</th>
                </tr>
              </thead>
              <tbody>
                {(data.items || []).map((row, idx) => {
                  const colorIdx = data.items.slice(0, idx + 1).filter(r => r.cluster_id === row.cluster_id).length === 1
                    ? data.summary.findIndex(s => s.cluster_id === row.cluster_id)
                    : data.summary.findIndex(s => s.cluster_id === row.cluster_id)
                  return (
                    <tr key={row.symbol} className="border-t border-slate-100 hover:bg-slate-50 transition">
                      <td className="p-3 font-semibold text-slate-900">{row.symbol}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-xs font-semibold" style={{ background: `${CLUSTER_COLORS[colorIdx % CLUSTER_COLORS.length]}22`, color: CLUSTER_COLORS[colorIdx % CLUSTER_COLORS.length] }}>
                          {row.cluster_label}
                        </span>
                      </td>
                      <td className={`p-3 font-medium ${row.ret_1y >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {(row.ret_1y * 100).toFixed(2)}%
                      </td>
                      <td className="p-3 text-slate-700">{(row.vol * 100).toFixed(2)}%</td>
                      <td className="p-3 text-rose-700">{(row.max_drawdown * 100).toFixed(2)}%</td>
                      <td className="p-3 text-slate-700">{(row.pos_52w * 100).toFixed(1)}%</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

export default function PortfolioDetail() {
  const { id } = useParams()
  const [portfolio, setPortfolio] = useState(null)
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [message, setMessage] = useState('')
  const [metricsMap, setMetricsMap] = useState({})
  const [lrData, setLrData] = useState(null)
  const [lrLoading, setLrLoading] = useState(false)
  const [logData, setLogData] = useState(null)
  const [logLoading, setLogLoading] = useState(false)
  const [refreshingAll, setRefreshingAll] = useState(false)
  // New panels
  const [growthData, setGrowthData] = useState(null)
  const [growthLoading, setGrowthLoading] = useState(false)
  const [ratingData, setRatingData] = useState(null)
  const [summaryData, setSummaryData] = useState(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [recommendData, setRecommendData] = useState(null)
  const [recommendLoading, setRecommendLoading] = useState(false)
  // MPIN
  const [mpinOpen, setMpinOpen] = useState(false)
  const [pendingRemove, setPendingRemove] = useState(null)
  // toggles
  const [showPE, setShowPE] = useState(false)
  const [showClusters, setShowClusters] = useState(false)
  const [showGrowth, setShowGrowth] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const [showRecommend, setShowRecommend] = useState(false)

  async function loadPortfolio() {
    try {
      const data = await fetchPortfolioById(id)
      setPortfolio(data)
    } catch {
      setMessage('Failed to load portfolio')
    }
  }

  useEffect(() => { loadPortfolio() }, [id])

  async function loadLinearRegression() {
    setLrLoading(true)
    try {
      const data = await fetchPortfolioLinearRegression(id)
      setLrData(data)
    } catch {
      setLrData({ predictions: [], skipped: [] })
    } finally {
      setLrLoading(false)
    }
  }

  useEffect(() => { loadLinearRegression() }, [id])

  async function loadLogisticRegression() {
    setLogLoading(true)
    try {
      const data = await fetchPortfolioLogisticRegression(id)
      setLogData(data)
    } catch {
      setLogData({ predictions: [], skipped: [] })
    } finally {
      setLogLoading(false)
    }
  }

  useEffect(() => { loadLogisticRegression() }, [id])

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!query.trim()) { setSuggestions([]); return }
      try {
        const data = await searchLiveStocks(query, 8)
        setSuggestions(data || [])
      } catch { setSuggestions([]) }
    }, 250)
    return () => clearTimeout(timer)
  }, [query])

  useEffect(() => {
    async function loadHistory() {
      if (!portfolio?.stocks?.length) { setMetricsMap({}); return }
      const pairs = await Promise.all(
        portfolio.stocks.map(async (s) => {
          try {
            const [live, d] = await Promise.all([
              fetchLiveStockBySymbol(s.symbol).catch(() => null),
              fetchHistoricalBySymbol(s.symbol, '1y', '1d')
            ])
            const prices = d?.prices || []
            const livePrice = Number(live?.price)
            const lastLive = Number.isFinite(livePrice) ? livePrice : null
            if (!prices.length) return [s.symbol, { last: lastLive, min365: null, max365: null }]
            const closes = prices.map((p) => Number(p.close_price)).filter((v) => Number.isFinite(v))
            if (!closes.length) return [s.symbol, { last: lastLive, min365: null, max365: null }]
            return [s.symbol, { last: lastLive ?? closes[closes.length - 1], min365: Math.min(...closes), max365: Math.max(...closes) }]
          } catch { return [s.symbol, { last: null, min365: null, max365: null }] }
        })
      )
      setMetricsMap(Object.fromEntries(pairs))
    }
    loadHistory()
  }, [portfolio])

  function toFinite(value) {
    if (value === null || value === undefined || value === '') return null
    const n = Number(value)
    return Number.isFinite(n) ? n : null
  }

  function fmt(value, digits = 2) {
    const n = toFinite(value)
    return n === null ? '-' : n.toFixed(digits)
  }

  const pePoints = useMemo(() => {
    if (!portfolio?.stocks?.length) return []
    return portfolio.stocks
      .filter((s) => s.pe_ratio !== null && s.pe_ratio !== undefined)
      .map((s) => ({ label: s.symbol, pe: Number(s.pe_ratio) }))
  }, [portfolio])

  const lrPredictionsBySymbol = useMemo(() => {
    const rows = lrData?.predictions || []
    return Object.fromEntries(rows.map((row) => [row.symbol, row]))
  }, [lrData])

  const logisticPredictionsBySymbol = useMemo(() => {
    const rows = logData?.predictions || []
    return Object.fromEntries(rows.map((row) => [row.symbol, row]))
  }, [logData])

  const holdingsRows = useMemo(() => {
    if (!portfolio?.stocks?.length) return []
    return portfolio.stocks.map((s) => {
      const metrics = metricsMap[s.symbol] || {}
      const lr = lrPredictionsBySymbol[s.symbol]
      const log = logisticPredictionsBySymbol[s.symbol]
      const last = toFinite(metrics.last)
      const min365 = toFinite(metrics.min365)
      const max365 = toFinite(metrics.max365)
      const avg = toFinite(s.purchase_price)
      const qty = toFinite(s.quantity) ?? 0
      const discount = last !== null && max365 !== null && max365 > 0 ? ((max365 - last) / max365) * 100 : null
      const unrealizedPnl = last !== null && avg !== null ? (last - avg) * qty : null
      return {
        ...s, last, min365, max365, avg, qty, discount, unrealizedPnl,
        predictedNextClose: toFinite(lr?.predicted_next_close),
        predictedChangePercent: toFinite(lr?.predicted_change_percent),
        signal: log?.signal || null
      }
    })
  }, [portfolio, metricsMap, lrPredictionsBySymbol, logisticPredictionsBySymbol])

  async function onAdd(symbol) {
    try {
      await addStockToPortfolio(id, symbol, 1, 0, new Date().toISOString().slice(0, 10))
      setMessage(`${symbol} added`)
      setQuery('')
      setSuggestions([])
      await loadPortfolio()
      await loadLinearRegression()
      await loadLogisticRegression()
    } catch { setMessage('Add failed') }
  }

  function requestRemove(symbol) {
    setPendingRemove(symbol)
    setMpinOpen(true)
  }

  async function onRemove() {
    const symbol = pendingRemove
    setMpinOpen(false)
    setPendingRemove(null)
    try {
      await removeStockFromPortfolio(id, symbol)
      setMessage(`${symbol} removed`)
      await loadPortfolio()
      await loadLinearRegression()
      await loadLogisticRegression()
    } catch { setMessage('Remove failed') }
  }

  async function loadGrowthAnalysis() {
    setGrowthLoading(true)
    try { const d = await fetchGrowthAnalysis(id); setGrowthData(d) }
    catch (e) { setGrowthData({ error: e?.response?.data?.detail || 'Failed' }) }
    finally { setGrowthLoading(false) }
  }

  async function loadRating() {
    try { const d = await fetchPortfolioRating(id); setRatingData(d) } catch {}
  }

  async function loadSummary() {
    setSummaryLoading(true)
    try { const d = await fetchSummaryReport(id); setSummaryData(d) }
    catch (e) { setSummaryData({ error: e?.response?.data?.detail || 'Failed' }) }
    finally { setSummaryLoading(false) }
  }

  async function loadRecommend() {
    setRecommendLoading(true)
    try { const d = await fetchRecommendStocks(id); setRecommendData(d) }
    catch (e) { setRecommendData({ error: e?.response?.data?.detail || 'Failed' }) }
    finally { setRecommendLoading(false) }
  }

  useEffect(() => { loadRating() }, [id])

  async function onRefreshAll() {
    setRefreshingAll(true)
    await Promise.all([loadPortfolio(), loadLinearRegression(), loadLogisticRegression()])
    setRefreshingAll(false)
  }

  if (!portfolio) return <div className="mx-auto max-w-6xl p-6">Loading...</div>

  return (
    <div className="mx-auto w-[96vw] max-w-[1700px] p-4 md:p-6">
      <div className="mb-6 rounded-3xl border border-white/70 bg-gradient-to-r from-teal-50 via-cyan-50 to-amber-50 p-6 shadow-lg shadow-teal-900/10">
        <div className="text-xs uppercase tracking-widest text-slate-500">Portfolio</div>
        <h1 className="text-4xl font-extrabold text-slate-900">{portfolio.name}</h1>
        <div className="text-slate-600 mt-1 text-lg">{portfolio.description || 'No description'}</div>
      </div>

      {/* Stock search */}
      <div className="rounded-2xl border border-white/80 bg-white/90 backdrop-blur p-5 mb-6 shadow-sm">
        <div className="font-semibold text-slate-900 mb-3 text-lg">Find stock (yfinance)</div>
        <input
          className="w-full border border-slate-300 rounded-xl px-4 py-3 text-lg shadow-inner focus:outline-none focus:ring-2 focus:ring-teal-400"
          placeholder="Type company name like Mahindra"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <ul className="mt-3 space-y-2">
          {suggestions.map((s) => (
            <li key={s.symbol} className="border border-slate-200 rounded-xl px-4 py-3 flex items-center justify-between bg-slate-50/80">
              <div>
                <div className="font-semibold text-slate-900">{s.symbol}</div>
                <div className="text-sm text-slate-600">{s.name}</div>
              </div>
              <button className="bg-gradient-to-r from-teal-700 to-cyan-700 text-white px-4 py-2 rounded-lg font-medium shadow hover:scale-[1.02] transition" onClick={() => onAdd(s.symbol)}>
                Add stock
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Rating badge */}
      {ratingData && (
        <div className="flex items-center gap-2 mb-5 p-3 bg-white/90 rounded-2xl border border-white/80 shadow-sm w-fit">
          <span className="text-lg font-bold text-slate-700">Portfolio Rating:</span>
          <span className="text-2xl">{['⭐','⭐⭐','⭐⭐⭐','⭐⭐⭐⭐','⭐⭐⭐⭐⭐'][ratingData.stars - 1]}</span>
          <span className={`px-3 py-0.5 rounded-lg text-sm font-bold ${
            ratingData.stars >= 4 ? 'bg-emerald-100 text-emerald-700' :
            ratingData.stars >= 3 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
          }`}>{ratingData.label}</span>
        </div>
      )}

      {/* Analysis toggles */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button onClick={() => setShowPE((v) => !v)}
          className={`px-4 py-2 rounded-xl text-sm font-semibold border transition ${showPE ? 'bg-blue-700 border-blue-700 text-white shadow' : 'bg-white/90 border-blue-600 text-blue-700 hover:bg-blue-50'}`}>
          {showPE ? 'Hide' : 'Show'} P/E Ratio Chart
        </button>
        <button onClick={() => setShowClusters((v) => !v)}
          className={`px-4 py-2 rounded-xl text-sm font-semibold border transition ${showClusters ? 'bg-teal-700 border-teal-700 text-white shadow' : 'bg-white/90 border-teal-600 text-teal-700 hover:bg-teal-50'}`}>
          {showClusters ? 'Hide' : 'Show'} K-Means Clustering
        </button>
        <button onClick={() => { setShowGrowth((v) => !v); if (!growthData) loadGrowthAnalysis() }}
          className={`px-4 py-2 rounded-xl text-sm font-semibold border transition ${showGrowth ? 'bg-violet-700 border-violet-700 text-white shadow' : 'bg-white/90 border-violet-600 text-violet-700 hover:bg-violet-50'}`}>
          {showGrowth ? 'Hide' : 'Show'} 3M Growth Analysis
        </button>
        <button onClick={() => { setShowSummary((v) => !v); if (!summaryData) loadSummary() }}
          className={`px-4 py-2 rounded-xl text-sm font-semibold border transition ${showSummary ? 'bg-amber-700 border-amber-700 text-white shadow' : 'bg-white/90 border-amber-600 text-amber-700 hover:bg-amber-50'}`}>
          {showSummary ? 'Hide' : 'Show'} Summary Report
        </button>
        <button onClick={() => { setShowRecommend((v) => !v); if (!recommendData) loadRecommend() }}
          className={`px-4 py-2 rounded-xl text-sm font-semibold border transition ${showRecommend ? 'bg-emerald-700 border-emerald-700 text-white shadow' : 'bg-white/90 border-emerald-600 text-emerald-700 hover:bg-emerald-50'}`}>
          💡 {showRecommend ? 'Hide' : 'Recommend Stocks'}
        </button>
      </div>

      {/* P/E Chart (toggle) */}
      {showPE && (
        <div className="rounded-2xl border border-white/80 bg-white/90 backdrop-blur p-6 mb-6 shadow-sm">
          <div className="font-semibold text-slate-900 mb-4 text-2xl">Portfolio P/E Ratio Graph</div>
          <PeRatioGraph points={pePoints} />
        </div>
      )}

      {/* K-Means Clustering (toggle) */}
      {showClusters && <ClusterPanel portfolioId={id} />}

      {/* Growth Analysis */}
      {showGrowth && (
        <div className="rounded-2xl border border-white/80 bg-white/90 p-5 mb-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900 mb-3">📊 3-Month Growth Analysis</h2>
          {growthLoading && <div className="text-slate-500">Analysing...</div>}
          {growthData?.error && <div className="text-rose-600">{growthData.error}</div>}
          {growthData && !growthData.error && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                {[['Mean Daily Return', `${growthData.portfolio_mean_daily_return_pct}%`],
                  ['Std Deviation', `${growthData.portfolio_std_dev_pct}%`],
                  ['Sharpe Ratio (Ann.)', growthData.annualised_sharpe_ratio],
                  ['Period', growthData.period]
                ].map(([k,v]) => (
                  <div key={k} className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                    <div className="text-xs text-slate-500">{k}</div>
                    <div className="font-bold text-slate-900 text-lg">{v}</div>
                  </div>
                ))}
              </div>
              <div className="flex gap-4 mb-4 text-sm">
                <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-2">
                  🏆 Best: <strong className="text-emerald-700">{growthData.best_stock?.symbol}</strong> ({growthData.best_stock?.total_return}%)
                </div>
                <div className="rounded-xl bg-rose-50 border border-rose-100 px-4 py-2">
                  ⬇️ Worst: <strong className="text-rose-700">{growthData.worst_stock?.symbol}</strong> ({growthData.worst_stock?.total_return}%)
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="bg-slate-50 text-slate-700">
                    <th className="p-2">Symbol</th><th className="p-2">3M Return %</th><th className="p-2">Mean Daily Ret %</th><th className="p-2">Volatility %</th>
                  </tr></thead>
                  <tbody>{(growthData.stock_breakdown||[]).map(s => (
                    <tr key={s.symbol} className="border-t border-slate-100">
                      <td className="p-2 font-bold">{s.symbol}</td>
                      <td className={`p-2 font-medium ${s.total_return>=0?'text-emerald-700':'text-rose-700'}`}>{s.total_return}%</td>
                      <td className="p-2">{s.mean_daily_return}%</td>
                      <td className="p-2">{s.volatility}%</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* Summary Report */}
      {showSummary && (
        <div className="rounded-2xl border border-white/80 bg-white/90 p-5 mb-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900 mb-3">📋 Portfolio Summary Report</h2>
          {summaryLoading && <div className="text-slate-500">Generating report...</div>}
          {summaryData?.error && <div className="text-rose-600">{summaryData.error}</div>}
          {summaryData && !summaryData.error && (
            <div className="prose max-w-none text-slate-800 whitespace-pre-wrap text-sm leading-relaxed">
              {summaryData.report}
            </div>
          )}
        </div>
      )}

      {/* Recommend Stocks */}
      {showRecommend && (
        <div className="rounded-2xl border border-white/80 bg-white/90 p-5 mb-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900 mb-1">💡 Recommended Stocks</h2>
          <p className="text-sm text-slate-500 mb-4">Stocks in your sectors not yet in this portfolio.</p>
          {recommendLoading && <div className="text-slate-500">Fetching recommendations...</div>}
          {recommendData?.error && <div className="text-rose-600">{recommendData.error}</div>}
          {recommendData && !recommendData.error && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {(recommendData.recommendations||[]).map(r => (
                <div key={r.symbol} className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                  <div className="font-bold text-slate-900">{r.symbol}</div>
                  <div className="text-sm text-slate-600">{r.name}</div>
                  <div className="text-xs text-slate-400 mt-1">{r.sector} · {r.reason}</div>
                  {r.current_price && <div className="mt-2 text-teal-700 font-semibold">₹ {parseFloat(r.current_price).toFixed(2)}</div>}
                  {r.pe_ratio && <div className="text-xs text-slate-500">P/E: {r.pe_ratio}</div>}
                </div>
              ))}
              {!recommendData.recommendations?.length && <div className="text-slate-500">No recommendations found for your sectors.</div>}
            </div>
          )}
        </div>
      )}

      {/* Holdings table */}
      {message && <div className="mb-4 text-sm font-medium text-emerald-700">{message}</div>}
      <div className="rounded-2xl border border-white/80 bg-white/90 overflow-hidden shadow-sm">
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50/80">
          <button
            type="button"
            onClick={onRefreshAll}
            className="px-3 py-1.5 rounded-lg bg-teal-700 text-white hover:bg-teal-800 transition disabled:opacity-60"
            disabled={refreshingAll || lrLoading || logLoading}
          >
            {refreshingAll || lrLoading || logLoading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[1300px]">
            <thead>
              <tr className="bg-gradient-to-r from-slate-100 to-teal-100 text-slate-900">
                <th className="p-3">Symbol</th>
                <th className="p-3">Stock</th>
                <th className="p-3">Current Price</th>
                <th className="p-3">Min (365d)</th>
                <th className="p-3">Max (365d)</th>
                <th className="p-3">P/E</th>
                <th className="p-3">Discount</th>
                <th className="p-3">Predicted Next Close</th>
                <th className="p-3">Predicted Change</th>
                <th className="p-3">Signal</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {holdingsRows.map((s) => (
                <tr key={s.id} className="border-t border-slate-100 hover:bg-sky-50/60 transition">
                  <td className="p-3">
                    <Link className="text-teal-700 hover:text-teal-900 font-medium" to={`/stocks/${s.stock_id}`}>
                      {s.symbol}
                    </Link>
                  </td>
                  <td className="p-3 text-slate-900">{s.name}</td>
                  <td className="p-3">{fmt(s.last, 2)}</td>
                  <td className="p-3">{fmt(s.min365, 2)}</td>
                  <td className="p-3">{fmt(s.max365, 2)}</td>
                  <td className="p-3">{s.pe_ratio ?? '-'}</td>
                  <td className="p-3">{s.discount === null ? '-' : `${fmt(s.discount, 2)}%`}</td>
                  <td className="p-3">{fmt(s.predictedNextClose, 2)}</td>
                  <td className={`p-3 font-medium ${s.predictedChangePercent !== null && s.predictedChangePercent >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {s.predictedChangePercent === null ? '-' : `${fmt(s.predictedChangePercent, 2)}%`}
                  </td>
                  <td className="p-3">
                    {s.signal ? (
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${s.signal === 'BUY' ? 'bg-emerald-100 text-emerald-700' : s.signal === 'HOLD' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-700'}`}>
                        {s.signal}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <Link to={`/stocks/${s.stock_id}`} className="bg-teal-700 text-white px-3 py-1.5 rounded-lg hover:bg-teal-800 transition">View</Link>
                      <button className="bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 transition" onClick={() => requestRemove(s.symbol)}>Remove</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MPIN Modal for remove-stock */}
      <MpinModal
        open={mpinOpen}
        title={`Confirm Remove ${pendingRemove}`}
        onSuccess={onRemove}
        onClose={() => { setMpinOpen(false); setPendingRemove(null) }}
      />
    </div>
  )
}
