import React, { useState } from 'react'
import MarketSection from '../components/stocks/MarketSection'
import AddToPortfolioModal from '../components/stocks/AddToPortfolioModal'

// ─── Stock Universe ────────────────────────────────────────────────────────────

const INDIAN_STOCKS = [
  'RELIANCE.NS','TCS.NS','HDFCBANK.NS','ICICIBANK.NS','INFY.NS','HINDUNILVR.NS',
  'SBIN.NS','BHARTIARTL.NS','ITC.NS','KOTAKBANK.NS','LT.NS','AXISBANK.NS',
  'ASIANPAINT.NS','MARUTI.NS','SUNPHARMA.NS','ULTRACEMCO.NS','TITAN.NS',
  'NESTLEIND.NS','WIPRO.NS','POWERGRID.NS','NTPC.NS','ONGC.NS','BAJFINANCE.NS',
  'BAJAJFINSV.NS','ADANIENT.NS','ADANIPORTS.NS','APOLLOHOSP.NS','DRREDDY.NS',
  'CIPLA.NS','COALINDIA.NS','JSWSTEEL.NS','TATASTEEL.NS','HCLTECH.NS',
  'DIVISLAB.NS','BRITANNIA.NS','EICHERMOT.NS','HEROMOTOCO.NS','HDFCLIFE.NS',
  'SBILIFE.NS','TECHM.NS','GRASIM.NS','INDUSINDBK.NS','UPL.NS','BAJAJ-AUTO.NS',
  'BPCL.NS','IOC.NS','HINDALCO.NS','SHREECEM.NS','TATAMOTORS.NS','PIDILITIND.NS',
  'ABB.NS','ACC.NS','AUBANK.NS','AMBUJACEM.NS','BANDHANBNK.NS','BANKBARODA.NS',
  'BERGEPAINT.NS','BOSCHLTD.NS','CANBK.NS','CHOLAFIN.NS','COLPAL.NS','DABUR.NS',
  'DLF.NS','ESCORTS.NS','EXIDEIND.NS','GAIL.NS','GODREJCP.NS','HAVELLS.NS',
  'ICICIGI.NS','IGL.NS','INDIGO.NS','INDUSTOWER.NS','IRCTC.NS','JUBLFOOD.NS',
  'LICHSGFIN.NS','LUPIN.NS','NMDC.NS','PAGEIND.NS','PEL.NS','PETRONET.NS',
  'PNB.NS','RAMCOCEM.NS','SAIL.NS','SRF.NS','TORNTPHARM.NS','TVSMOTOR.NS',
  'VEDL.NS','VOLTAS.NS','3MINDIA.NS','AARTIIND.NS','ABFRL.NS','ADANIGREEN.NS',
  'ADANIPOWER.NS','ALKEM.NS','ASTRAL.NS','ATUL.NS','BALKRISIND.NS','BATAINDIA.NS',
  'BEL.NS','BHARATFORG.NS','BIOCON.NS','DEEPAKNTR.NS','ENDURANCE.NS',
  'FEDERALBNK.NS','FORTIS.NS','GLENMARK.NS','GMRINFRA.NS','GUJGASLTD.NS',
  'HAL.NS','IDFCFIRSTB.NS','IEX.NS','INDHOTEL.NS','JINDALSTEL.NS','JKCEMENT.NS',
  'JSWENERGY.NS','LAURUSLABS.NS','LTTS.NS','MANAPPURAM.NS','MAXHEALTH.NS',
  'METROPOLIS.NS','MFSL.NS','NAVINFLUOR.NS','NHPC.NS','OBEROIRLTY.NS','OFSS.NS',
  'PIIND.NS','POLYCAB.NS','PVRINOX.NS','RECLTD.NS','SBICARD.NS','SUNTV.NS',
  'SYNGENE.NS','TATACHEM.NS','TATACONSUM.NS','TRIDENT.NS',
]

