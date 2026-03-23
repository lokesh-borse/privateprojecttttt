from django.contrib import admin
from .models import SectorPortfolio, SectorStock


class SectorStockInline(admin.TabularInline):
    model = SectorStock
    extra = 1
    raw_id_fields = ['stock']
    readonly_fields = ['added_at']


@admin.register(SectorPortfolio)
class SectorPortfolioAdmin(admin.ModelAdmin):
    list_display = ['name', 'market', 'icon', 'is_active', 'stock_count', 'created_at']
    list_filter = ['market', 'is_active']
    search_fields = ['name', 'slug']
    prepopulated_fields = {'slug': ('name',)}
    inlines = [SectorStockInline]

    def stock_count(self, obj):
        return obj.stocks.count()
    stock_count.short_description = '# Stocks'


@admin.register(SectorStock)
class SectorStockAdmin(admin.ModelAdmin):
    list_display = ['stock', 'sector_portfolio', 'is_system', 'added_by', 'added_at']
    list_filter = ['is_system', 'sector_portfolio__market']
    search_fields = ['stock__symbol', 'stock__name', 'sector_portfolio__name']
    readonly_fields = ['added_at']
