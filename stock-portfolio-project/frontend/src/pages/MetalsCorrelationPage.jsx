import { useEffect, useMemo, useState } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
} from 'chart.js'
import { Line, Scatter } from 'react-chartjs-2'
import { fetchMetalsCorrelation } from '../api/stocks.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend)

function MetricCard({ label, value, sub }) {
  return (
    <div className="rounded-xl border border-white/80 bg-white/90 p-4 shadow-sm min-h-[128px]">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="text-2xl font-bold text-slate-900 mt-1 break-words leading-tight">{value}</div>
      {sub ? <div className="text-xs text-slate-500 mt-1">{sub}</div> : null}
    </div>
  )
}

export default function MetalsCorrelationPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const res = await fetchMetalsCorrelation('5y', '1d')
      setData(res)
    } catch (e) {
      setData(null)
      setError(e?.response?.data?.detail || 'Failed to load metals correlation data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const lineData = useMemo(() => {
    if (!data?.series) return null
    return {
      labels: data.series.dates,
      datasets: [
        {
          label: 'Gold Close',
          data: data.series.gold_close,
          borderColor: '#C97A14',
          backgroundColor: 'rgba(201,122,20,0.2)',
          yAxisID: 'yGold',
          pointRadius: 0,
          borderWidth: 2
        },
        {
          label: 'Silver Close',
          data: data.series.silver_close,
          borderColor: '#475569',
          backgroundColor: 'rgba(71,85,105,0.2)',
          yAxisID: 'ySilver',
          pointRadius: 0,
          borderWidth: 2
        }
      ]
    }
  }, [data])

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: { legend: { position: 'top' } },
    scales: {
      x: {
        title: { display: true, text: 'Date' },
        ticks: { maxTicksLimit: 12 }
      },
      yGold: {
        type: 'linear',
        position: 'left',
        title: { display: true, text: 'Gold Close' }
      },
      ySilver: {
        type: 'linear',
        position: 'right',
        title: { display: true, text: 'Silver Close' },
        grid: { drawOnChartArea: false }
      }
    }
  }

  const scatterData = useMemo(() => {
    if (!data?.series) return null
    const points = data.series.price_scatter_silver.map((x, i) => ({
      x,
      y: data.series.price_scatter_gold[i]
    }))
    const fit = data.series.price_scatter_silver.map((x, i) => ({
      x,
      y: data.series.price_fit_gold[i]
    }))
    return {
      datasets: [
        {
          type: 'scatter',
          label: 'Actual Prices',
          data: points,
          borderColor: '#3B82F6',
          backgroundColor: 'rgba(59,130,246,0.45)',
          pointRadius: 4
        },
        {
          type: 'line',
          label: 'Linear Fit',
          data: fit,
          borderColor: '#EF4444',
          backgroundColor: '#EF4444',
          pointRadius: 0,
          borderWidth: 2
        }
      ]
    }
  }, [data])

  const scatterOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'top' } },
    scales: {
      x: {
        type: 'linear',
        title: { display: true, text: 'Silver Price' }
      },
      y: {
        title: { display: true, text: 'Gold Price' }
      }
    }
  }

  return (
    <div className="mx-auto w-[96vw] max-w-[1700px] p-4 md:p-6">
      <div className="rounded-3xl border border-white/70 bg-gradient-to-r from-amber-50 via-orange-50 to-teal-50 p-6 shadow-lg shadow-teal-900/10 mb-6">
        <div className="text-xs uppercase tracking-widest text-slate-500">EDA</div>
        <h1 className="text-3xl font-extrabold text-slate-900">Gold-Silver Correlation</h1>
        <p className="text-slate-600 mt-2">Historical correlation and linear regression using yfinance data.</p>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="mt-4 px-4 py-2 rounded-lg bg-teal-700 text-white hover:bg-teal-800 transition disabled:opacity-60"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
        {error ? <div className="mt-3 text-sm font-medium text-rose-700">{error}</div> : null}
      </div>

      {data ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            <MetricCard label="Return Correlation" value={data.correlation_returns} sub={`${data.period} / ${data.interval}`} />
            <MetricCard label="Price Correlation" value={data.correlation_prices} sub={`Rows: ${data.rows_used}`} />
            <MetricCard
              label="Return Regression"
              value={`y = ${data.linear_regression.slope}x + ${data.linear_regression.intercept}`}
              sub={`R2: ${data.linear_regression.r2}`}
            />
            <MetricCard
              label="Price Regression"
              value={`y = ${data.price_regression.slope}x + ${data.price_regression.intercept}`}
              sub={`R2: ${data.price_regression.r2}`}
            />
          </div>

          <div className="rounded-2xl border border-white/80 bg-white/90 p-5 shadow-sm mb-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-3">Gold vs Silver Price (Recent Window)</h2>
            <div className="h-[460px] xl:h-[560px]">{lineData ? <Line data={lineData} options={lineOptions} /> : null}</div>
          </div>

          <div className="rounded-2xl border border-white/80 bg-white/90 p-5 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900 mb-3">Gold vs Silver Correlation Scatter (Price)</h2>
            <div className="h-[460px] xl:h-[560px]">{scatterData ? <Scatter data={scatterData} options={scatterOptions} /> : null}</div>
          </div>
        </>
      ) : null}
    </div>
  )
}
