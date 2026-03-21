import { useEffect, useMemo, useState } from 'react'
import { fetchStocks, searchLiveStocks, addStockToPortfolio, fetchPortfolio } from '../api/stocks.js'

export default function Stocks() {
  const [stocks, setStocks] = useState([])
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [portfolioId, setPortfolioId] = useState('')
  const [portfolios, setPortfolios] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function loadStocks() {
    setLoading(true)
    try {
      const data = await fetchStocks()
      setStocks(data || [])
    } catch {
      setStocks([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPortfolio().then(setPortfolios).catch(() => {})
    loadStocks()
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    async function run() {
      if (!query) {
        setResults([])
        return
      }
      try {
        const data = await searchLiveStocks(query, 5)
        setResults(data || [])
      } catch {
        setResults([])
      }
    }
    run()
    return () => controller.abort()
  }, [query])

  const filtered = useMemo(() => {
    return stocks
  }, [stocks])

  async function onAdd(symbol) {
    if (!portfolioId) {
      setMessage('Select portfolio')
      return
    }
    try {
      await addStockToPortfolio(portfolioId, symbol, 1, 0, new Date().toISOString().slice(0, 10))
      setMessage('Added')
      await loadStocks()
    } catch {
      setMessage('Add failed')
    }
  }

  return (
    <div className="mx-auto w-[96vw] max-w-[1600px] p-4 md:p-6">
      <div className="rounded-3xl border border-white/70 bg-gradient-to-r from-teal-50 via-cyan-50 to-slate-50 p-6 shadow-lg shadow-teal-900/10 mb-6">
        <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Market</div>
        <h1 className="text-4xl font-extrabold text-slate-900 mt-1">Stocks Explorer</h1>
        <p className="text-slate-600 mt-2">Search live symbols and add them directly into your portfolios.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-3 mb-4 rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm">
        <input
          className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-400"
          placeholder="Search stock by symbol or name"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          className="border border-slate-200 rounded-xl px-4 py-2.5 w-full focus:outline-none focus:ring-2 focus:ring-teal-400"
          value={portfolioId}
          onChange={(e) => setPortfolioId(e.target.value)}
        >
          <option value="">Select portfolio</option>
          {portfolios.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>
      {message && <div className="mb-2 text-sm text-slate-700">{message}</div>}
      {loading && <div className="mb-2 text-sm">Updating list...</div>}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        <div className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm xl:col-span-4 min-h-[520px]">
          <h2 className="font-semibold text-lg mb-3 text-slate-900">Live results</h2>
          {results.length === 0 ? (
            <div className="h-[420px] rounded-xl border border-dashed border-slate-300 bg-slate-50/80 flex items-center justify-center text-slate-500 text-sm px-6 text-center">
              Start typing in the search box to see live stock results.
            </div>
          ) : (
            <ul className="space-y-2">
            {results.map((r) => (
              <li key={r.symbol} className="border border-slate-200 rounded-xl px-3 py-2.5 flex items-center justify-between bg-slate-50/70">
                <div>
                  <div className="font-semibold text-slate-900">{r.symbol}</div>
                  <div className="text-sm text-slate-600">{r.name}</div>
                </div>
                <button
                  className="bg-gradient-to-r from-teal-700 to-cyan-700 text-white px-3 py-1.5 rounded-lg font-semibold hover:from-teal-600 hover:to-cyan-600 transition"
                  onClick={() => onAdd(r.symbol)}
                >
                  Add
                </button>
              </li>
            ))}
            </ul>
          )}
        </div>
        <div className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm xl:col-span-8">
          <h2 className="font-semibold text-lg mb-3 text-slate-900">Stored stocks</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[780px]">
            <thead>
              <tr className="bg-slate-100 text-slate-900">
                <th className="p-2">Symbol</th>
                <th className="p-2">Name</th>
                <th className="p-2">Price</th>
                <th className="p-2">52W High</th>
                <th className="p-2">52W Low</th>
                <th className="p-2 min-w-[90px]">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="p-2 font-medium">{s.symbol}</td>
                  <td className="p-2">{s.name}</td>
                  <td className="p-2 whitespace-nowrap">{s.price ?? '-'}</td>
                  <td className="p-2 whitespace-nowrap">{s['52_week_high'] ?? '-'}</td>
                  <td className="p-2 whitespace-nowrap">{s['52_week_low'] ?? '-'}</td>
                  <td className="p-2">
                    <button
                      className="bg-gradient-to-r from-teal-700 to-cyan-700 text-white px-3 py-1.5 rounded-lg font-semibold hover:from-teal-600 hover:to-cyan-600 transition whitespace-nowrap"
                      onClick={() => onAdd(s.symbol)}
                    >
                      Add
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
