import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { fetchHistoricalBySymbol, fetchStockById, fetchStockSentiment, fetchStockPerformance5Y, downloadStockSummary } from '../api/stocks.js'
import './StockDetail.css'

function toNumber(v) {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function LineChart({ values }) {
  if (!values.length) return <div className="chart-empty">No price history</div>
  const width = 960; const height = 280; const pad = 30
  const min = Math.min(...values); const max = Math.max(...values); const range = max - min || 1
  const step = values.length > 1 ? (width - pad * 2) / (values.length - 1) : 0
  const points = values.map((v, i) => `${pad + i * step},${height - pad - ((v - min) / range) * (height - pad * 2)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="chart-svg">
      <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke="#cbd5e1" />
      <line x1={pad} y1={pad} x2={pad} y2={height - pad} stroke="#cbd5e1" />
      <polyline fill="none" stroke="#2962ff" strokeWidth="3" points={points} />
    </svg>
  )
}

function BarChart({ values, labels }) {
  if (!values.length) return <div className="chart-empty">No P/E trend data</div>
  const width = 960; const height = 280; const pad = 30
  const max = Math.max(...values) || 1; const innerW = width - pad * 2
  const step = innerW / values.length; const barW = Math.max(24, step * 0.55)
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="chart-svg">
      <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke="#cbd5e1" />
      <line x1={pad} y1={pad} x2={pad} y2={height - pad} stroke="#cbd5e1" />
      {values.map((v, i) => {
        const barH = (v / max) * (height - pad * 2)
        const x = pad + i * step + (step - barW) / 2
        const y = height - pad - barH
        return (
          <g key={labels[i]}>
            <rect x={x} y={y} width={barW} height={barH} rx="6" fill="#667eea" />
            <text x={x + barW / 2} y={height - 8} textAnchor="middle" fontSize="11" fill="#475569">{labels[i]}</text>
          </g>
        )
      })}
    </svg>
  )
}

const SENTIMENT_COLOR = {
  positive: 'text-emerald-700 bg-emerald-50',
  negative: 'text-rose-700 bg-rose-50',
  neutral: 'text-amber-700 bg-amber-50'
}

export default function StockDetail() {
  const { id } = useParams()
  const [stock, setStock] = useState(null)
  const [history, setHistory] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sentimentData, setSentimentData] = useState(null)
  const [sentimentLoading, setSentimentLoading] = useState(false)
  const [showSentiment, setShowSentiment] = useState(false)
  const [perf5y, setPerf5y] = useState(null)
  const [perf5yLoading, setPerf5yLoading] = useState(false)
  const [showPerf5y, setShowPerf5y] = useState(false)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    async function run() {
      try {
        const data = await fetchStockById(id)
        setStock(data)
        if (data?.symbol) {
          const h = await fetchHistoricalBySymbol(data.symbol, '1y', '1wk')
          setHistory(h?.prices || [])
        }
      } catch { setError('Failed to load') }
      finally { setLoading(false) }
    }
    run()
  }, [id])

  async function loadSentiment() {
    if (!stock?.symbol) return
    setSentimentLoading(true)
    try { const d = await fetchStockSentiment(stock.symbol); setSentimentData(d) }
    catch (e) { setSentimentData({ error: e?.response?.data?.detail || 'Failed to fetch sentiment' }) }
    finally { setSentimentLoading(false) }
  }

  async function loadPerf5y() {
    if (!stock?.symbol) return
    setPerf5yLoading(true)
    try { const d = await fetchStockPerformance5Y(stock.symbol); setPerf5y(d) }
    catch (e) { setPerf5y({ error: e?.response?.data?.detail || 'No 5Y data available' }) }
    finally { setPerf5yLoading(false) }
  }

  async function handleDownload() {
    if (!stock?.symbol) return
    setDownloading(true)
    try { await downloadStockSummary(stock.symbol) }
    catch { alert('Download failed') }
    finally { setDownloading(false) }
  }

  const currentPrice = useMemo(() => {
    if (stock?.price !== null && stock?.price !== undefined) return toNumber(stock.price)
    if (!history.length) return null
    return toNumber(history[history.length - 1]?.close_price)
  }, [stock, history])

  const peRatio = toNumber(stock?.pe_ratio)
  const marketCap = toNumber(stock?.market_cap)
  const high52 = toNumber(stock?.['52_week_high'])
  const low52 = toNumber(stock?.['52_week_low'])
  const percentFromLow = currentPrice !== null && low52 ? ((currentPrice - low52) / low52) * 100 : null
  const percentFromHigh = currentPrice !== null && high52 ? ((high52 - currentPrice) / high52) * 100 : null

  const opportunityScore = useMemo(() => {
    let score = 50
    if (percentFromHigh !== null) score += Math.min(percentFromHigh, 30)
    if (percentFromLow !== null) score -= Math.min(percentFromLow / 2, 20)
    if (peRatio !== null) {
      if (peRatio < 15) score += 15
      else if (peRatio < 25) score += 8
      else if (peRatio > 60) score -= 20
      else if (peRatio > 40) score -= 10
    }
    return Math.max(0, Math.min(100, Math.round(score)))
  }, [percentFromHigh, percentFromLow, peRatio])

  let scoreLabel = 'Neutral'
  if (opportunityScore >= 75) scoreLabel = 'High Opportunity'
  else if (opportunityScore >= 55) scoreLabel = 'Moderate Opportunity'
  else if (opportunityScore >= 40) scoreLabel = 'Watch Zone'
  else scoreLabel = 'Low Opportunity'

  const priceHistory = history.map((h) => toNumber(h.close_price)).filter((x) => x !== null)
  const peQuarters = ['Q-3', 'Q-2', 'Q-1', 'Q0']
  const peHistory = peRatio !== null
    ? [peRatio * 0.9, peRatio * 0.95, peRatio * 1.03, peRatio].map((v) => Number(v.toFixed(2)))
    : []
  const fmt = (v, d = 2) => (v === null || v === undefined || Number.isNaN(v) ? 'N/A' : Number(v).toFixed(d))

  if (loading) return <h2 className="stock-loading">Loading...</h2>
  if (error) return <h2 className="stock-loading">{error}</h2>
  if (!stock) return <h2 className="stock-loading">No Data Available</h2>

  const perf5yValues = perf5y?.prices?.map(p => p.close) || []

  return (
    <div className="stock-container">
      <div className="stock-header">
        <div>
          <h1>{stock.symbol}</h1>
          <div className="stock-name">{stock.name}</div>
        </div>
        <div className="flex items-center gap-3">
          <div className="price-box">Rs {fmt(currentPrice)}</div>
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="px-4 py-2 rounded-xl bg-teal-700 text-white text-sm font-semibold hover:bg-teal-800 transition disabled:opacity-50"
          >
            {downloading ? '⏳ Downloading...' : '⬇️ Download Summary CSV'}
          </button>
        </div>
      </div>

      {/* Feature toggles */}
      <div className="flex flex-wrap gap-3 mb-5">
        <button
          onClick={() => { setShowSentiment(v => !v); if (!sentimentData) loadSentiment() }}
          className={`px-4 py-2 rounded-xl text-sm font-semibold border transition ${showSentiment ? 'bg-violet-700 border-violet-700 text-white shadow' : 'bg-white/90 border-violet-600 text-violet-700 hover:bg-violet-50'}`}
        >
          😊 {showSentiment ? 'Hide' : 'Show'} Sentiment Analysis
        </button>
        <button
          onClick={() => { setShowPerf5y(v => !v); if (!perf5y) loadPerf5y() }}
          className={`px-4 py-2 rounded-xl text-sm font-semibold border transition ${showPerf5y ? 'bg-cyan-700 border-cyan-700 text-white shadow' : 'bg-white/90 border-cyan-600 text-cyan-700 hover:bg-cyan-50'}`}
        >
          📈 {showPerf5y ? 'Hide' : 'Show'} 5-Year Performance
        </button>
      </div>

      {/* Sentiment Panel */}
      {showSentiment && (
        <div className="card chart-card mb-5">
          <h3>News Sentiment Analysis</h3>
          {sentimentLoading && <div className="text-slate-500">Analysing news...</div>}
          {sentimentData?.error && <div className="text-rose-600">{sentimentData.error}</div>}
          {sentimentData && !sentimentData.error && (
            <>
              <div className="flex items-center gap-4 mb-4">
                <div className={`px-4 py-2 rounded-xl font-bold text-lg ${SENTIMENT_COLOR[sentimentData.overall_sentiment]}`}>
                  Overall: {sentimentData.overall_sentiment?.toUpperCase()}
                </div>
                <span className="text-sm text-emerald-700">✅ {sentimentData.positive_count} positive</span>
                <span className="text-sm text-rose-700">❌ {sentimentData.negative_count} negative</span>
                <span className="text-sm text-amber-700">➖ {sentimentData.neutral_count} neutral</span>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {(sentimentData.news || []).map((n, i) => (
                  <div key={i} className="flex items-start gap-3 p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className={`mt-0.5 px-2 py-0.5 rounded text-xs font-semibold ${SENTIMENT_COLOR[n.sentiment]}`}>{n.sentiment}</span>
                    <div className="flex-1 text-sm text-slate-800">
                      {n.url ? <a href={n.url} target="_blank" rel="noreferrer" className="hover:underline text-teal-700">{n.title}</a> : n.title}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* 5Y Performance */}
      {showPerf5y && (
        <div className="card chart-card mb-5">
          <h3>5-Year Monthly Performance</h3>
          {perf5yLoading && <div className="text-slate-500">Loading 5Y data...</div>}
          {perf5y?.error && <div className="text-rose-600">{perf5y.error}</div>}
          {perf5y && !perf5y.error && (
            <>
              <div className="mb-3 text-sm">
                <span className={`font-bold text-lg ${perf5y.total_return_pct >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {perf5y.total_return_pct >= 0 ? '▲' : '▼'} {perf5y.total_return_pct}%
                </span>
                <span className="ml-2 text-slate-500">total 5-year return</span>
              </div>
              <LineChart values={perf5yValues} />
            </>
          )}
        </div>
      )}

      <div className="card highlight-card">
        <h3>Opportunity Score</h3>
        <div className="score-big">{opportunityScore} / 100</div>
        <div className="score-bar">
          <div className="score-fill" style={{ width: `${opportunityScore}%` }}></div>
        </div>
        <p className="score-label">{scoreLabel}</p>
      </div>

      <div className="metrics-grid">
        <div className="card metric-card"><h4>PE Ratio</h4><div className="metric-value-large">{fmt(peRatio)}</div></div>
        <div className="card metric-card"><h4>Market Cap</h4><div className="metric-value-large">{marketCap ? `Rs ${(marketCap / 1e9).toFixed(2)} B` : 'N/A'}</div></div>
        <div className="card metric-card"><h4>% From 52W Low</h4><div className="metric-value-large">{percentFromLow === null ? 'N/A' : `${fmt(percentFromLow)}%`}</div></div>
        <div className="card metric-card"><h4>% From 52W High</h4><div className="metric-value-large">{percentFromHigh === null ? 'N/A' : `${fmt(percentFromHigh)}%`}</div></div>
      </div>

      <div className="card chart-card">
        <h3>1 Year Price Chart</h3>
        <LineChart values={priceHistory} />
      </div>

      {peHistory.length > 0 && (
        <div className="card chart-card">
          <h3>PE Ratio (Last 4 Quarters)</h3>
          <BarChart values={peHistory} labels={peQuarters} />
        </div>
      )}

      <div className="card chart-card">
        <h3>Company Details</h3>
        <div className="metrics-grid">
          <div className="metric-card card"><h4>Sector</h4><div className="metric-value-large">{stock.sector || 'N/A'}</div></div>
          <div className="metric-card card"><h4>Industry</h4><div className="metric-value-large">{stock.industry || 'N/A'}</div></div>
          <div className="metric-card card"><h4>Dividend Yield</h4><div className="metric-value-large">{fmt(toNumber(stock.dividend_yield))}</div></div>
          <div className="metric-card card"><h4>52W Range</h4><div className="metric-value-large">{fmt(low52)} - {fmt(high52)}</div></div>
        </div>
      </div>
    </div>
  )
}
