from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    StockViewSet, stocks_search, live_search, live_detail, historical,
    stock_sentiment, stock_performance_5y, stock_summary_download
)

router = DefaultRouter()
router.register('stocks', StockViewSet, basename='stocks')

urlpatterns = [
    path('stocks/search/', stocks_search),
    path('stocks/search', stocks_search),
    path('stocks/live-search/', live_search),
    path('stocks/live-search', live_search),
    path('stocks/live-detail/', live_detail),
    path('stocks/live-detail', live_detail),
    path('stocks/historical/', historical),
    path('stocks/historical', historical),
    # New endpoints
    path('stocks/sentiment/', stock_sentiment),
    path('stocks/performance-5y/', stock_performance_5y),
    path('stocks/download-summary/', stock_summary_download),
    path('', include(router.urls)),
]
