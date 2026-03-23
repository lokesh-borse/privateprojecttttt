from django.urls import path
from . import views

urlpatterns = [
    path('sector-portfolios/', views.sector_portfolio_list, name='sector-portfolio-list'),
    path('sector-portfolios/dashboard-summary/', views.dashboard_summary, name='sector-portfolio-dashboard-summary'),
    path('sector-portfolios/<slug:slug>/', views.sector_portfolio_detail, name='sector-portfolio-detail'),
    path('sector-portfolios/<slug:slug>/stocks/', views.sector_portfolio_stocks, name='sector-portfolio-stocks'),
    path('sector-portfolios/<slug:slug>/add-stock/', views.add_stock_to_sector, name='sector-portfolio-add-stock'),
    # ML Analytics
    path('sector-portfolios/<slug:slug>/analytics/linear-regression/', views.sector_linear_regression, name='sector-lr'),
    path('sector-portfolios/<slug:slug>/analytics/logistic-regression/', views.sector_logistic_regression, name='sector-log'),
    path('sector-portfolios/<slug:slug>/analytics/clusters/', views.sector_clusters, name='sector-clusters'),
    path('sector-portfolios/<slug:slug>/analytics/growth/', views.sector_growth, name='sector-growth'),
    path('sector-portfolios/<slug:slug>/analytics/summary/', views.sector_summary, name='sector-summary'),
    path('sector-portfolios/<slug:slug>/analytics/recommend/', views.sector_recommend, name='sector-recommend'),
]
