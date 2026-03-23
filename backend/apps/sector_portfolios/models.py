from django.db import models
from django.conf import settings


class SectorPortfolio(models.Model):
    MARKET_CHOICES = [
        ('IN', 'Indian'),
        ('GLOBAL', 'Global'),
    ]

    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True)
    market = models.CharField(choices=MARKET_CHOICES, max_length=10)
    icon = models.CharField(max_length=50, blank=True)  # emoji or icon name
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['market', 'name']

    def __str__(self):
        return f"{self.name} ({self.market})"

    @property
    def stock_count(self):
        return self.stocks.count()


class SectorStock(models.Model):
    sector_portfolio = models.ForeignKey(
        SectorPortfolio, related_name='stocks', on_delete=models.CASCADE
    )
    stock = models.ForeignKey(
        'stocks.Stock', on_delete=models.CASCADE, related_name='sector_listings'
    )
    added_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL
    )
    is_system = models.BooleanField(default=True)  # False = user-submitted
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('sector_portfolio', 'stock')
        ordering = ['-is_system', 'added_at']

    def __str__(self):
        return f"{self.stock.symbol} in {self.sector_portfolio.name}"
