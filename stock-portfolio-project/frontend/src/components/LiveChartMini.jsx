import { useEffect, useMemo, useState } from 'react'
import {
  Chart as ChartJS,
  LineElement, PointElement, LinearScale, CategoryScale,
  Filler, Tooltip
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { fetchHistoricalBySymbol } from '../api/stocks.js'

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip)

export default function LiveChartMini({ symbol }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!symbol) return
    setLoading(true)
    fetchHistoricalBySymbol(symbol, '1y', '1d')
      .then(d => setHistory(d?.prices || []))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false))
  }, [symbol])

  const chartData = useMemo(() => {
    const values = history.map(h => Number(h.close_price)).filter(v => Number.isFinite(v))
    const labels = history.map(h => h.date)
    
    const isGain = values.length > 1 ? values[values.length - 1] >= values[0] : true
    const color = isGain ? '#22C55E' : '#EF4444'
    const glow = isGain ? 'rgba(34,197,94,' : 'rgba(239,68,68,'

    return {
      labels,
      datasets: [{
        label: 'Price',
        data: values,
        borderColor: color,
        borderWidth: 1.5,
        pointRadius: 0,
        fill: true,
        backgroundColor: (ctx) => {
          const { chart } = ctx
          if (!chart.chartArea) return 'transparent'
          const { ctx: canvasCtx, chartArea } = chart
          const gradient = canvasCtx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
          gradient.addColorStop(0, `${glow}0.15)`)
          gradient.addColorStop(1, `${glow}0)`)
          return gradient
        },
        tension: 0.3
      }]
    }
  }, [history])

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        backgroundColor: '#0F172A',
        titleColor: '#94A3B8',
        bodyColor: '#F8FAFC',
        padding: 8,
        displayColors: false
      }
    },
    scales: {
      x: { display: false },
      y: { display: false }
    }
  }

  if (loading) return <div className="w-full h-full flex items-center justify-center text-neutral-600 text-xs">Loading chart…</div>
  if (!history.length) return <div className="w-full h-full flex items-center justify-center text-neutral-600 text-xs">No data available</div>

  return (
    <div className="w-full h-full min-h-[140px]">
      <Line data={chartData} options={chartOptions} />
    </div>
  )
}
