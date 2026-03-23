import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import AddStockToSectorModal from '../components/AddStockToSectorModal.jsx'


const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function SectorDetail() {
  const { slug } = useParams()
  const { isAuthenticated } = useAuth()
  const token = localStorage.getItem('access')
  const [sector, setSector] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showModal, setShowModal] = useState(false)

  const fetchSector = () => {
    setLoading(true)
    fetch(`${API_BASE}/api/sector-portfolios/${slug}/`)
      .then(r => {
        if (!r.ok) throw new Error('Sector not found')
        return r.json()
      })
      .then(data => {
        setSector(data)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchSector()
  }, [slug])

  if (loading) return (
    <div style={styles.page}>
      <div style={styles.center}>
        <div style={styles.spinner} />
        <p style={{ color: '#6b7fa3' }}>Loading sector…</p>
      </div>
    </div>
  )

  if (error) return (
    <div style={styles.page}>
      <div style={styles.error}>⚠️ {error}</div>
    </div>
  )

  return (
    <div style={styles.page}>
      {/* Back link */}
      <Link to="/sector-portfolios" style={styles.backLink}>← All Sectors</Link>

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.icon}>{sector.icon || '📊'}</span>
          <div>
            <h1 style={styles.title}>{sector.name}</h1>
            <p style={styles.desc}>{sector.description}</p>
          </div>
        </div>
        <div style={styles.headerRight}>
          <span style={{
            ...styles.marketBadge,
            background: sector.market === 'IN' ? 'rgba(0,212,255,0.12)' : 'rgba(150,100,255,0.12)',
            color: sector.market === 'IN' ? '#00d4ff' : '#aa88ff',
          }}>
            {sector.market === 'IN' ? '🇮🇳 Indian' : '🌐 Global'}
          </span>
          <span style={styles.countBadge}>{sector.stock_count} stocks</span>
          {isAuthenticated && (
            <button style={styles.addBtn} onClick={() => setShowModal(true)}>
              + Add Stock
            </button>
          )}
        </div>
      </div>

      {/* Stocks Table */}
      {sector.stocks?.length === 0 ? (
        <div style={styles.empty}>
          No stocks in this sector yet.
          {isAuthenticated && <span> Click <strong>+ Add Stock</strong> to be the first!</span>}
        </div>
      ) : (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Symbol</th>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Sector</th>
                <th style={styles.th}>Industry</th>
                <th style={styles.th}>Source</th>
                <th style={styles.th}>Added</th>
              </tr>
            </thead>
            <tbody>
              {sector.stocks.map(entry => (
                <tr key={entry.id} style={styles.tr}>
                  <td style={styles.tdSymbol}>{entry.stock.symbol}</td>
                  <td style={styles.td}>{entry.stock.name}</td>
                  <td style={styles.td}>{entry.stock.sector || '—'}</td>
                  <td style={styles.td}>{entry.stock.industry || '—'}</td>
                  <td style={styles.td}>
                    <span style={entry.is_system ? styles.systemBadge : styles.userBadge}>
                      {entry.is_system ? 'System' : entry.added_by_username || 'User'}
                    </span>
                  </td>
                  <td style={styles.td}>
                    {new Date(entry.added_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <AddStockToSectorModal
          slug={slug}
          token={token}
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); fetchSector() }}
        />
      )}
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#0a0e1a',
    padding: '32px',
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    color: '#fff',
  },
  backLink: {
    color: '#00d4ff',
    textDecoration: 'none',
    fontSize: '13px',
    fontWeight: 500,
    display: 'inline-block',
    marginBottom: '24px',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '16px',
    marginBottom: '36px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(0,212,255,0.1)',
    borderRadius: '16px',
    padding: '28px 32px',
    backdropFilter: 'blur(10px)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  icon: {
    fontSize: '52px',
    lineHeight: 1,
  },
  title: {
    fontSize: '28px',
    fontWeight: 800,
    margin: '0 0 6px',
    color: '#fff',
    letterSpacing: '-0.3px',
  },
  desc: {
    fontSize: '14px',
    color: '#6b7fa3',
    margin: 0,
    maxWidth: '420px',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
  },
  marketBadge: {
    fontSize: '13px',
    fontWeight: 600,
    borderRadius: '8px',
    padding: '6px 14px',
  },
  countBadge: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#9ab0cc',
    background: 'rgba(255,255,255,0.06)',
    borderRadius: '8px',
    padding: '6px 14px',
  },
  addBtn: {
    background: 'linear-gradient(135deg, #00d4ff, #0077aa)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 18px',
    fontSize: '13px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 0 16px #00d4ff44',
    transition: 'opacity 0.2s',
  },

  /* Table */
  tableWrapper: {
    overflowX: 'auto',
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.07)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    background: 'rgba(255,255,255,0.02)',
  },
  th: {
    padding: '14px 20px',
    textAlign: 'left',
    fontSize: '12px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: '#6b7fa3',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    whiteSpace: 'nowrap',
  },
  tr: {
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    transition: 'background 0.15s',
  },
  tdSymbol: {
    padding: '14px 20px',
    fontSize: '14px',
    fontWeight: 700,
    color: '#00d4ff',
    whiteSpace: 'nowrap',
  },
  td: {
    padding: '14px 20px',
    fontSize: '13px',
    color: '#b0c4de',
    whiteSpace: 'nowrap',
  },
  systemBadge: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#00d4ff',
    background: 'rgba(0,212,255,0.1)',
    borderRadius: '5px',
    padding: '2px 8px',
  },
  userBadge: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#aa88ff',
    background: 'rgba(150,100,255,0.1)',
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
    gap: '12px',
  },
  spinner: {
    width: '36px',
    height: '36px',
    border: '3px solid rgba(0,212,255,0.15)',
    borderTop: '3px solid #00d4ff',
    borderRadius: '50%',
    animation: 'spin 0.9s linear infinite',
  },
  error: {
    background: 'rgba(255,80,80,0.1)',
    border: '1px solid rgba(255,80,80,0.25)',
    borderRadius: '12px',
    color: '#ff8888',
    padding: '16px 20px',
    textAlign: 'center',
    maxWidth: '500px',
    margin: '60px auto',
  },
  empty: {
    textAlign: 'center',
    color: '#6b7fa3',
    padding: '40px',
    fontSize: '14px',
  },
}
