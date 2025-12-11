# ai-service/models/schemas.py
from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any

# ========================================
# REQUEST MODELS (Entradas)
# ========================================

# --- 1. MODELOS DE CULTURA E PREÇO ---
class CropData(BaseModel):
    product: str
    state: str
    planting_date: str 

class PriceData(BaseModel):
    product: str
    current_price: float
    history: List[float] = []

# --- 2. SIMULAÇÃO DE ARMAZENAGEM (IA) ---
class SimulationRequest(BaseModel):
    """Requisição para simulação de armazenagem"""
    product: str = Field(..., description="Nome do produto")
    state: str = Field(default='SP', description="Estado")
    
    # Campos Geográficos e Numéricos (Permissivos com ge=0 ou defaults)
    lat: Optional[float] = 0.0
    lng: Optional[float] = 0.0
    current_price: float = 0.0
    buy_price: float = 0.0
    accumulated_rainfall: Optional[float] = 0.0
    planting_date: Optional[str] = None
    storage_cost_per_day: float = 0.03
    risk_factor: float = 1.0
    
    # Dados climáticos opcionais
    daily_rain: Optional[List[float]] = []
    daily_temp_max: Optional[List[float]] = []
    daily_temp_min: Optional[List[float]] = []
    daily_sun: Optional[List[float]] = []

    @validator('state')
    def validate_state(cls, v):
        return v.strip().upper()

# Alias para manter compatibilidade
StorageAnalysisRequest = SimulationRequest

# --- 3. CALCULADORAS (Produção e Arbitragem) ---
class ProductionRequest(BaseModel):
    """Requisição para cálculo de ROI de produção"""
    product: str
    state: str
    area_ha: float = Field(..., gt=0)
    cost_per_ha: float = Field(..., gt=0)
    expected_productivity: float = Field(..., gt=0)
    expected_sell_price: float = Field(..., gt=0)
    planting_month: int = Field(..., ge=1, le=12)

class ArbitrageRequest(BaseModel):
    """Requisição para cálculo de arbitragem"""
    product: str
    origin_state: str
    destination_state: str
    planting_month: int = 1
    area_ha: float = 10.0

# --- 4. SLIDER / PROCESSAMENTO EM LOTE (BATCH) ---
class BatchItem(BaseModel):
    id: int
    product: str
    state: str
    
    # Valores permissivos (aceitam 0 para evitar erro 422)
    current_price: float = 0.0
    buy_price: float = 0.0
    
    # Campos Opcionais
    lat: Optional[float] = 0.0
    lng: Optional[float] = 0.0
    accumulated_rainfall: Optional[float] = 0.0
    storage_cost_per_day: Optional[float] = 0.03

class BatchPredictionRequest(BaseModel):
    items: List[BatchItem]

class MarketScanRequest(BaseModel):
    product: str = "Tomate"
    origin_state: str = "SP"
    volume: float = 1000.0
    month: Optional[int] = None

# --- 5. RECOMENDAÇÃO AUTOMÁTICA ---
class RecommendationRequest(BaseModel):
    """Requisição para análise de recomendação automática"""
    product: str
    state: str
    roi: Optional[float] = None
    roi_d7: Optional[float] = None
    roi_d30: Optional[float] = None
    quality_score: Optional[float] = None
    shelf_life_days: Optional[int] = None
    has_extreme_events: bool = False
    extreme_event_severity: Optional[str] = None
    is_ideal_planting_month: Optional[bool] = None
    is_risk_planting_month: Optional[bool] = None
    market_trend: Optional[str] = None
    current_price: Optional[float] = None
    buy_price: Optional[float] = None


# ========================================
# RESPONSE MODELS (Saídas)
# ========================================

class RecommendationResponse(BaseModel):
    action: str
    best_day_date: str
    projected_profit: float
    confidence_score: float
    risk_event: Optional[str] = None

StorageRecommendation = RecommendationResponse

class ChartData(BaseModel):
    labels: List[str]
    prices: List[float]
    costs: List[float]

class StorageAnalysisResponse(BaseModel):
    chart_data: ChartData
    recommendation: RecommendationResponse

class ProductionAnalysisResponse(BaseModel):
    roi: float
    net_profit: float
    risk_analysis: List[str]
    adjusted_productivity: float = 0.0
    productivity_loss_pct: float = 0.0
    total_cost: float = 0.0
    gross_revenue: float = 0.0
    productivity: float = 0.0 

class ArbitrageAnalysisResponse(BaseModel):
    financial: Dict[str, float]
    logistics: Dict[str, Any]
    production: Dict[str, float]
    market: Dict[str, float]
    analysis: Dict[str, Any]
    risks: List[str]


# ========================================
# INTERNAL MODELS
# ========================================

class ClimateData(BaseModel):
    monthly_rain_avg: float
    solar_mj_avg: float
    forecast_rain: List[float]
    temperature_max: Optional[float] = None
    temperature_min: Optional[float] = None

class FuelPriceData(BaseModel):
    state: str
    price_per_liter: float
    data_coleta: str
    fonte: str = "Petrobras"
    confidence: float = 0.98

# ========================================
# PRICE FORECAST MODELS
# ========================================

class PriceForecastItem(BaseModel):
    """Item individual de previsão de preço"""
    date: str
    price: float
    lower: float  # Intervalo inferior (80% confiança)
    upper: float   # Intervalo superior (80% confiança)

class PriceForecastResponse(BaseModel):
    """Resposta completa de previsão de preços"""
    status: str
    forecast: List[PriceForecastItem]
    forecast_model: Optional[str] = None  # 'prophet' ou 'polynomial_regression_fallback'
    metrics: Optional[Dict[str, Any]] = None
    message: Optional[str] = None
    suggestion: Optional[str] = None