# config/__init__.py
"""
Configurações da aplicação Agro-AI.
Centraliza especificações agronômicas e calendários.
"""

from .crops import CROPS_SPECS
from .calendar import PLANTING_CALENDAR
from .constants import STATE_COORDS, LOGISTICS_DATA, PRICE_MULTIPLIERS, BRAZIL_CLIMATE_NORMS
from .settings import get_settings

__all__ = [
    'CROPS_SPECS',
    'PLANTING_CALENDAR',
    'STATE_COORDS',
    'LOGISTICS_DATA',
    'PRICE_MULTIPLIERS',
    'BRAZIL_CLIMATE_NORMS',
    'get_settings'
]
