from django.core.management.base import BaseCommand
from django.utils.text import slugify
from apps.sector_portfolios.models import SectorPortfolio, SectorStock
from apps.stocks.models import Stock, StockUniverse


INDIAN_SECTORS = [
    {
        "name": "Banking & Finance", "icon": "🏦", "keywords": ["bank", "finance", "financial", "nbfc", "insurance"],
        "symbols": ["AUBANK.NS", "ABCAPITAL.NS", "AXISBANK.NS", "BSE.NS", "BAJFINANCE.NS", "BAJAJFINSV.NS", "BAJAJHLDNG.NS", "BAJAJHFL.NS", "BANKBARODA.NS", "BANKINDIA.NS", "CANBK.NS", "CHOLAFIN.NS", "FEDERALBNK.NS", "HDFCAMC.NS", "HDFCBANK.NS", "HDFCLIFE.NS", "ICICIBANK.NS", "ICICIGI.NS", "IDFCFIRSTB.NS", "INDIANB.NS", "INDUSINDBK.NS", "JIOFIN.NS", "KOTAKBANK.NS", "LTF.NS", "LICHSGFIN.NS", "LICI.NS", "M&MFIN.NS", "MFSL.NS", "MOTILALOFS.NS", "MUTHOOTFIN.NS", "PAYTM.NS", "PFC.NS", "POLICYBZR.NS", "PNB.NS", "RECLTD.NS", "SBICARD.NS", "SBILIFE.NS", "SHRIRAMFIN.NS", "SBIN.NS", "UNIONBANK.NS", "YESBANK.NS", "360ONE.NS", "HUDCO.NS", "IREDA.NS"]
    },
    {
        "name": "Information Technology", "icon": "💻", "keywords": ["tech", "infotech", "software", "it ", "data", "digital", "cyber"],
        "symbols": ["COFORGE.NS", "HCLTECH.NS", "INFY.NS", "KPITTECH.NS", "LTM.NS", "MPHASIS.NS", "OFSS.NS", "PERSISTENT.NS", "TCS.NS", "TATATECH.NS", "TECHM.NS", "WIPRO.NS"]
    },
    {
        "name": "Pharmaceuticals", "icon": "💊", "keywords": ["pharma", "drug", "medicine", "health", "biotech", "therapeutics"],
        "symbols": ["ALKEM.NS", "APOLLOHOSP.NS", "AUROPHARMA.NS", "BIOCON.NS", "CIPLA.NS", "DIVISLAB.NS", "DRREDDY.NS", "FORTIS.NS", "GLENMARK.NS", "LUPIN.NS", "MANKIND.NS", "MAXHEALTH.NS", "SUNPHARMA.NS", "TORNTPHARM.NS", "ZYDUSLIFE.NS"]
    },
    {
        "name": "Energy & Oil", "icon": "⚡", "keywords": ["energy", "oil", "gas", "petroleum", "power", "electric"],
        "symbols": ["ADANIENSOL.NS", "ADANIGREEN.NS", "ADANIPOWER.NS", "ATGL.NS", "BPCL.NS", "CGPOWER.NS", "COALINDIA.NS", "GAIL.NS", "HINDPETRO.NS", "IOC.NS", "IGL.NS", "JSWENERGY.NS", "NHPC.NS", "NTPCGREEN.NS", "NTPC.NS", "ONGC.NS", "OIL.NS", "POWERGRID.NS", "PREMIERENE.NS", "RELIANCE.NS", "SUZLON.NS", "TATAPOWER.NS", "TORNTPOWER.NS", "WAAREEENER.NS", "POWERINDIA.NS", "ENRIN.NS"]
    },
    {
        "name": "Auto & EV", "icon": "🚗", "keywords": ["auto", "motor", "vehicle", "car", "ev", "electric vehicle", "tractor"],
        "symbols": ["ASHOKLEY.NS", "BAJAJ-AUTO.NS", "BHARATFORG.NS", "BOSCHLTD.NS", "EICHERMOT.NS", "EXIDEIND.NS", "HEROMOTOCO.NS", "HYUNDAI.NS", "M&M.NS", "MARUTI.NS", "MOTHERSON.NS", "SONACOMS.NS", "TVSMOTOR.NS", "TIINDIA.NS"]
    },
    {
        "name": "FMCG", "icon": "🛒", "keywords": ["fmcg", "consumer", "foods", "beverage", "grocery", "household"],
        "symbols": ["ASIANPAINT.NS", "BRITANNIA.NS", "COLPAL.NS", "DABUR.NS", "DMART.NS", "GODFRYPHLP.NS", "GODREJCP.NS", "HINDUNILVR.NS", "ITC.NS", "JUBLFOOD.NS", "MARICO.NS", "NESTLEIND.NS", "NYKAA.NS", "PAGEIND.NS", "PATANJALI.NS", "SWIGGY.NS", "TATACONSUM.NS", "TITAN.NS", "TRENT.NS", "UNITDSPR.NS", "VBL.NS", "ZOMATO.NS"]
    },
    {
        "name": "Infrastructure", "icon": "🏗️", "keywords": ["infra", "construction", "cement", "real estate", "road", "port", "airport"],
        "symbols": ["ABB.NS", "ACC.NS", "AMBUJACEM.NS", "ASTRAL.NS", "BHEL.NS", "CUMMINSIND.NS", "GRASIM.NS", "HAVELLS.NS", "IRB.NS", "KEI.NS", "LT.NS", "PHOENIXLTD.NS", "PIIND.NS", "POLYCAB.NS", "RVNL.NS", "SHREECEM.NS", "SIEMENS.NS", "SUPREMEIND.NS", "ULTRACEMCO.NS", "VOLTAS.NS", "DIXON.NS", "BLUESTARCO.NS", "KALYANKJIL.NS"]
    },
    {
        "name": "Metals & Mining", "icon": "⛏️", "keywords": ["metal", "steel", "iron", "aluminium", "copper", "mining", "mineral"],
        "symbols": ["APLAPOLLO.NS", "HINDALCO.NS", "HINDZINC.NS", "JINDALSTEL.NS", "JSWSTEEL.NS", "NATIONALUM.NS", "NMDC.NS", "SAIL.NS", "TATASTEEL.NS", "VEDL.NS", "SRF.NS", "UPL.NS"]
    },
    {
        "name": "Telecom", "icon": "📡", "keywords": ["telecom", "telco", "wireless", "communication"],
        "symbols": ["BHARTIARTL.NS", "BHARTIHEXA.NS", "INDUSTOWER.NS", "IDEA.NS", "TATACOMM.NS", "TMPV.NS"]
    },
    {
        "name": "Real Estate", "icon": "🏠", "keywords": ["real estate", "realty", "property", "developer", "housing"],
        "symbols": ["DLF.NS", "GODREJPROP.NS", "LODHA.NS", "OBEROIRLTY.NS", "PRESTIGE.NS", "INDHOTEL.NS", "ITCHOTELS.NS", "CONCOR.NS", "IRCTC.NS", "IRFC.NS", "INDIGO.NS", "GMRAIRPORT.NS", "MAZDOCK.NS", "COCHINSHIP.NS", "BDL.NS", "BEL.NS", "HAL.NS", "SOLARINDS.NS", "VMM.NS", "TATAELXSI.NS", "ADANIPORTS.NS", "ADANIENT.NS"]
    },
]

