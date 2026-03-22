import React, { memo } from 'react'

// live_detail response shape:
// { symbol, name, sector, industry, market_cap, pe_ratio, dividend_yield,
//   "52_week_high", "52_week_low",   ← from get_stock_profile
//   price, volume, change            ← from get_live_quote
// }
// OHLC (open/high/low/close as daily) is NOT in live_detail — we show price + 52W range.

const fmt = (n, digits = 2) =>
  n != null && !isNaN(n)
    ? Number(n).toLocaleString('en-IN', { minimumFractionDigits: digits, maximumFractionDigits: digits })
    : '—'

const pct = (n) => {
  if (n == null || isNaN(n)) return { text: null, pos: null }
  const v = Number(n)
  return { text: `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`, pos: v >= 0 }
}

function RangeBar({ low, high, current }) {
  if (low == null || high == null || high === low || current == null) return null
  const pos = Math.min(100, Math.max(0, ((current - low) / (high - low)) * 100))
  return (
    <div className="flex items-center gap-1.5 w-full">
      <span className="text-[10px] text-slate-500 font-mono w-14 text-right shrink-0">{fmt(low, 0)}</span>
      <div className="relative flex-1 h-1.5 rounded-full bg-slate-700/60">
        <div
          className="absolute h-full rounded-full bg-gradient-to-r from-cyan-600/50 to-cyan-400"
          style={{ width: `${pos}%` }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-cyan-400 border-2 border-slate-900 shadow-md shadow-cyan-500/30"
          style={{ left: `calc(${pos}% - 5px)` }}
        />
      </div>
      <span className="text-[10px] text-slate-500 font-mono w-14 shrink-0">{fmt(high, 0)}</span>
    </div>
  )
}

function StockCard({ stock, market, onAdd }) {
  const {
    symbol,
    name,
    sector,
    price,
    change,
    volume,
    pe_ratio,
  } = stock

  // Handle both possible key formats for 52-week range
  const week52High = stock['52_week_high'] ?? stock.week_52_high ?? null
  const week52Low  = stock['52_week_low']  ?? stock.week_52_low  ?? null

  const currency = market === 'IN' ? '₹' : '$'
  const chg = pct(change)

  // Try to derive a simple change% from price vs 52W midpoint if no change provided
  const displayPrice = price ?? null

  const badgeColors = {
    Technology: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    'Financial Services': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    Pharmaceuticals: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
    Energy: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    'Consumer Goods': 'text-pink-400 bg-pink-500/10 border-pink-500/20',
    Finance: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    Healthcare: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  }
  const sectorColor = badgeColors[sector] || 'text-slate-400 bg-slate-700/30 border-slate-600/20'

  return (
    <div className="group relative flex flex-col gap-2.5 p-4 rounded-xl border border-white/[0.07] bg-[#1a1d2e]
      hover:border-cyan-500/30 hover:shadow-[0_0_24px_rgba(56,189,248,0.08)] transition-all duration-300 cursor-default">

      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-cyan-400 font-mono tracking-wide">
              {symbol.replace('.NS', '')}
            </span>
            {market === 'IN' && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
                NSE
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 truncate mt-0.5 max-w-[160px]">{name || symbol}</p>
          {sector && (
            <span className={`inline-block mt-1 text-[9px] px-1.5 py-0.5 rounded border font-medium ${sectorColor}`}>
              {sector}
            </span>
          )}
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="text-base font-bold text-slate-100 font-mono tracking-tight">
            {displayPrice != null ? `${currency}${fmt(displayPrice)}` : '—'}
          </span>
          {chg.text && (
            <span className={`text-xs font-semibold font-mono px-1.5 py-0.5 rounded
              ${chg.pos ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'}`}>
              {chg.text}
            </span>
          )}
          {volume != null && (
            <span className="text-[9px] text-slate-600 font-mono">
              Vol: {Number(volume).toLocaleString('en-IN')}
            </span>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-1.5">
        {[
          ['52W High',  week52High  != null ? `${currency}${fmt(week52High, 0)}` : '—'],
          ['52W Low',   week52Low   != null ? `${currency}${fmt(week52Low, 0)}`  : '—'],
          ['P/E',       pe_ratio    != null ? fmt(pe_ratio, 1)                   : '—'],
        ].map(([label, val]) => (
          <div key={label} className="flex flex-col items-center bg-slate-800/40 rounded-lg px-1.5 py-1.5">
            <span className="text-[9px] text-slate-500 font-mono mb-0.5">{label}</span>
            <span className="text-[11px] text-slate-300 font-mono font-medium">{val}</span>
          </div>
        ))}
      </div>

      {/* 52W Range bar */}
      {(week52High != null && week52Low != null) && (
        <div className="pt-0.5">
          <div className="flex justify-between text-[9px] text-slate-500 mb-1.5 font-mono">
            <span>52-Week Range</span>
            <span className="text-cyan-500/70">{displayPrice != null ? `${currency}${fmt(displayPrice)} current` : ''}</span>
          </div>
          <RangeBar low={week52Low} high={week52High} current={displayPrice} />
        </div>
      )}

      {/* Add button */}
      <button
        onClick={() => onAdd(stock)}
        className="mt-0.5 w-full py-1.5 rounded-lg text-xs font-semibold text-cyan-400 border border-cyan-500/20
          bg-cyan-500/5 hover:bg-cyan-500/15 hover:border-cyan-400/50 hover:text-cyan-300
          transition-all duration-200 opacity-0 group-hover:opacity-100 active:scale-95"
      >
        + Add to Portfolio
      </button>
    </div>
  )
}

export default memo(StockCard)
