from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticatedOrReadOnly, AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from apps.stocks.models import Stock
from .models import SectorPortfolio, SectorStock
from .serializers import (
    SectorPortfolioListSerializer,
    SectorPortfolioDetailSerializer,
    AddStockToSectorSerializer,
    SectorStockSerializer,
)


@api_view(['GET'])
@permission_classes([AllowAny])
def sector_portfolio_list(request):
    """List all active sector portfolios. Filter by ?market=IN or ?market=GLOBAL"""
    market = request.query_params.get('market', None)
    qs = SectorPortfolio.objects.filter(is_active=True)
    if market:
        qs = qs.filter(market__iexact=market)
    serializer = SectorPortfolioListSerializer(qs, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([AllowAny])
def sector_portfolio_detail(request, slug):
    """Get sector detail with all stocks."""
    portfolio = get_object_or_404(SectorPortfolio, slug=slug, is_active=True)
    serializer = SectorPortfolioDetailSerializer(portfolio)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([AllowAny])
def sector_portfolio_stocks(request, slug):
    """Paginated list of stocks in a sector."""
    portfolio = get_object_or_404(SectorPortfolio, slug=slug, is_active=True)
    stocks_qs = portfolio.stocks.select_related('stock', 'added_by').all()
    serializer = SectorStockSerializer(stocks_qs, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticatedOrReadOnly])