GLOBAL_SECTORS = [
    {
        "name": "US Tech (FAANG+)", "icon": "🌐", "keywords": ["apple", "google", "amazon", "meta", "netflix", "microsoft", "nvidia", "alphabet"],
        "symbols": ["AAPL", "MSFT", "AMZN", "GOOGL", "GOOG", "META", "NFLX", "ADBE", "CRM", "NOW", "SNPS", "CDNS", "PANW", "CRWD", "FTNT", "PLTR", "APP", "DDOG", "CSCO", "IBM", "ORCL", "INTU", "ACN", "DELL", "HPQ", "CTSH", "IT", "ANET", "APH", "GLW", "HPE", "MSI", "STX", "WDC", "TEL", "CIEN", "CDW"]
    },
    {
        "name": "Global Finance", "icon": "💰", "keywords": ["jpmorgan", "goldman", "bank", "finance", "morgan", "wells fargo", "citigroup"],
        "symbols": ["JPM", "V", "MA", "BAC", "WFC", "GS", "MS", "AXP", "C", "SCHW", "BLK", "CB", "PGR", "CME", "MO", "USB", "PNC", "TFC", "AON", "ALL", "APO", "KKR", "BX", "BRK.B", "SPGI", "MCO", "ICE", "CMA", "FITB", "HBAN", "KEY", "MTB", "RF", "COF", "DFS", "SYF", "AJG", "MMC", "TRV", "PRU", "MET", "AFL"]
    },
    {
        "name": "Healthcare", "icon": "🏥", "keywords": ["pharma", "health", "medical", "biotech", "therapeutics", "drug"],
        "symbols": ["LLY", "JNJ", "ABBV", "MRK", "UNH", "ABT", "TMO", "GILD", "ISRG", "PFE", "DHR", "SYK", "VRTX", "BMY", "MDT", "HCA", "MCK", "BSX", "CVS", "REGN", "CI", "ELV", "AMGN", "BIIB", "ILMN", "IQV", "ZTS", "A", "BDX", "DXCM", "EW", "IDXX", "MTD", "RMD", "STE", "WAT", "ZBH", "CAH", "COR", "CNC", "HUM", "MOH", "WELL"]
    },
    {
        "name": "Consumer Goods", "icon": "🛍️", "keywords": ["consumer", "retail", "walmart", "costco", "target", "goods"],
        "symbols": ["WMT", "COST", "PG", "HD", "KO", "MCD", "PEP", "TJX", "SBUX", "NKE", "MNST", "MDLZ", "ROST", "CL", "LOW", "PM", "ORLY", "BKNG", "MAR", "HLT", "CMCSA", "DIS", "WBD", "DASH", "ABNB", "UBER", "TGT", "DG", "DLTR", "KDP", "K", "GIS", "HSY", "KHC", "TSN", "ADM", "BG", "CAG", "CPB", "SJM", "SYY", "CHD", "CLX", "KMB", "EL"]
    },
    {
        "name": "Energy", "icon": "🛢️", "keywords": ["exxon", "chevron", "energy", "oil", "gas", "petroleum", "shell"],
        "symbols": ["XOM", "CVX", "COP", "EOG", "SLB", "MPC", "PSX", "VLO", "BKR", "OXY", "OKE", "KMI", "WMB", "FANG", "HAL", "HES", "DVN", "PXD", "MRO", "TRGP"]
    },
    {
        "name": "Semiconductors", "icon": "🔬", "keywords": ["semi", "chip", "intel", "amd", "qualcomm", "semiconductor", "tsmc"],
        "symbols": ["NVDA", "AVGO", "AMD", "QCOM", "TXN", "AMAT", "INTC", "MU", "LRCX", "ADI", "KLAC", "NXPI", "MCHP", "MRVL", "SWKS", "QRVO", "TER", "MPWR"]
    },
    {
        "name": "EV & Clean Energy", "icon": "🔋", "keywords": ["tesla", "ev", "rivian", "lucid", "solar", "clean energy", "renewable"],
        "symbols": ["TSLA", "GEV", "CEG", "NEE", "ENPH", "FSLR", "GM", "F", "RIVN", "LCID", "AWK", "AES", "CNP", "CMS", "DTE", "ED", "EIX", "ES", "ETR", "EXC", "FE", "LNT", "NI", "PEG", "PNW", "PPL", "SRE", "WEC", "XEL", "DUK", "SO", "AEP", "D"]
    },
    {
        "name": "Defense", "icon": "🛡️", "keywords": ["defense", "aerospace", "lockheed", "raytheon", "boeing", "northrop"],
        "symbols": ["RTX", "BA", "LMT", "GE", "CAT", "HON", "UNP", "UPS", "DE", "ETN", "PH", "GD", "HWM", "FDX", "ADP", "PWR", "JCI", "PCAR", "GWW", "NOC", "LHX", "TDG", "TXT", "LDOS", "HII"]
    },
    {
        "name": "Media & Entertainment", "icon": "🎬", "keywords": ["media", "entertainment", "disney", "netflix", "streaming", "studio"],
        "symbols": ["CMCSA", "DIS", "WBD", "NFLX", "CHTR", "LYV", "PARA", "FOXA", "FOX", "NWS", "NWSA", "OMC", "IPG", "TMUS", "VZ", "T"]
    },
    {
        "name": "Commodities", "icon": "📦", "keywords": ["commodity", "gold", "silver", "agricultural", "wheat", "coffee"],
        "symbols": ["LIN", "SHW", "ECL", "APD", "FCX", "NEM", "CTVA", "DD", "ALB", "CE", "CF", "EMN", "FMC", "IFF", "LYB", "MOS", "PPG", "VMC", "MLM", "BLL", "CCK", "PKG", "WRK", "IP", "NUE", "STLD", "RS"]
    },
]


