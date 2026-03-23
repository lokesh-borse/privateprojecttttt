import { useState, useEffect } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function AddStockToSectorModal({ slug, token, onClose, onSuccess }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [selected, setSelected] = useState(null)
  const [searching, setSearching] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  // Debounced search
  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    const timer = setTimeout(() => {
      setSearching(true)
      fetch(`${API_BASE}/api/stocks/?search=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(r => r.json())
        .then(data => {
          setResults(Array.isArray(data) ? data : (data.results || []))
          setSearching(false)
        })
        .catch(() => setSearching(false))
    }, 350)
    return () => clearTimeout(timer)
  }, [query, token])

  const handleSubmit = () => {
    if (!selected) return
    setSubmitting(true)
    setError(null)
    fetch(`${API_BASE}/api/sector-portfolios/${slug}/add-stock/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ stock_id: selected.id }),
    })
      .then(async r => {
        if (r.status === 409) throw new Error('This stock is already in the sector.')
        if (!r.ok) throw new Error('Failed to add stock.')
        return r.json()
      })
      .then(() => onSuccess())
      .catch(err => {
        setError(err.message)
        setSubmitting(false)
      })
  }

  return (
    <div style={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>Add Stock to Sector</h2>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Search */}
        <div style={styles.searchWrapper}>
          <span style={styles.searchIcon}>🔍</span>
          <input
            autoFocus
            type="text"
            placeholder="Search by symbol or name…"
            value={query}
            onChange={e => { setQuery(e.target.value); setSelected(null) }}
            style={styles.searchInput}
          />
        </div>

        {/* Results list */}
        <div style={styles.resultsList}>
          {searching && <div style={styles.hint}>Searching…</div>}
          {!searching && query && results.length === 0 && (
            <div style={styles.hint}>No stocks found for "{query}"</div>
          )}
          {results.map(stock => (
            <div
              key={stock.id}
              style={{
                ...styles.resultItem,
                background: selected?.id === stock.id
                  ? 'rgba(0,212,255,0.14)'
                  : 'transparent',
                borderColor: selected?.id === stock.id
                  ? 'rgba(0,212,255,0.4)'
                  : 'rgba(255,255,255,0.06)',
              }}
              onClick={() => setSelected(stock)}
            >
              <span style={styles.resultSymbol}>{stock.symbol}</span>
              <span style={styles.resultName}>{stock.name}</span>
              {selected?.id === stock.id && <span style={styles.checkmark}>✓</span>}
            </div>
          ))}
        </div>

        {/* Selected stock summary */}
        {selected && (
          <div style={styles.selectedInfo}>
            Selected: <strong style={{ color: '#00d4ff' }}>{selected.symbol}</strong> — {selected.name}
          </div>
        )}

        {/* Error */}
        {error && <div style={styles.error}>{error}</div>}

        {/* Actions */}
        <div style={styles.actions}>
          <button style={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button
            style={{
              ...styles.confirmBtn,
              opacity: selected && !submitting ? 1 : 0.5,
              cursor: selected && !submitting ? 'pointer' : 'not-allowed',
            }}
            onClick={handleSubmit}
            disabled={!selected || submitting}
          >
            {submitting ? 'Adding…' : '+ Add to Sector'}
          </button>
        </div>
      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.7)',
    backdropFilter: 'blur(6px)',
    zIndex: 999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  },
  modal: {
    background: '#111827',
    border: '1px solid rgba(0,212,255,0.18)',
    borderRadius: '20px',
    width: '100%',
    maxWidth: '520px',
    padding: '32px',
    boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 40px rgba(0,212,255,0.08)',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#fff',
    margin: 0,
  },
  closeBtn: {
    background: 'rgba(255,255,255,0.07)',
    border: 'none',
    color: '#9ab0cc',
    borderRadius: '8px',
    padding: '6px 12px',
    cursor: 'pointer',
    fontSize: '15px',
  },
  searchWrapper: {
    display: 'flex',
    alignItems: 'center',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    padding: '0 14px',
    gap: '10px',
  },
  searchIcon: { fontSize: '15px' },
  searchInput: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: '#fff',
    fontSize: '14px',
    padding: '12px 0',
    fontFamily: 'inherit',
  },
  resultsList: {
    maxHeight: '240px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  hint: {
    color: '#6b7fa3',
    fontSize: '13px',
    padding: '12px 0',
    textAlign: 'center',
  },
  resultItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.06)',
    cursor: 'pointer',
    transition: 'background 0.15s, border-color 0.15s',
  },
  resultSymbol: {
    fontSize: '13px',
    fontWeight: 700,
    color: '#00d4ff',
    minWidth: '70px',
  },
  resultName: {
    fontSize: '13px',
    color: '#b0c4de',
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  checkmark: {
    color: '#00d4ff',
    fontWeight: 700,
    fontSize: '15px',
  },
  selectedInfo: {
    fontSize: '13px',
    color: '#9ab0cc',
    background: 'rgba(0,212,255,0.06)',
    borderRadius: '8px',
    padding: '10px 14px',
  },
  error: {
    fontSize: '13px',
    color: '#ff8888',
    background: 'rgba(255,80,80,0.08)',
    borderRadius: '8px',
    padding: '10px 14px',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  },
  cancelBtn: {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#9ab0cc',
    borderRadius: '8px',
    padding: '10px 20px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  confirmBtn: {
    background: 'linear-gradient(135deg, #00d4ff, #0077aa)',
    border: 'none',
    color: '#fff',
    borderRadius: '8px',
    padding: '10px 22px',
    fontSize: '13px',
    fontWeight: 700,
    boxShadow: '0 0 16px #00d4ff33',
    fontFamily: 'inherit',
    transition: 'opacity 0.2s',
  },
}
