import React, { useEffect, useState } from 'react'
import MarketSection from '../components/stocks/MarketSection'
import AddToPortfolioModal from '../components/stocks/AddToPortfolioModal'
import { fetchStockUniverse } from '../api/stocks'

function TabPill({ active, onClick, icon, label, count }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300
        ${active
          ? 'bg-gradient-to-r from-cyan-500/20 to-blue-600/15 text-cyan-300 border border-cyan-500/35 shadow-[0_0_16px_rgba(56,189,248,0.12)]'
          : 'text-slate-400 hover:text-slate-200 border border-white/5 hover:border-white/10 bg-white/[0.02] hover:bg-white/[0.04]'
        }`}
    >
      <span className="text-base">{icon}</span>
      <span>{label}</span>
      <span className={`text-xs px-1.5 py-0.5 rounded-full font-mono
        ${active ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/5 text-slate-500'}`}>
        {count}
      </span>
    </button>
  )
}

export default function Stocks() {
  const [activeTab, setActiveTab] = useState('IN')
  const [modalStock, setModalStock] = useState(null)
  const [indianStocks, setIndianStocks] = useState([])
  const [globalStocks, setGlobalStocks] = useState([])
  const [loadingUniverse, setLoadingUniverse] = useState(true)
  const [universeError, setUniverseError] = useState('')

  const handleAdd = (stock) => setModalStock(stock)
  const handleCloseModal = () => setModalStock(null)

  useEffect(() => {
    let mounted = true

    async function loadUniverse() {
      setLoadingUniverse(true)
      setUniverseError('')
      try {
        const [inRes, usRes] = await Promise.all([
          fetchStockUniverse('IN'),
          fetchStockUniverse('US'),
        ])
        if (!mounted) return
        setIndianStocks(inRes?.symbols || [])
        setGlobalStocks(usRes?.symbols || [])
      } catch {
        if (!mounted) return
        setUniverseError('Unable to load stock universe from server.')
      } finally {
        if (mounted) setLoadingUniverse(false)
      }
    }

    loadUniverse()
    return () => { mounted = false }
  }, [])

  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-100">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1 h-6 rounded-full bg-gradient-to-b from-cyan-400 to-blue-600" />
              <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Market Explorer</h1>
            </div>
            <p className="text-sm text-slate-400 ml-3">
              Browse and add stocks from Indian and Global markets to your portfolio
            </p>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 self-start sm:self-auto">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-xs font-medium text-emerald-400">Universe Data</span>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-8">
          <TabPill
            active={activeTab === 'IN'}
            onClick={() => setActiveTab('IN')}
            icon="IN"
            label="Indian Markets"
            count={indianStocks.length}
          />
          <TabPill
            active={activeTab === 'US'}
            onClick={() => setActiveTab('US')}
            icon="GL"
            label="Global Markets"
            count={globalStocks.length}
          />
        </div>

        {universeError && (
          <div className="mb-4 px-4 py-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 text-sm">
            {universeError}
          </div>
        )}

        {loadingUniverse && (
          <div className="mb-6 px-4 py-3 rounded-lg border border-cyan-500/20 bg-cyan-500/5 text-cyan-300 text-sm">
            Loading stock universe...
          </div>
        )}

        <div className="h-px w-full bg-gradient-to-r from-cyan-500/20 via-white/5 to-transparent mb-8" />

        <div className="transition-all duration-300">
          {activeTab === 'IN' ? (
            <MarketSection
              key="IN"
              title="Indian Markets"
              icon="Market"
              flag="IN"
              symbols={indianStocks}
              market="IN"
              onAdd={handleAdd}
            />
          ) : (
            <MarketSection
              key="US"
              title="Global Markets"
              icon="Global"
              flag="GL"
              symbols={globalStocks}
              market="US"
              onAdd={handleAdd}
            />
          )}
        </div>

        <div className="mt-12 flex flex-wrap gap-4 justify-center">
          {[
            { icon: 'FAST', label: 'Fast loading', sub: 'stock_universe only' },
            { icon: 'LIST', label: 'Universe symbols', sub: 'market segmented' },
            { icon: 'RANGE', label: '52-week range', sub: 'if available' },
            { icon: 'PORT', label: 'Portfolio ready', sub: 'add in one click' },
          ].map((item) => (
            <div key={item.label}
              className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-slate-800/30 border border-white/5">
              <span className="text-lg">{item.icon}</span>
              <div>
                <p className="text-xs font-semibold text-slate-200">{item.label}</p>
                <p className="text-[10px] text-slate-500">{item.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {modalStock && (
        <AddToPortfolioModal
          stock={modalStock}
          market={activeTab}
          onClose={handleCloseModal}
        />
      )}
    </div>
  )
}
