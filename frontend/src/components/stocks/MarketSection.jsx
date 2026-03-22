import React, { useState, useEffect, useCallback, useRef } from 'react'
import StockCard from './StockCard'
import { fetchLiveStockBySymbol } from '../../api/stocks'

const SECTORS_IN = [
  'All', 'Technology', 'Financial Services', 'Pharmaceuticals',
  'Energy', 'Consumer Goods', 'Automobile', 'Metals', 'Infrastructure'
]
const SECTORS_US = [
  'All', 'Technology', 'Finance', 'Healthcare', 'Energy',
  'Consumer', 'Industrials', 'Telecom', 'Retail'
]

function buildStockSkeleton() {
  return Array.from({ length: 10 }, (_, i) => ({ _id: i, _loading: true }))
}

export default function MarketSection({ title, icon, flag, symbols, market, onAdd }) {
  const [viewAll, setViewAll] = useState(false)
  const [stocks, setStocks] = useState({}) // symbol → data
  const [loadingSymbols, setLoadingSymbols] = useState(new Set())
  const [search, setSearch] = useState('')
  const [sector, setSector] = useState('All')
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 20
  const fetchedRef = useRef(new Set())

  const previewSymbols = symbols.slice(0, 10)
  const sectors = market === 'IN' ? SECTORS_IN : SECTORS_US

  const fetchBatch = useCallback(async (syms) => {
    const toFetch = syms.filter((s) => !fetchedRef.current.has(s))
    if (toFetch.length === 0) return
    toFetch.forEach((s) => fetchedRef.current.add(s))
    setLoadingSymbols((prev) => new Set([...prev, ...toFetch]))

    await Promise.allSettled(
      toFetch.map(async (symbol) => {
        try {
          const data = await fetchLiveStockBySymbol(symbol)
          setStocks((prev) => ({ ...prev, [symbol]: { symbol, ...data } }))
        } catch {
          setStocks((prev) => ({
            ...prev,
            [symbol]: { symbol, name: symbol, price: null, _error: true }
          }))
        } finally {
          setLoadingSymbols((prev) => {
            const n = new Set(prev); n.delete(symbol); return n
          })
        }
      })
    )
  }, [])

  // Fetch preview on mount
  useEffect(() => { fetchBatch(previewSymbols) }, [])

  // Fetch first page when view all activated
  useEffect(() => {
    if (viewAll) {
      const start = 0
      const batch = symbols.slice(start, PAGE_SIZE)
      fetchBatch(batch)
    }
  }, [viewAll])

  // Load more
  const loadMore = () => {
    const nextPage = page + 1
    const start = nextPage * PAGE_SIZE
    const batch = symbols.slice(start, start + PAGE_SIZE)
    if (batch.length > 0) {
      fetchBatch(batch)
      setPage(nextPage)
    }
  }

  // Filter
  const filteredSymbols = viewAll
    ? symbols.filter((sym) => {
        const s = stocks[sym]
        const matchSearch = !search || sym.toLowerCase().includes(search.toLowerCase()) ||
          (s?.name || '').toLowerCase().includes(search.toLowerCase())
        // Sector filtering is approximate — we filter by stock sector field if available
        const matchSector = sector === 'All' || (s?.sector || '').toLowerCase().includes(sector.toLowerCase())
        return matchSearch && matchSector
      })
    : previewSymbols

  const maxLoaded = (page + 1) * PAGE_SIZE
  const hasMore = viewAll && maxLoaded < symbols.length

  return (
    <section className="flex flex-col gap-4">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/20">
            <span className="text-lg">{flag}</span>
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              {icon} {title}
            </h2>
            <p className="text-xs text-slate-500">
              {viewAll
                ? `Showing ${Math.min(filteredSymbols.length, maxLoaded)} of ${filteredSymbols.length} stocks`
                : `${previewSymbols.length} featured stocks`}
            </p>
          </div>
        </div>
        <button
          onClick={() => { setViewAll((v) => !v); setSearch(''); setSector('All'); setPage(0) }}
          className="flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300
            px-3 py-1.5 rounded-lg border border-cyan-500/20 hover:border-cyan-400/40
            bg-cyan-500/5 hover:bg-cyan-500/10 transition-all duration-200"
        >
          {viewAll ? (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
              </svg>
              Show Less
            </>
          ) : (
            <>
              View All
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </>
          )}
        </button>
      </div>

      {/* Search + Filter bar (only in view all mode) */}
      {viewAll && (
        <div className="flex flex-col sm:flex-row gap-3 p-3 rounded-xl bg-slate-800/30 border border-white/5">
          {/* Search */}
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by symbol or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-slate-800/60 border border-white/10
                text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/40
                focus:ring-1 focus:ring-cyan-500/20"
            />
          </div>
          {/* Sector filter */}
          <select
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            className="h-9 px-3 rounded-lg bg-slate-800/60 border border-white/10
              text-sm text-slate-200 focus:outline-none focus:border-cyan-500/40 appearance-none cursor-pointer
              min-w-[160px]"
          >
            {sectors.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      )}

      {/* Stock grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
        {(viewAll ? filteredSymbols.slice(0, maxLoaded) : previewSymbols).map((symbol) => {
          const s = stocks[symbol]
          const isLoading = loadingSymbols.has(symbol) || !s

          if (isLoading) {
            return (
              <div key={symbol} className="rounded-xl bg-[#1a1d2e] border border-white/[0.05] p-4 flex flex-col gap-3 animate-pulse">
                <div className="flex justify-between">
                  <div className="space-y-1.5">
                    <div className="h-4 w-20 rounded bg-slate-700/70" />
                    <div className="h-3 w-28 rounded bg-slate-700/50" />
                  </div>
                  <div className="space-y-1.5 items-end flex flex-col">
                    <div className="h-5 w-16 rounded bg-slate-700/70" />
                    <div className="h-3 w-12 rounded bg-slate-700/40" />
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {[0,1,2,3].map(i => <div key={i} className="h-8 rounded bg-slate-700/40" />)}
                </div>
                <div className="h-4 w-full rounded bg-slate-700/30" />
              </div>
            )
          }

          return (
            <StockCard
              key={symbol}
              stock={s}
              market={market}
              onAdd={onAdd}
            />
          )
        })}
      </div>

      {/* Empty state */}
      {viewAll && filteredSymbols.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-slate-500">
          <svg className="w-12 h-12 mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="text-sm">No stocks match your search</p>
        </div>
      )}

      {/* Load more */}
      {hasMore && (
        <div className="flex justify-center pt-2">
          <button
            onClick={loadMore}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold text-cyan-400
              border border-cyan-500/25 bg-cyan-500/5 hover:bg-cyan-500/12 hover:border-cyan-400/40
              transition-all duration-200"
          >
            Load More ({Math.min(PAGE_SIZE, symbols.length - maxLoaded)} more)
          </button>
        </div>
      )}
    </section>
  )
}