const GLOBAL_STOCKS = [
  'AAPL','MSFT','GOOGL','AMZN','META','NVDA','TSLA','BRK-B','JPM','V',
  'MA','UNH','HD','PG','DIS','BAC','XOM','KO','PFE','PEP',
  'CSCO','T','VZ','ADBE','NFLX','CRM','INTC','AMD','ORCL','IBM',
  'QCOM','TXN','AVGO','COST','WMT','MCD','NKE','LLY','MRK','ABBV',
  'TMO','DHR','PYPL','UBER','SHOP','SQ','SNOW','PLTR','ROKU','ZM',
  'DOCU','SPOT','TWLO','DDOG','OKTA','NET','TEAM','ZS','MDB','CRWD',
  'PANW','F','GM','RIVN','LCID','BA','GE','CAT','DE','HON',
  'UPS','FDX','DAL','UAL','AAL','BKNG','EXPE','ABNB','MAR','HLT',
  'SBUX','YUM','CMG','CVS','UNP','NSC','CSX','ADSK','ANET','LRCX',
  'KLAC','ASML','TSM','BABA','JD','PDD','NTES','BIDU','SONY','SAP',
  'SQM','RIO','BHP','VALE','NIO','XPEV','LI','SE','MELI','GRAB',
  'ETSY','EBAY','ROST','TJX','LOW','DG','DLTR','KR','TGT','BK',
  'BLK','GS','MS','SCHW','AXP','C','USB','PNC','COF','MMM',
  'RTX','LMT','GD','NOC',
]

// ─── Tab pill component ────────────────────────────────────────────────────────
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

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Stocks() {
  const [activeTab, setActiveTab] = useState('IN') // 'IN' | 'US'
  const [modalStock, setModalStock] = useState(null)

  const handleAdd = (stock) => setModalStock(stock)
  const handleCloseModal = () => setModalStock(null)

  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-100">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">

        {/* ── Page header ── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1 h-6 rounded-full bg-gradient-to-b from-cyan-400 to-blue-600" />
              <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Market Explorer</h1>
            </div>
            <p className="text-sm text-slate-400 ml-3">
              Browse and add stocks from Indian &amp; Global markets to your portfolio
            </p>
          </div>

          {/* Live indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 self-start sm:self-auto">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-xs font-medium text-emerald-400">Live Quotes</span>
          </div>
        </div>

        {/* ── Market Tab Pills ── */}
        <div className="flex items-center gap-3 mb-8">
          <TabPill
            active={activeTab === 'IN'}
            onClick={() => setActiveTab('IN')}
            icon="🇮🇳"
            label="Indian Markets"
            count={INDIAN_STOCKS.length}
          />
          <TabPill
            active={activeTab === 'US'}
            onClick={() => setActiveTab('US')}
            icon="🌐"
            label="Global Markets"
            count={GLOBAL_STOCKS.length}
          />
        </div>

        {/* ── Divider ── */}
        <div className="h-px w-full bg-gradient-to-r from-cyan-500/20 via-white/5 to-transparent mb-8" />

        {/* ── Market Section ── */}
        <div className="transition-all duration-300">
          {activeTab === 'IN' ? (
            <MarketSection
              key="IN"
              title="Indian Markets"
              icon="📈"
              flag="🇮🇳"
              symbols={INDIAN_STOCKS}
              market="IN"
              onAdd={handleAdd}
            />
          ) : (
            <MarketSection
              key="US"
              title="Global Markets"
              icon="🌐"
              flag="🌐"
              symbols={GLOBAL_STOCKS}
              market="US"
              onAdd={handleAdd}
            />
          )}
        </div>

        {/* ── Info strip ── */}
        <div className="mt-12 flex flex-wrap gap-4 justify-center">
          {[
            { icon: '⚡', label: 'Real-time quotes', sub: 'via yfinance' },
            { icon: '📊', label: 'OHLC data', sub: 'daily candles' },
            { icon: '🔒', label: '52-week range', sub: 'high & low' },
            { icon: '💼', label: 'Portfolio ready', sub: 'add in one click' },
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

      {/* ── Add to Portfolio Modal ── */}
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
