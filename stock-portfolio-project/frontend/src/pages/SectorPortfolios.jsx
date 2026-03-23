import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function SectorPortfolios() {
  const [market, setMarket] = useState('IN')
  const [sectors, setSectors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch(`${API_BASE}/api/sector-portfolios/?market=${market}`)
      .then(r => {
        if (!r.ok) throw new Error('Failed to fetch sectors')
        return r.json()
      })
      .then(data => {
        setSectors(data)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [market])

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Sector Portfolios</h1>
        <p style={styles.subtitle}>Explore pre-built, system-curated portfolios by industry sector</p>

        {/* Sliding Toggle */}
        <div style={styles.toggleContainer}>
          <div
            style={{
              ...styles.toggleTrack,
              background: market === 'IN'
                ? 'linear-gradient(90deg, #00d4ff22, #0a0e1a)'
                : 'linear-gradient(90deg, #0a0e1a, #00d4ff22)',
            }}
            onClick={() => setMarket(m => m === 'IN' ? 'GLOBAL' : 'IN')}
          >
            {/* Sliding pill */}
            <div
              style={{
                ...styles.togglePill,
                transform: market === 'GLOBAL' ? 'translateX(160px)' : 'translateX(0px)',
              }}
            />
            <span style={{ ...styles.toggleLabel, opacity: market === 'IN' ? 1 : 0.45 }}>
              🇮🇳 Indian
            </span>
            <span style={{ ...styles.toggleLabel, opacity: market === 'GLOBAL' ? 1 : 0.45 }}>
              🌐 Global
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading && (
        <div style={styles.center}>
          <div style={styles.spinner} />
          <p style={styles.loadingText}>Loading sectors…</p>
        </div>
      )}

      {error && (
        <div style={styles.error}>⚠️ {error}</div>
      )}

      {!loading && !error && sectors.length === 0 && (
        <div style={styles.center}>
          <p style={styles.emptyText}>No sectors found. Run <code>manage.py seed_sectors</code> to populate.</p>
        </div>
      )}

      {!loading && !error && sectors.length > 0 && (
        <div style={styles.grid}>
          {sectors.map(sector => (
            <Link to={`/sector-portfolios/${sector.slug}`} key={sector.id} style={{ textDecoration: 'none' }}>
              <div style={styles.card}>
                <div style={styles.cardGlow} />
                <div style={styles.cardIcon}>{sector.icon || '📊'}</div>
                <h3 style={styles.cardTitle}>{sector.name}</h3>
                <p style={styles.cardDesc}>{sector.description || 'System-curated sector portfolio'}</p>
                <div style={styles.cardMeta}>
                  <span style={styles.stockBadge}>{sector.stock_count} stocks</span>
                  <div style={styles.topStocks}>
                    {(sector.top_stocks || []).map((s, i) => (
                      <span key={i} style={styles.tickerChip}>{s.symbol}</span>
                    ))}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#0a0e1a',
    padding: '40px 32px',
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
  },
  header: {
    textAlign: 'center',
    marginBottom: '48px',
  },
  title: {
    fontSize: '36px',
    fontWeight: 800,
    color: '#ffffff',
    margin: 0,
    marginBottom: '8px',
    letterSpacing: '-0.5px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#6b7fa3',
    margin: '0 0 32px',
  },

  /* Toggle */
  toggleContainer: {
    display: 'flex',
    justifyContent: 'center',
  },
  toggleTrack: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '320px',
    height: '48px',
    borderRadius: '999px',
    border: '1px solid #1e2d4a',
    padding: '0 20px',
    cursor: 'pointer',
    userSelect: 'none',
    transition: 'background 0.5s ease',
    overflow: 'hidden',
  },
  togglePill: {
    position: 'absolute',
    left: '4px',
    top: '4px',
    width: '152px',
    height: '40px',
    borderRadius: '999px',
    background: 'linear-gradient(135deg, #00d4ff, #0077aa)',
    boxShadow: '0 0 18px #00d4ff55',
    transition: 'transform 0.38s cubic-bezier(0.4, 0, 0.2, 1)',
    zIndex: 0,
  },
  toggleLabel: {
    position: 'relative',
    zIndex: 1,
    fontSize: '14px',
    fontWeight: 600,
    color: '#fff',
    transition: 'opacity 0.3s ease',
    width: '120px',
    textAlign: 'center',
  },

  /* Grid */
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '24px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  card: {
    position: 'relative',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(0, 212, 255, 0.12)',
    borderRadius: '16px',
    padding: '28px 24px',
    cursor: 'pointer',
    overflow: 'hidden',
    transition: 'transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease',
    backdropFilter: 'blur(10px)',
    ':hover': {
      transform: 'translateY(-4px)',
    },
  },
  cardGlow: {
    position: 'absolute',
    top: '-40px',
    right: '-40px',
    width: '120px',
    height: '120px',
    background: 'radial-gradient(circle, #00d4ff18, transparent 70%)',
    pointerEvents: 'none',
  },
  cardIcon: {
    fontSize: '36px',
    marginBottom: '12px',
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#ffffff',
    margin: '0 0 8px',
  },
  cardDesc: {
    fontSize: '13px',
    color: '#6b7fa3',
    margin: '0 0 16px',
    lineHeight: 1.5,
  },
  cardMeta: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '8px',
  },
  stockBadge: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#00d4ff',
    background: 'rgba(0,212,255,0.12)',
    borderRadius: '6px',
    padding: '3px 10px',
  },
  topStocks: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap',
  },
  tickerChip: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#9ab0cc',
    background: 'rgba(255,255,255,0.06)',
    borderRadius: '5px',
    padding: '2px 8px',
  },

  /* States */
  center: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '300px',
    gap: '16px',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid rgba(0,212,255,0.15)',
    borderTop: '3px solid #00d4ff',
    borderRadius: '50%',
    animation: 'spin 0.9s linear infinite',
  },
  loadingText: {
    color: '#6b7fa3',
    fontSize: '14px',
  },
  emptyText: {
    color: '#6b7fa3',
    fontSize: '14px',
    textAlign: 'center',
  },
  error: {
    background: 'rgba(255,80,80,0.1)',
    border: '1px solid rgba(255,80,80,0.25)',
    borderRadius: '12px',
    color: '#ff8888',
    padding: '16px 20px',
    textAlign: 'center',
    maxWidth: '500px',
    margin: '40px auto',
  },
}
