import { useEffect, useMemo, useState } from 'react'
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  Tooltip,
  Legend
} from 'chart.js'
import { Scatter } from 'react-chartjs-2'
import { fetchNiftyClusters } from '../api/stocks.js'

ChartJS.register(LinearScale, PointElement, Tooltip, Legend)

const CLUSTER_COLORS = ['#2563EB', '#16A34A', '#D97706', '#9333EA', '#DC2626', '#0891B2', '#65A30D', '#1D4ED8']

function Card({ title, value, sub }) {
  return (
    <div className="rounded-xl border border-white/80 bg-white/90 p-4 shadow-sm min-h-[108px]">
      <div className="text-sm text-slate-500">{title}</div>
      <div className="text-2xl font-bold text-slate-900 mt-1 break-words">{value}</div>
      {sub ? <div className="text-xs text-slate-500 mt-1">{sub}</div> : null}
    </div>
  )
}

export default function NiftyClustersPage() {
  const [period, setPeriod] = useState('1y')
  const [interval, setInterval] = useState('1d')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState(null)

  async function load() {
    setLoading(true)
    setError('')
    try {
      const res = await fetchNiftyClusters(period, interval)
      setData(res)
    } catch (e) {
      setData(null)
      setError(e?.response?.data?.detail || 'Failed to load NIFTY clusters.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const scatterData = useMemo(() => {
    if (!data?.items?.length) return null
    const clusterMap = new Map()
    for (const item of data.items) {
      const cid = item.cluster_id
      if (!clusterMap.has(cid)) clusterMap.set(cid, { points: [], label: item.cluster_label || `Cluster ${cid}` })
      clusterMap.get(cid).points.push({ x: item.pca_x, y: item.pca_y, symbol: item.symbol })
    }
    const datasets = [...clusterMap.entries()].map(([cid, payload], idx) => ({
      label: `Cluster ${cid} - ${payload.label}`,
      data: payload.points,
      pointRadius: 5,
      borderColor: CLUSTER_COLORS[idx % CLUSTER_COLORS.length],
      backgroundColor: `${CLUSTER_COLORS[idx % CLUSTER_COLORS.length]}B3`,
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

  const sortedItems = useMemo(() => {
    const rows = data?.items || []
    return [...rows].sort((a, b) => {
      const ca = Number(a.cluster_id)
      const cb = Number(b.cluster_id)
      if (ca !== cb) return ca - cb
      return String(a.symbol).localeCompare(String(b.symbol))
    })
  }, [data])

  return (
    <div className="mx-auto w-[96vw] max-w-[1700px] p-4 md:p-6">
      <div className="rounded-3xl border border-white/70 bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 p-6 shadow-lg shadow-teal-900/10 mb-6">
        <div className="text-xs uppercase tracking-widest text-slate-500">EDA</div>
        <h1 className="text-3xl font-extrabold text-slate-900">NIFTY Clustering (K-Means)</h1>
        <p className="text-slate-600 mt-2">
          Clusters NIFTY stocks using momentum, volatility, drawdown, and volume features.
        </p>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <select className="border border-slate-200 rounded-xl px-3 py-2.5 bg-white/90" value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="1y">1y</option>
            <option value="2y">2y</option>
            <option value="5y">5y</option>
          </select>
          <select className="border border-slate-200 rounded-xl px-3 py-2.5 bg-white/90" value={interval} onChange={(e) => setInterval(e.target.value)}>
            <option value="1d">1d</option>
            <option value="1wk">1wk</option>
          </select>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl bg-teal-700 text-white hover:bg-teal-800 transition disabled:opacity-60 font-semibold"
          >
            {loading ? 'Running...' : 'Run Clustering'}
          </button>
        </div>
        {error ? <div className="mt-3 text-sm font-medium text-rose-700">{error}</div> : null}
      </div>

      {data ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
            <Card title="Universe Size" value={data.universe_size} sub="NIFTY symbols configured" />
            <Card title="Rows Used" value={data.rows_used} sub={`${data.period} / ${data.interval}`} />
            <Card title="Selected K" value={data.selected_k} sub="Fixed to 3" />
            <Card
              title="Features Used"
              value={Array.isArray(data.features_used) ? data.features_used.length : 0}
              sub={Array.isArray(data.features_used) ? data.features_used.join(', ') : ''}
            />
            <Card title="K Scores" value={data.k_scores?.length || 0} sub="silhouette candidates" />
          </div>

          <div className="rounded-2xl border border-white/80 bg-white/90 p-5 shadow-sm mb-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-3">Cluster Map (PCA Projection)</h2>
            <div className="h-[520px]">{scatterData ? <Scatter data={scatterData} options={scatterOptions} /> : null}</div>
          </div>

          <div className="rounded-2xl border border-white/80 bg-white/90 p-5 shadow-sm mb-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-3">Cluster Summary</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[980px]">
                <thead>
                  <tr className="bg-slate-50 text-slate-900">
                    <th className="p-3">Cluster</th>
                    <th className="p-3">Label</th>
                    <th className="p-3">Count</th>
                    <th className="p-3">ret_1m</th>
                    <th className="p-3">ret_3m</th>
                    <th className="p-3">ret_6m</th>
                    <th className="p-3">ret_1y</th>
                    <th className="p-3">vol_1y</th>
                    <th className="p-3">max_drawdown_1y</th>
                    <th className="p-3">avg_volume_3m</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.cluster_summary || []).map((row) => (
                    <tr key={row.cluster_id} className="border-t border-slate-100">
                      <td className="p-3 font-semibold">{row.cluster_id}</td>
                      <td className="p-3">{row.cluster_label}</td>
                      <td className="p-3">{row.count}</td>
                      <td className="p-3">{row.ret_1m}</td>
                      <td className="p-3">{row.ret_3m}</td>
                      <td className="p-3">{row.ret_6m}</td>
                      <td className="p-3">{row.ret_1y}</td>
                      <td className="p-3">{row.vol_1y}</td>
                      <td className="p-3">{row.max_drawdown_1y}</td>
                      <td className="p-3">{row.avg_volume_3m}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-white/80 bg-white/90 p-5 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900 mb-3">Stock Assignments</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[940px]">
                <thead>
                  <tr className="bg-slate-50 text-slate-900">
                    <th className="p-3">Symbol</th>
                    <th className="p-3">Cluster</th>
                    <th className="p-3">Label</th>
                    <th className="p-3">ret_1m</th>
                    <th className="p-3">ret_3m</th>
                    <th className="p-3">ret_6m</th>
                    <th className="p-3">vol_1y</th>
                    <th className="p-3">drawdown</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedItems.map((row) => (
                    <tr key={row.symbol} className="border-t border-slate-100">
                      <td className="p-3 font-semibold">{row.symbol}</td>
                      <td className="p-3">{row.cluster_id}</td>
                      <td className="p-3">{row.cluster_label}</td>
                      <td className="p-3">{row.ret_1m}</td>
                      <td className="p-3">{row.ret_3m}</td>
                      <td className="p-3">{row.ret_6m}</td>
                      <td className="p-3">{row.vol_1y}</td>
                      <td className="p-3">{row.max_drawdown_1y}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
