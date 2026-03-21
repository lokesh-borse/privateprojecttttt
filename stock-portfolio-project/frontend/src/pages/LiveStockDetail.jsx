import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { fetchLiveStockBySymbol } from '../api/stocks.js'

export default function LiveStockDetail() {
  const { symbol } = useParams()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let timer
    async function poll() {
      try {
        const d = await fetchLiveStockBySymbol(symbol)
        setData(d)
        timer = setTimeout(poll, 5000)
      } catch {
        setError('Failed to load')
      }
    }
    poll()
    return () => clearTimeout(timer)
  }, [symbol])

  if (error) return <div className="mx-auto w-[96vw] max-w-4xl p-6">{error}</div>
  if (!data) return <div className="mx-auto w-[96vw] max-w-4xl p-6">Loading...</div>

  return (
    <div className="mx-auto w-[96vw] max-w-4xl p-6">
      <div className="rounded-3xl border border-white/70 bg-gradient-to-r from-teal-50 via-cyan-50 to-amber-50 p-6 shadow-lg shadow-teal-900/10">
        <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Live Feed</div>
        <h1 className="text-3xl font-extrabold text-slate-900 mt-1">{symbol}</h1>
      </div>
      <div className="border border-white/80 bg-white/90 rounded-2xl p-6 mt-5 shadow-sm space-y-2">
        <div><span className="font-semibold text-slate-700">Price:</span> {data.price ?? '-'}</div>
        <div><span className="font-semibold text-slate-700">Change:</span> {data.change ?? '-'}</div>
        <div><span className="font-semibold text-slate-700">Volume:</span> {data.volume ?? '-'}</div>
      </div>
    </div>
  )
}
