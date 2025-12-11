# routers/calculations.py
"""
Rotas de cálculos financeiros (ROI, Arbitragem).
Endpoints: /calc/*
"""

from fastapi import APIRouter, HTTPException
from datetime import datetime
import logging
from typing import Dict, Any

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


@router.post('/opportunity/recalculate')
def recalculate_opportunity_roi(opportunity_data: Dict[str, Any]):
    """
    🔄 Recalcula ROI de uma oportunidade específica.
    
    Recebe dados básicos da oportunidade e retorna ROI completo calculado pelo Python.
    
    **Payload:**
    ```
    {
        "product": "Tomate",
        "state": "SP",
        "city": "São Paulo",
        "buyPrice": 3.50,
        "lat": -23.5505,
        "lng": -46.6333
    }
    ```
    
    **Retorna:**
    ```
    {
        "roi": 120.5,
        "sell_price": 7.70,
        "freight": 0.80,
        "destination_name": "São Paulo - SP",
        "destination_state": "SP",
        "calculated_by": "python"
    }
    ```
    """
    try:
        product = opportunity_data.get('product', 'Tomate')
        state = opportunity_data.get('state', 'SP')
        buy_price = float(opportunity_data.get('buyPrice', 0))
        lat = float(opportunity_data.get('lat', 0))
        lng = float(opportunity_data.get('lng', 0))
        
        logger.info(f"🔄 Recalculando ROI: {product} em {state}")
        
        # Monta o dicionário que find_best_route espera
        opp_dict = {
            'product': product,
            'state': state,
            'buyPrice': buy_price,
            'lat': lat,
            'lng': lng
        }
        
        # Chama o Python para calcular
        best_route = arbitrage_calculator.find_best_route(opp_dict)
        
        if not best_route or best_route.get('roi', 0) == 0:
            logger.warning(f"⚠️ Nenhuma rota lucrativa encontrada para {product} em {state}")
            return {
                'roi': 0.0,
                'sell_price': buy_price,  # Fallback: preço de compra
                'freight': 0.0,
                'destination_name': f'Mercado Local ({state})',
                'destination_state': state,
                'calculated_by': 'python',
                'warning': 'Nenhuma rota lucrativa encontrada'
            }
        
        return {
            'roi': best_route.get('roi', 0.0),
            'sell_price': best_route.get('sell_price', buy_price),
            'freight': best_route.get('freight_cost', 0.0),
            'destination_name': best_route.get('destination_name', f'Mercado {state}'),
            'destination_state': best_route.get('destination_state', state),
            'distance_km': best_route.get('distance_km', 0),
            'calculated_by': 'python'
        }
    
    except Exception as e:
        logger.error(f"❌ Erro ao recalcular ROI: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao recalcular ROI: {str(e)}"
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
