from rest_framework import serializers
from apps.stocks.models import Stock
from .models import SectorPortfolio, SectorStock


class StockMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = Stock
        fields = ['id', 'symbol', 'name', 'sector', 'industry']


class SectorStockSerializer(serializers.ModelSerializer):
    stock = StockMiniSerializer(read_only=True)
    added_by_username = serializers.CharField(source='added_by.username', read_only=True, default=None)

    class Meta:
        model = SectorStock
        fields = ['id', 'stock', 'is_system', 'added_by_username', 'added_at']


class SectorPortfolioListSerializer(serializers.ModelSerializer):
    stock_count = serializers.SerializerMethodField()
    top_stocks = serializers.SerializerMethodField()

    class Meta:
        model = SectorPortfolio
        fields = ['id', 'name', 'slug', 'description', 'market', 'icon', 'stock_count', 'top_stocks']

    def get_stock_count(self, obj):
        return obj.stocks.count()

    def get_top_stocks(self, obj):
        top = obj.stocks.select_related('stock').order_by('is_system', 'added_at')[:3]
        return [{'symbol': s.stock.symbol, 'name': s.stock.name} for s in top]


class SectorPortfolioDetailSerializer(serializers.ModelSerializer):
    stocks = SectorStockSerializer(many=True, read_only=True)
    stock_count = serializers.SerializerMethodField()

    class Meta:
        model = SectorPortfolio
        fields = ['id', 'name', 'slug', 'description', 'market', 'icon', 'is_active', 'stock_count', 'stocks', 'created_at']

    def get_stock_count(self, obj):
        return obj.stocks.count()


class AddStockToSectorSerializer(serializers.Serializer):
    stock_id = serializers.IntegerField()

    def validate_stock_id(self, value):
        try:
            Stock.objects.get(pk=value)
        except Stock.DoesNotExist:
            raise serializers.ValidationError("Stock with this ID does not exist.")
        return value
