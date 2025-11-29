# routers/__init__.py
"""
Routers da API FastAPI.
Organiza endpoints por funcionalidade.
"""

from .predictions import router as predictions_router
from .calculations import router as calculations_router
from .admin import router as admin_router

__all__ = [
    'predictions_router',
    'calculations_router',
    'admin_router'
]
