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


@router.post('/scenario/simulate')
def simulate_scenario(request: Dict[str, Any]):
    """
    🎯 Simula cenário alterando variáveis e recalculando ROI.
    
    Aplica mudanças em:
    - Dólar (impacta custos de produção)
    - Frete (impacta logística)
    - Preços de compra/venda
    - Clima (chuva, temperatura)
    
    **Payload:**
    ```
    {
        "opportunity_id": 123,
        "product": "Tomate",
        "origin_state": "GO",
        "destination_state": "SP",
        "area_ha": 10.0,
        "scenarios": {
            "dollar_change": 10,  # +10%
            "freight_change": 20,  # +20%
            "buy_price_change": -5,  # -5%
            "sell_price_change": 0,
            "rain_mm": 200,  # +200mm
            "temperature_change": 3  # +3°C
        }
    }
    ```
    
    **Retorna:**
    ```
    {
        "roi": 85.5,  # Novo ROI calculado
        "original_roi": 120.3,  # ROI original
        "roi_change": -34.8,  # Mudança em pontos percentuais
        "recommendation": "COMPRAR",  # Recomendação atualizada
        "sensitivity": {
            "message": "ROI é mais sensível a: Preço de Venda (45%), Frete (30%)"
        }
    }
    ```
    """
    try:
        from models.schemas import ArbitrageRequest
        from services.recommendation_engine import recommendation_engine
        
        opportunity_id = request.get('opportunity_id')
        product = request.get('product', 'Tomate')
        origin_state = request.get('origin_state', 'SP')
        destination_state = request.get('destination_state', 'SP')
        area_ha = request.get('area_ha', 10.0)
        scenarios = request.get('scenarios', {})
        
        logger.info(f"🎯 Simulando cenário para oportunidade {opportunity_id}")
        
        # Busca dados originais da oportunidade
        from utils.database import get_engine
        from sqlalchemy import text
        
        engine = get_engine()
        original_roi = None
        original_buy_price = None
        original_sell_price = None
        
        if opportunity_id:
            try:
                with engine.connect() as conn:
                    query = text('''
                        SELECT "roi", "buyPrice", "sellPrice" 
                        FROM "Opportunity" 
                        WHERE id = :id
                    ''')
                    result = conn.execute(query, {"id": opportunity_id}).fetchone()
                    if result:
                        original_roi = float(result[0]) if result[0] else None
                        original_buy_price = float(result[1]) if result[1] else None
                        original_sell_price = float(result[2]) if result[2] else None
            except Exception as e:
                logger.warning(f"⚠️ Erro ao buscar oportunidade original: {e}")
        
        # Aplica mudanças aos preços
        adjusted_buy_price = original_buy_price
        adjusted_sell_price = original_sell_price
        
        if original_buy_price and scenarios.get('buy_price_change'):
            change_pct = scenarios['buy_price_change'] / 100
            adjusted_buy_price = original_buy_price * (1 + change_pct)
        
        if original_sell_price and scenarios.get('sell_price_change'):
            change_pct = scenarios['sell_price_change'] / 100
            adjusted_sell_price = original_sell_price * (1 + change_pct)
        
        # Cria request de arbitragem com preços ajustados
        # Nota: Para simulação completa, precisaríamos modificar o ArbitrageCalculator
        # Por enquanto, fazemos uma aproximação ajustando o ROI proporcionalmente
        
        # Calcula impacto aproximado das mudanças
        dollar_impact = scenarios.get('dollar_change', 0) * 0.3  # Dólar impacta ~30% dos custos
        freight_impact = scenarios.get('freight_change', 0) * 0.4  # Frete impacta ~40% dos custos
        buy_price_impact = scenarios.get('buy_price_change', 0) * 0.2  # Preço compra impacta ~20%
        sell_price_impact = scenarios.get('sell_price_change', 0) * 0.5  # Preço venda impacta ~50%
        
        # Impacto total aproximado no ROI
        total_impact = dollar_impact + freight_impact + buy_price_impact + sell_price_impact
        
        # ROI simulado (aproximação)
        simulated_roi = (original_roi or 0) + total_impact
        
        # Busca recomendação atualizada
        recommendation = None
        try:
            rec_result = recommendation_engine.analyze_opportunity(
                roi=simulated_roi,
                roi_d7=None,
                roi_d30=None,
                quality_score=None,
                shelf_life_days=None,
                has_extreme_events=scenarios.get('rain_mm', 0) > 50 or scenarios.get('temperature_change', 0) > 3,
                extreme_event_severity='high' if (scenarios.get('rain_mm', 0) > 100 or scenarios.get('temperature_change', 0) > 3) else None,
                is_ideal_planting_month=None,
                is_risk_planting_month=None,
                market_trend=None,
                current_price=adjusted_sell_price,
                buy_price=adjusted_buy_price
            )
            recommendation = rec_result.get('recommendation')
        except Exception as e:
            logger.warning(f"⚠️ Erro ao gerar recomendação: {e}")
        
        # Análise de sensibilidade simplificada
        impacts = {
            'sell_price': abs(sell_price_impact),
            'freight': abs(freight_impact),
            'dollar': abs(dollar_impact),
            'buy_price': abs(buy_price_impact)
        }
        max_impact = max(impacts.items(), key=lambda x: x[1])
        
        sensitivity_message = f"ROI é mais sensível a: {max_impact[0].replace('_', ' ').title()} ({max_impact[1]:.1f}pp)"
        
        result = {
            'roi': round(simulated_roi, 1),
            'original_roi': round(original_roi, 1) if original_roi else None,
            'roi_change': round(total_impact, 1),
            'recommendation': recommendation,
            'sensitivity': {
                'message': sensitivity_message,
                'impacts': impacts
            },
            'adjusted_prices': {
                'buy_price': round(adjusted_buy_price, 2) if adjusted_buy_price else None,
                'sell_price': round(adjusted_sell_price, 2) if adjusted_sell_price else None
            }
        }
        
        logger.info(f"✅ Simulação concluída: ROI {simulated_roi:.1f}% (original: {original_roi:.1f}%)")
        
        return result
        
    except Exception as e:
        logger.error(f"❌ Erro ao simular cenário: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao simular cenário: {str(e)}"
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
