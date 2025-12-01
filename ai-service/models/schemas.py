# models/schemas.py
"""
Modelos Pydantic para validação de requisições e respostas.
"""

from pydantic import BaseModel, Field, validator
from typing import List, Optional
from datetime import datetime


# ========================================
# REQUEST MODELS
# ========================================

class SimulationRequest(BaseModel):
    """Requisição para simulação de armazenagem"""
    product: str = Field(..., description="Nome do produto (Tomate, Soja, Milho)")
    state: str = Field(default='SP', description="Estado (código UF)")
    lat: Optional[float] = Field(None, description="Latitude da localização")
    lng: Optional[float] = Field(None, description="Longitude da localização")
    current_price: float = Field(..., gt=0, description="Preço atual (R$/unidade)")
    buy_price: float = Field(..., gt=0, description="Preço pago ao produtor (Base de Custo)")
    accumulated_rainfall: Optional[float] = Field(500.0, description="Chuva acumulada no ciclo (mm)")
    planting_date: Optional[str] = Field(None, description="Data de plantio (YYYY-MM-DD)")
    storage_cost_per_day: float = Field(..., ge=0, description="Custo armazenagem diário")
    risk_factor: float = Field(default=1.0, ge=0, le=3, description="Fator de risco (0-3)")
    daily_rain: Optional[List[float]] = Field(None, description="Previsão chuva diária (mm)")
    daily_temp_max: Optional[List[float]] = Field(None, description="Temp máxima diária (°C)")
    daily_temp_min: Optional[List[float]] = Field(None, description="Temp mínima diária (°C)")
    daily_sun: Optional[List[float]] = Field(None, description="Radiação solar diária (MJ/m²)")
    
    @validator('product')
    def validate_product(cls, v):
        allowed = ['Tomate', 'Soja', 'Milho']
        if v.strip().capitalize() not in allowed:
            raise ValueError(f"Produto deve ser um de: {', '.join(allowed)}")
        return v.strip().capitalize()
    
    @validator('state')
    def validate_state(cls, v):
        return v.strip().upper()


class ProductionRequest(BaseModel):
    """Requisição para cálculo de ROI de produção"""
    product: str
    state: str
    area_ha: float = Field(..., gt=0, description="Área em hectares")
    cost_per_ha: float = Field(..., gt=0, description="Custo por hectare (R$)")
    expected_productivity: float = Field(..., gt=0, description="Produtividade esperada (un/ha)")
    expected_sell_price: float = Field(..., gt=0, description="Preço de venda esperado (R$)")
    planting_month: int = Field(..., ge=1, le=12, description="Mês de plantio (1-12)")


class ArbitrageRequest(BaseModel):
    """Requisição para cálculo de arbitragem"""
    product: str
    origin_state: str
    destination_state: str
    planting_month: int = Field(..., ge=1, le=12)
    area_ha: float = Field(..., gt=0)


class MarketScanRequest(BaseModel):
    """Requisição para varredura de mercado"""
    product: str
    origin_state: str
    volume: float = Field(default=1000.0, gt=0, description="Volume em unidades")
    month: Optional[int] = Field(None, ge=1, le=12, description="Mês de colheita")


# ========================================
# RESPONSE MODELS
# ========================================

class StorageRecommendation(BaseModel):
    """Resposta de recomendação de armazenagem"""
    action: str
    best_day_date: str
    projected_profit: float
    confidence_score: float
    risk_event: str


class ChartData(BaseModel):
    """Dados para gráficos"""
    labels: List[str]
    prices: List[float]
    costs: List[float]


class StorageAnalysisResponse(BaseModel):
    """Resposta completa de análise de armazenagem"""
    chart_data: ChartData
    recommendation: StorageRecommendation


class ProductionAnalysisResponse(BaseModel):
    """Resposta de análise de produção"""
    adjusted_productivity: float
    productivity_loss_pct: float
    net_profit: float
    roi: float
    risk_analysis: List[str]


class ArbitrageAnalysisResponse(BaseModel):
    """Resposta de análise de arbitragem"""
    analysis: dict
    production: dict
    logistics: dict
    market: dict
    financial: dict
    risks: List[str]


# ========================================
# INTERNAL MODELS
# ========================================

class ClimateData(BaseModel):
    """Dados climáticos agregados"""
    monthly_rain_avg: float
    solar_mj_avg: float
    forecast_rain: List[float]
    temperature_max: Optional[float] = None
    temperature_min: Optional[float] = None


class FuelPriceData(BaseModel):
    """Dados de preço de combustível"""
    state: str
    price_per_liter: float
    data_coleta: str
    fonte: str = "Petrobras"
    confidence: float = 0.98
