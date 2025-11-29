# routers/calculations.py
"""
Rotas de cálculos financeiros (ROI, Arbitragem).
Endpoints: /calc/*
"""

from fastapi import APIRouter, HTTPException
from datetime import datetime
import logging

from models.schemas import (
    ProductionRequest,
    ProductionAnalysisResponse,
    ArbitrageRequest,
    ArbitrageAnalysisResponse
)
from services.production_calculator import production_calculator
from services.arbitrage_calculator import arbitrage_calculator

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post('/production', response_model=ProductionAnalysisResponse)
def calculate_production_roi(data: ProductionRequest):
    """
    📊 Cálculo de ROI de Produção Local.
    
    Considera:
    - Janela de plantio ideal (document-2.pdf)
    - Ajuste de produtividade por região
    - Custos de produção
    
    **Retorna:**
    - ROI (%)
    - Lucro líquido
    - Produtividade ajustada
    - Análise de riscos
    
    **Exemplo:**
    ```
    {
      "product": "Tomate",
      "state": "SP",
      "area_ha": 10.0,
      "cost_per_ha": 25000.00,
      "expected_productivity": 300,
      "expected_sell_price": 100.00,
      "planting_month": 3
    }
    ```
    """
    try:
        logger.info(
            f"📊 Calculando ROI produção: {data.product} em {data.state}, "
            f"{data.area_ha}ha, mês {data.planting_month}"
        )
        
        result = production_calculator.calculate_roi(data)
        
        logger.info(f"✅ ROI calculado: {result['roi']:.1f}%")
        
        return result
    
    except Exception as e:
        logger.error(f"❌ Erro no cálculo de produção: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao calcular ROI: {str(e)}"
        )


@router.post('/arbitrage', response_model=ArbitrageAnalysisResponse)
def calculate_arbitrage(data: ArbitrageRequest):
    """
    🌍 Cálculo de Arbitragem Interestadual.
    
    Analisa viabilidade de produzir em A e vender em B.
    
    **Considera:**
    - Produção na origem (com ajuste climático)
    - Logística (frete com preços REAIS Petrobras)
    - Preço de venda no destino (com sazonalidade)
    
    **Retorna:**
    - ROI completo
    - Breakdown de custos
    - Análise de riscos
    
    **Exemplo:**
    ```
    {
      "product": "Tomate",
      "origin_state": "GO",
      "destination_state": "SP",
      "planting_month": 4,
      "area_ha": 20.0
    }
    ```
    """
    try:
        logger.info(
            f"🌍 Calculando arbitragem: {data.product} | "
            f"{data.origin_state} → {data.destination_state}"
        )
        
        result = arbitrage_calculator.calculate(data)
        
        logger.info(f"✅ Arbitragem calculada: ROI {result['financial']['roi']:.1f}%")
        
        return result
    
    except Exception as e:
        logger.error(f"❌ Erro no cálculo de arbitragem: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao calcular arbitragem: {str(e)}"
        )


@router.get('/health')
def health_check():
    """
    🏥 Health check do módulo de cálculos.
    """
    return {
        'module': 'calculations',
        'status': 'healthy',
        'calculators': {
            'production': 'online',
            'arbitrage': 'online',
            'fuel_pricing': 'online'
        },
        'timestamp': datetime.now().isoformat()
    }