def add_stock_to_sector(request, slug):
    """Authenticated users can add a stock from the DB to a sector."""
    portfolio = get_object_or_404(SectorPortfolio, slug=slug, is_active=True)
    serializer = AddStockToSectorSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    stock = get_object_or_404(Stock, pk=serializer.validated_data['stock_id'])

    if SectorStock.objects.filter(sector_portfolio=portfolio, stock=stock).exists():
        return Response({'detail': 'This stock is already in the sector.'}, status=status.HTTP_409_CONFLICT)

    sector_stock = SectorStock.objects.create(
        sector_portfolio=portfolio,
        stock=stock,
        added_by=request.user,
        is_system=False,
    )
    return Response(SectorStockSerializer(sector_stock).data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([AllowAny])
def dashboard_summary(request):
    """
    Returns sector portfolios grouped by market for the dashboard widget.
    Response: { indian: [...], global: [...] }
    Each item: { id, name, slug, icon, description, stock_count, top_stocks }
    """
    def build_sector_list(market_code):
        qs = SectorPortfolio.objects.filter(is_active=True, market=market_code)
        result = []
        for sp in qs:
            top = sp.stocks.select_related('stock').order_by('-is_system', 'added_at')[:4]
            result.append({
                'id': sp.id,
                'name': sp.name,
                'slug': sp.slug,
                'icon': sp.icon,
                'description': sp.description,
                'market': sp.market,
                'stock_count': sp.stocks.count(),
                'top_stocks': [{'symbol': s.stock.symbol, 'name': s.stock.name} for s in top],
            })
        return result

    return Response({
        'indian': build_sector_list('IN'),
        'global': build_sector_list('GLOBAL'),
    })


# ── ML Analytics proxy for sector portfolios ─────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def sector_linear_regression(request, slug):
    """
    Proxy: Run linear regression across a sector's stocks.
    Returns same shape as portfolio/<id>/linear-regression/.
    """
    portfolio = get_object_or_404(SectorPortfolio, slug=slug, is_active=True)
    symbols = list(
        portfolio.stocks.select_related('stock').values_list('stock__symbol', flat=True)
    )

    if not symbols:
        return Response({'predictions': [], 'skipped': []})

    try:
        from apps.portfolio.ml_models import run_linear_regression_for_symbols
        result = run_linear_regression_for_symbols(symbols)
        return Response(result)
    except ImportError:
        pass

    # Fallback: try the portfolio view route directly
    try:
        from apps.portfolio.views import _run_lr_for_symbols
        result = _run_lr_for_symbols(symbols)
        return Response(result)
    except ImportError:
        pass

    # Final fallback — use the same logic as the portfolio LR endpoint
    return _sector_lr_fallback(symbols)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def sector_logistic_regression(request, slug):
    """
    Proxy: Run logistic regression (signal) across a sector's stocks.
    Returns same shape as portfolio/<id>/logistic-regression/.
    """
    portfolio = get_object_or_404(SectorPortfolio, slug=slug, is_active=True)
    symbols = list(
        portfolio.stocks.select_related('stock').values_list('stock__symbol', flat=True)
    )

    if not symbols:
        return Response({'predictions': [], 'skipped': []})

    try:
        from apps.portfolio.ml_models import run_logistic_regression_for_symbols
        result = run_logistic_regression_for_symbols(symbols)
        return Response(result)
    except ImportError:
        pass

    try:
        from apps.portfolio.views import _run_log_for_symbols
        result = _run_log_for_symbols(symbols)
        return Response(result)
    except ImportError:
        pass

    return Response({'predictions': [], 'skipped': [], 'error': 'ML module not found'})


def _sector_lr_fallback(symbols):
    """
    Minimal LR fallback using yfinance — returns predicted_next_close per symbol.
    Only used if the portfolio ML function can't be imported.
    """
    import yfinance as yf
    import numpy as np
    from sklearn.linear_model import LinearRegression

    predictions = []
    skipped = []

    for sym in symbols[:30]:  # cap at 30 to avoid timeout
        try:
            ticker = yf.Ticker(sym)
            hist = ticker.history(period='3mo')
            if len(hist) < 10:
                skipped.append({'symbol': sym, 'reason': 'insufficient data'})
                continue
            closes = hist['Close'].values
            X = np.arange(len(closes)).reshape(-1, 1)
            reg = LinearRegression().fit(X, closes)
            next_close = float(reg.predict([[len(closes)]])[0])
            last = float(closes[-1])
            pct = ((next_close - last) / last * 100) if last > 0 else 0
            predictions.append({
                'symbol': sym,
                'current_price': round(last, 2),
                'predicted_next_close': round(next_close, 2),
                'predicted_change_percent': round(pct, 2),
            })
        except Exception as e:
            skipped.append({'symbol': sym, 'reason': str(e)})

    from rest_framework.response import Response
    return Response({'predictions': predictions, 'skipped': skipped})


# ── Cluster Analysis proxy ────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def sector_clusters(request, slug):
    """KMeans clustering for all stocks in the sector (mirrors portfolio-clusters)."""
    import numpy as np
    from sklearn.cluster import KMeans
    from sklearn.preprocessing import StandardScaler
    from sklearn.decomposition import PCA
    from services.stock_service import get_history

    portfolio = get_object_or_404(SectorPortfolio, slug=slug, is_active=True)
    symbols = list(portfolio.stocks.select_related('stock').values_list('stock__symbol', flat=True))

    rows = []
    for sym in symbols:
        history = get_history(sym, period='1y', interval='1d') or []
        closes = [float(r['close_price']) for r in history if r.get('close_price') is not None]
        if len(closes) < 20:
            continue
        prices = np.array(closes, dtype=float)
        returns = np.diff(prices) / prices[:-1]
        ret_1y = float((prices[-1] / prices[0]) - 1) if prices[0] != 0 else 0
        vol = float(np.std(returns) * np.sqrt(252))
        max_dd = float(np.min((prices / np.maximum.accumulate(prices)) - 1))
        high_52 = float(np.max(prices))
        low_52 = float(np.min(prices))
        pos_52 = (prices[-1] - low_52) / (high_52 - low_52) if (high_52 - low_52) > 0 else 0.5
        rows.append({
            'symbol': sym, 'ret_1y': round(ret_1y, 4), 'vol': round(vol, 4),
            'max_drawdown': round(max_dd, 4), 'pos_52w': round(pos_52, 4),
        })

    if len(rows) < 2:
        return Response({'detail': 'Need at least 2 stocks with sufficient data for clustering'}, status=status.HTTP_400_BAD_REQUEST)

    feature_keys = ['ret_1y', 'vol', 'max_drawdown', 'pos_52w']
    X = np.array([[r[k] for k in feature_keys] for r in rows], dtype=float)
    X_scaled = StandardScaler().fit_transform(X)
    n_clusters = min(3, len(rows))
    kmeans = KMeans(n_clusters=n_clusters, n_init=10, random_state=42)
    labels = kmeans.fit_predict(X_scaled)
    pca_pts = None
    if len(rows) > 1:
        pca = PCA(n_components=2, random_state=42)
        pca_pts = pca.fit_transform(X_scaled)

    cluster_vols = {}
    for i, row in enumerate(rows):
        cid = int(labels[i])
        cluster_vols.setdefault(cid, []).append(row['vol'])
    avg_vols = {cid: float(np.mean(vols)) for cid, vols in cluster_vols.items()}
    sorted_cids = sorted(avg_vols, key=avg_vols.get, reverse=True)
    risk_labels_list = ['High-Risk', 'Medium-Risk', 'Low-Risk']
    cluster_label_map = {cid: risk_labels_list[i] for i, cid in enumerate(sorted_cids)}

    items = []
    for i, row in enumerate(rows):
        cid = int(labels[i])
        pca_x = round(float(pca_pts[i, 0]), 4) if pca_pts is not None else 0.0
        pca_y = round(float(pca_pts[i, 1]), 4) if pca_pts is not None and pca_pts.shape[1] > 1 else 0.0
        items.append({**row, 'cluster_id': cid, 'cluster_label': cluster_label_map.get(cid, f'Cluster {cid}'),
                      'pca_x': pca_x, 'pca_y': pca_y})

    summary = []
    for cid in range(n_clusters):
        group = [r for r in items if r['cluster_id'] == cid]
        if not group:
            continue
        summary.append({
            'cluster_id': cid, 'cluster_label': cluster_label_map.get(cid, f'Cluster {cid}'),
            'count': len(group),
            'avg_ret_1y': round(float(np.mean([r['ret_1y'] for r in group])), 4),
            'avg_vol': round(float(np.mean([r['vol'] for r in group])), 4),
            'avg_max_drawdown': round(float(np.mean([r['max_drawdown'] for r in group])), 4),
        })

    return Response({'portfolio_id': slug, 'portfolio_name': portfolio.name, 'n_clusters': n_clusters, 'items': items, 'summary': summary})


# ── Growth Analysis proxy ─────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def sector_growth(request, slug):
    """3-month growth analysis for the sector (mirrors growth-analysis endpoint)."""
    import numpy as np
    from services.stock_service import get_history

    portfolio = get_object_or_404(SectorPortfolio, slug=slug, is_active=True)
    symbols = list(portfolio.stocks.select_related('stock').values_list('stock__symbol', flat=True))

    stock_stats, all_daily_returns = [], []
    for sym in symbols:
        history = get_history(sym, period='3mo', interval='1d') or []
        closes = [float(r['close_price']) for r in history if r.get('close_price') is not None]
        if len(closes) < 5:
            continue
        prices = np.array(closes)
        returns = np.diff(prices) / prices[:-1]
        total_return = float((prices[-1] / prices[0]) - 1) if prices[0] != 0 else 0.0
        stock_stats.append({
            'symbol': sym,
            'total_return': round(total_return * 100, 2),
            'mean_daily_return': round(float(np.mean(returns)) * 100, 4),
            'volatility': round(float(np.std(returns)) * 100, 4),
        })
        all_daily_returns.extend(returns.tolist())

    if not stock_stats:
        return Response({'detail': 'Insufficient historical data'}, status=status.HTTP_400_BAD_REQUEST)

    arr = np.array(all_daily_returns)
    rf_daily = 0.06 / 252
    sharpe = float((np.mean(arr) - rf_daily) / np.std(arr) * np.sqrt(252)) if np.std(arr) != 0 else 0.0
    best = max(stock_stats, key=lambda x: x['total_return']) if stock_stats else None
    worst = min(stock_stats, key=lambda x: x['total_return']) if stock_stats else None

    return Response({
        'portfolio_id': slug, 'portfolio_name': portfolio.name, 'period': '3 Months',
        'portfolio_mean_daily_return_pct': round(float(np.mean(arr)) * 100, 4),
        'portfolio_std_dev_pct': round(float(np.std(arr)) * 100, 4),
        'annualised_sharpe_ratio': round(sharpe, 4),
        'best_stock': best, 'worst_stock': worst, 'stock_breakdown': stock_stats,
    })


# ── AI Summary proxy ──────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def sector_summary(request, slug):
    """Cluster-based narrative summary for the sector (mirrors summary-report)."""
    import numpy as np
    from sklearn.cluster import KMeans
    from sklearn.preprocessing import StandardScaler
    from services.stock_service import get_history

    portfolio = get_object_or_404(SectorPortfolio, slug=slug, is_active=True)
    symbols = list(portfolio.stocks.select_related('stock').values_list('stock__symbol', flat=True))

    rows = []
    for sym in symbols:
        history = get_history(sym, period='1y', interval='1d') or []
        closes = [float(r['close_price']) for r in history if r.get('close_price') is not None]
        if len(closes) < 20:
            continue
        prices = np.array(closes)
        returns = np.diff(prices) / prices[:-1]
        rows.append({
            'symbol': sym, 'sector': portfolio.name,
            'ret_1y': float((prices[-1] / prices[0]) - 1) if prices[0] != 0 else 0,
            'vol': float(np.std(returns) * np.sqrt(252)),
        })

    if len(rows) < 2:
        return Response({'detail': 'Need at least 2 stocks with sufficient data'}, status=status.HTTP_400_BAD_REQUEST)

    X = np.array([[r['ret_1y'], r['vol']] for r in rows])
    X_scaled = StandardScaler().fit_transform(X)
    n_clusters = min(3, len(rows))
    labels = KMeans(n_clusters=n_clusters, n_init=10, random_state=42).fit_predict(X_scaled)
    risk_labels = ['High-Risk', 'Medium-Risk', 'Low-Risk']
    cluster_vols = {}
    for i, r in enumerate(rows):
        cid = int(labels[i])
        cluster_vols.setdefault(cid, []).append(r['vol'])
    sorted_cids = sorted(cluster_vols, key=lambda c: float(np.mean(cluster_vols[c])), reverse=True)
    cluster_label_map = {cid: risk_labels[i] for i, cid in enumerate(sorted_cids)}
    groups = {}
    for i, r in enumerate(rows):
        lbl = cluster_label_map.get(int(labels[i]), 'Unknown')
        groups.setdefault(lbl, []).append(r['symbol'])

    positive = [r for r in rows if r['ret_1y'] > 0]
    negative = [r for r in rows if r['ret_1y'] <= 0]
    lines = [
        f"## Sector Analysis Report — {portfolio.name}", "",
        f"This sector holds **{len(rows)} stocks**.", "",
        "### Cluster Breakdown",
    ]
    for lbl, syms in groups.items():
        lines.append(f"- **{lbl}**: {', '.join(syms)}")
    lines += [
        "", "### Performance Highlights",
        f"- **{len(positive)} stocks** showed positive 1-year returns.",
        f"- **{len(negative)} stocks** are in the red over the past year.",
    ]
    if rows:
        best = max(rows, key=lambda r: r['ret_1y'])
        worst = min(rows, key=lambda r: r['ret_1y'])
        if best and worst:
            lines += [
                f"- Best performer: **{best['symbol']}** ({best['ret_1y']*100:.1f}%)",
                f"- Worst performer: **{worst['symbol']}** ({worst['ret_1y']*100:.1f}%)",
            ]
    high_risk_syms = groups.get('High-Risk', [])
    if high_risk_syms:
        lines.append(f"⚠️ Stocks with elevated risk: **{', '.join(high_risk_syms)}**.")
    low_risk_syms = groups.get('Low-Risk', [])
    if low_risk_syms:
        lines.append(f"✅ Stable, lower-risk stocks: **{', '.join(low_risk_syms)}**.")

    return Response({
        'portfolio_id': slug, 'portfolio_name': portfolio.name,
        'report': '\n'.join(lines), 'groups': groups,
    })


# ── Recommendations proxy ─────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def sector_recommend(request, slug):
    """Return stocks in the same sector universe not yet in this sector portfolio."""
    from services.stock_service import get_stock_profile, get_live_quote
    from apps.stocks.models import Stock as StockModel

    portfolio = get_object_or_404(SectorPortfolio, slug=slug, is_active=True)
    existing_symbols = set(portfolio.stocks.values_list('stock__symbol', flat=True))

    # Get all stocks in the same market not in this sector
    all_sector_stocks = StockModel.objects.filter(sector__icontains=portfolio.name).exclude(symbol__in=existing_symbols)[:20]

    recommendations = []
    for stock in all_sector_stocks[:10]:
        try:
            quote = get_live_quote(stock.symbol) or {}
            recommendations.append({
                'symbol': stock.symbol, 'name': stock.name or stock.symbol,
                'sector': stock.sector or portfolio.name,
                'reason': f'Also in {portfolio.name} sector',
                'current_price': quote.get('price'),
                'pe_ratio': stock.pe_ratio,
            })
        except Exception:
            recommendations.append({
                'symbol': stock.symbol, 'name': stock.name or stock.symbol,
                'sector': stock.sector or portfolio.name,
                'reason': f'Also in {portfolio.name} sector',
                'current_price': None, 'pe_ratio': None,
            })

    return Response({
        'portfolio_id': slug, 'portfolio_name': portfolio.name,
        'recommendations': recommendations,
    })

