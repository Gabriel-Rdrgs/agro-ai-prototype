# services/climate/__init__.py
"""
Módulo de inteligência climática.
Exporta APIs principais para uso externo.
"""

from .intelligence import (
    ClimateIntelligence,
    climate_api,
    get_rain_history,
    get_solar_radiation,
    get_advanced_agrometeo
)

from .risk_analyzer import (
    TomatoRiskAnalyzer,
    MarketPriceUpdater,
    tomato_risk_analyzer,
    market_price_updater,
    calculate_tomato_risk,
    update_market_prices
)

__all__ = [
    # Classes
    'ClimateIntelligence',
    'TomatoRiskAnalyzer',
    'MarketPriceUpdater',
    
    # Instâncias (singletons)
    'climate_api',
    'tomato_risk_analyzer',
    'market_price_updater',
    
    # Funções helpers
    'get_rain_history',
    'get_solar_radiation',
    'get_advanced_agrometeo',
    'calculate_tomato_risk',
    'update_market_prices',
]