def match_stock_to_keywords(stock, sector_data):
    """Returns True if stock's symbol is in explicit symbols list OR matches any keyword."""
    if stock.symbol in sector_data.get('symbols', []):
        return True

    haystack = " ".join([
        stock.symbol or "",
        stock.name or "",
        stock.sector or "",
        stock.industry or "",
    ]).lower()
    return any(kw.lower() in haystack for kw in sector_data.get('keywords', []))


class Command(BaseCommand):
    help = 'Seed Indian and Global sector portfolios with stocks from the existing Stock database (and StockUniverse).'

    def add_arguments(self, parser):
        parser.add_argument('--clear', action='store_true', help='Clear existing system stocks before seeding')

    def handle(self, *args, **options):
        if options['clear']:
            SectorStock.objects.filter(is_system=True).delete()
            SectorPortfolio.objects.all().delete()
            self.stdout.write(self.style.WARNING('Cleared existing sector data.'))

        # ── Step 1: Ensure all StockUniverse symbols have a corresponding Stock record ──
        universe_in  = set(StockUniverse.objects.filter(market='IN',  is_active=True).values_list('symbol', flat=True))
        universe_us  = set(StockUniverse.objects.filter(market='US',  is_active=True).values_list('symbol', flat=True))
        all_universe = universe_in | universe_us

        existing_symbols = set(Stock.objects.values_list('symbol', flat=True))
        missing = all_universe - existing_symbols

        created_count = 0
        for sym in missing:
            Stock.objects.get_or_create(
                symbol=sym,
                defaults={'name': sym, 'sector': '', 'industry': ''}
            )
            created_count += 1

        if created_count:
            self.stdout.write(f"Auto-created {created_count} minimal Stock records from StockUniverse.")

        # ── Step 2: Match all stocks to sectors by exact symbol lists OR keyword ──
        all_stocks = list(Stock.objects.all())
        self.stdout.write(f"Found {len(all_stocks)} stocks in DB.")

        total_sectors = 0
        total_sector_stocks = 0

        for market, sectors in [('IN', INDIAN_SECTORS), ('GLOBAL', GLOBAL_SECTORS)]:
            for sector_data in sectors:
                slug = slugify(sector_data['name'])
                portfolio, created = SectorPortfolio.objects.get_or_create(
                    slug=slug,
                    defaults={
                        'name': sector_data['name'],
                        'market': market,
                        'icon': sector_data['icon'],
                        'description': f"Pre-built sector portfolio for {sector_data['name']}.",
                        'is_active': True,
                    }
                )
                if created:
                    total_sectors += 1

                matched = [s for s in all_stocks if match_stock_to_keywords(s, sector_data)]
                for stock in matched:
                    _, stock_created = SectorStock.objects.get_or_create(
                        sector_portfolio=portfolio,
                        stock=stock,
                        defaults={'is_system': True}
                    )
                    
                    # Update Stock's metadata if we successfully mapped it so it looks nice everywhere
                    if stock.sector == '':
                        stock.sector = sector_data['name']
                        stock.save(update_fields=['sector'])
                        
                    if stock_created:
                        total_sector_stocks += 1

                self.stdout.write(
                    f"  [{market}] {portfolio.name} ({portfolio.icon}) → {portfolio.stocks.count()} stocks"
                )

        self.stdout.write(self.style.SUCCESS(
            f"\n✅ Done! Created {total_sectors} new sectors and assigned {total_sector_stocks} new stock entries."
        ))
