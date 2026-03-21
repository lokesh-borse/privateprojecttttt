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
import { Line } from 'react-chartjs-2'
import {
  fetchPortfolio,
  fetchPortfolioById,
  fetchPortfolioTimeSeriesForecast
} from '../api/stocks.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend)

function fmt(value, digits = 2) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '-'
  return n.toFixed(digits)
}

export default function TimeSeriesForecastPage() {
  const [portfolios, setPortfolios] = useState([])
  const [portfolioId, setPortfolioId] = useState('')
  const [stocks, setStocks] = useState([])
  const [symbol, setSymbol] = useState('')
  const [horizonDays, setHorizonDays] = useState(1)
  const [selectedModel, setSelectedModel] = useState('ARIMA')
  const [loadingPortfolios, setLoadingPortfolios] = useState(false)
  const [loadingStocks, setLoadingStocks] = useState(false)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  useEffect(() => {
    async function loadPortfolios() {
      setLoadingPortfolios(true)
      setError('')
      try {
        const res = await fetchPortfolio()
        setPortfolios(res || [])
        if (res?.length) {
          setPortfolioId(String(res[0].id))
        }
      } catch {
        setError('Failed to load portfolios.')
      } finally {
        setLoadingPortfolios(false)
      }
    }
    loadPortfolios()
  }, [])

  useEffect(() => {
    async function loadStocksForPortfolio() {
      if (!portfolioId) {
        setStocks([])
        setSymbol('')
        return
      }
      setLoadingStocks(true)
      setError('')
      setResult(null)
      try {
        const res = await fetchPortfolioById(portfolioId)
        const rows = res?.stocks || []
        setStocks(rows)
        setSymbol(rows[0]?.symbol || '')
      } catch {
        setError('Failed to load portfolio stocks.')
        setStocks([])
        setSymbol('')
      } finally {
        setLoadingStocks(false)
      }
    }
    loadStocksForPortfolio()
  }, [portfolioId])

  async function onRunForecast() {
    if (!portfolioId || !symbol) return
    setRunning(true)
    setError('')
    try {
      const res = await fetchPortfolioTimeSeriesForecast(portfolioId, symbol, horizonDays, selectedModel)
      setResult(res)
    } catch (e) {
      setResult(null)
      const isTimeoutOrCancel = e?.code === 'ECONNABORTED' || e?.name === 'CanceledError'
      setError(
        e?.response?.data?.detail ||
        (isTimeoutOrCancel ? 'Forecast request timed out. Please try again.' : 'Failed to run time-series forecast.')
      )
    } finally {
      setRunning(false)
    }
  }

  const chartData = useMemo(() => {
    if (!result?.history?.length || !result?.selected_forecast?.length) return null
    const history = result.history
    const forecast = result.selected_forecast
    const labels = [...history.map((p) => p.date), ...forecast.map((p) => p.date)]
    const modelName = result.model || selectedModel

    return {
      labels,
      datasets: [
        {
          label: 'Historical Close',
          data: [...history.map((p) => p.close), ...Array(forecast.length).fill(null)],
          borderColor: '#0F766E',
          backgroundColor: '#0F766E40',
          pointRadius: 1.5,
          borderWidth: 2,
          tension: 0.25,
        },
        {
          label: `${modelName} Forecast (TS-${result.selected_horizon_days})`,
          data: [...Array(history.length).fill(null), ...forecast.map((p) => p.predicted_close)],
          borderColor: '#EA580C',
          backgroundColor: '#EA580C40',
          pointRadius: 2,
          borderWidth: 2,
          borderDash: [6, 4],
          tension: 0.2,
        }
      ]
    }
  }, [result, selectedModel])

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' }
    },
    scales: {
      x: { ticks: { maxTicksLimit: 12 } },
      y: { title: { display: true, text: 'Price' } }
    }
  }

  return (
    <div className="mx-auto w-[96vw] max-w-[1700px] p-4 md:p-6">
      <div className="rounded-3xl border border-white/70 bg-gradient-to-r from-cyan-50 via-teal-50 to-emerald-50 p-6 shadow-lg shadow-teal-900/10 mb-6">
        <div className="text-xs uppercase tracking-widest text-slate-500">ML Forecasting</div>
        <h1 className="text-3xl font-extrabold text-slate-900">Time Series Forecast ({selectedModel})</h1>
        <p className="text-slate-600 mt-2">Choose a portfolio and stock to generate TS-1 or TS-7 close-price forecast.</p>

        <div className="mt-5 flex items-center justify-center md:justify-start gap-3">
          <button
            type="button"
            onClick={() => {
              setSelectedModel('ARIMA')
              setResult(null)
            }}
            disabled={running}
            className={`min-w-[96px] rounded-xl px-5 py-2.5 text-sm font-semibold transition border ${
              selectedModel === 'ARIMA'
                ? 'bg-teal-800 border-teal-800 text-white shadow-sm'
                : 'bg-white/90 border-teal-700 text-teal-800 hover:bg-teal-50'
            } disabled:opacity-60`}
          >
            ARIMA
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedModel('RNN')
              setResult(null)
            }}
            disabled={running}
            className={`min-w-[96px] rounded-xl px-5 py-2.5 text-sm font-semibold transition border ${
              selectedModel === 'RNN'
                ? 'bg-teal-800 border-teal-800 text-white shadow-sm'
                : 'bg-white/90 border-teal-700 text-teal-800 hover:bg-teal-50'
            } disabled:opacity-60`}
          >
            RNN
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-white/80 bg-white/90 p-5 shadow-sm mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <select
            className="border border-slate-200 rounded-xl px-3 py-2.5 bg-white"
            value={portfolioId}
            onChange={(e) => setPortfolioId(e.target.value)}
            disabled={loadingPortfolios || running}
          >
            {!portfolios.length && <option value="">No portfolios</option>}
            {portfolios.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <select
            className="border border-slate-200 rounded-xl px-3 py-2.5 bg-white"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            disabled={loadingStocks || running || !stocks.length}
          >
            {!stocks.length && <option value="">No stocks in portfolio</option>}
            {stocks.map((s) => (
              <option key={s.symbol} value={s.symbol}>{s.symbol} - {s.name}</option>
            ))}
          </select>

          <select
            className="border border-slate-200 rounded-xl px-3 py-2.5 bg-white"
            value={horizonDays}
            onChange={(e) => setHorizonDays(Number(e.target.value))}
            disabled={running}
          >
            <option value={1}>TS-1 (Next 1 Day)</option>
            <option value={7}>TS-7 (Next 7 Days)</option>
          </select>

          <button
            type="button"
            onClick={onRunForecast}
            disabled={!portfolioId || !symbol || running || loadingStocks}
            className="px-4 py-2.5 rounded-xl bg-teal-700 text-white hover:bg-teal-800 transition disabled:opacity-60 font-semibold"
          >
            {running ? 'Running Forecast...' : 'Run Forecast'}
          </button>
        </div>
        {error ? <div className="mt-3 text-sm font-medium text-rose-700">{error}</div> : null}
      </div>

      {result ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4 mb-6">
            <div className="rounded-xl border border-white/80 bg-white/90 p-4 shadow-sm">
              <div className="text-xs text-slate-500">Stock</div>
              <div className="text-lg font-bold text-slate-900 mt-1">{result.stock_info?.symbol}</div>
              <div className="text-xs text-slate-500">{result.stock_info?.name}</div>
            </div>
            <div className="rounded-xl border border-white/80 bg-white/90 p-4 shadow-sm">
              <div className="text-xs text-slate-500">Current Price</div>
              <div className="text-lg font-bold text-slate-900 mt-1">{fmt(result.stock_info?.current_price)}</div>
            </div>
            <div className="rounded-xl border border-white/80 bg-white/90 p-4 shadow-sm">
              <div className="text-xs text-slate-500">Latest Close</div>
              <div className="text-lg font-bold text-slate-900 mt-1">{fmt(result.stock_info?.latest_close)}</div>
            </div>
            <div className="rounded-xl border border-white/80 bg-white/90 p-4 shadow-sm">
              <div className="text-xs text-slate-500">TS-1</div>
              <div className="text-lg font-bold text-slate-900 mt-1">{fmt(result.ts_1?.predicted_close)}</div>
              <div className={`text-xs mt-1 ${Number(result.ts_1?.predicted_change_percent) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {fmt(result.ts_1?.predicted_change_percent)}%
              </div>
            </div>
            <div className="rounded-xl border border-white/80 bg-white/90 p-4 shadow-sm">
              <div className="text-xs text-slate-500">TS-7</div>
              <div className="text-lg font-bold text-slate-900 mt-1">{fmt(result.ts_7?.predicted_close)}</div>
              <div className={`text-xs mt-1 ${Number(result.ts_7?.predicted_change_percent) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {fmt(result.ts_7?.predicted_change_percent)}%
              </div>
            </div>
            <div className="rounded-xl border border-white/80 bg-white/90 p-4 shadow-sm">
              <div className="text-xs text-slate-500">P/E Ratio</div>
              <div className="text-lg font-bold text-slate-900 mt-1">{result.stock_info?.pe_ratio ?? '-'}</div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/80 bg-white/90 p-5 shadow-sm mb-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-3">Forecast Chart</h2>
            <div className="h-[460px]">
              {chartData ? <Line data={chartData} options={chartOptions} /> : null}
            </div>
          </div>

          <div className="rounded-2xl border border-white/80 bg-white/90 p-5 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900 mb-3">Selected Forecast Points ({result.model || selectedModel}, TS-{result.selected_horizon_days})</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[520px]">
                <thead>
                  <tr className="bg-slate-50 text-slate-900">
                    <th className="p-3">Date</th>
                    <th className="p-3">Predicted Close</th>
                  </tr>
                </thead>
                <tbody>
                  {(result.selected_forecast || []).map((row) => (
                    <tr key={row.date} className="border-t border-slate-100">
                      <td className="p-3">{row.date}</td>
                      <td className="p-3">{fmt(row.predicted_close, 4)}</td>
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
