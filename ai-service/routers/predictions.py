# ai-service/routers/predictions.py
"""
Rotas de predição e inteligência de mercado.
Endpoints: /predict/*
"""

from fastapi import APIRouter, HTTPException
from typing import List, Optional
from pydantic import BaseModel
import logging

# 1. IMPORTAÇÕES
from models.schemas import SimulationRequest, StorageAnalysisResponse
from services.storage_advisor import storage_advisor
from services.fuel_pricing import fuel_api
from services.logistics import logistics_service
from sqlalchemy import text
from utils.database import get_engine
from models.schemas import MarketScanRequest

logger = logging.getLogger(__name__)

router = APIRouter()

# --- MODELOS LOCAIS PARA BATCH ---
class BatchItem(BaseModel):
    id: int
    product: str
    state: str
    current_price: float
    buy_price: float # Esse campo já existia, mas não estava sendo usado

class BatchRequest(BaseModel):
    items: List[BatchItem]

# --- ROTA 1: Armazenagem (Detalhada) ---
@router.post('/storage', response_model=StorageAnalysisResponse)
def predict_storage_viability(data: SimulationRequest):
    """
    🧠 Predição de viabilidade de armazenagem (IA).
    """
    try:
        # Log simplificado
        logger.info(f"📦 Storage Check: {data.product} em {data.state}")
        result = storage_advisor.predict_storage_viability(data)
        return result
    
    except Exception as e:
        logger.error(f"❌ Erro na predição de armazenagem: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# --- ROTA 2: Previsão em Lote (Mapa) - CORRIGIDA ---
@router.post('/batch')
def predict_batch(data: BatchRequest):
    """
    🗺️ Mapa: Define Melhor Destino (Logística) + Lucro Real (Storage).
    """
    try:
        results = {}
        for item in data.items:
            try:
                # 1. Inteligência Logística (Usa lat/lng reais do item se houver)
                # O item do batch precisa ter lat/lng, se não tiver, o logistics.py resolve com fallback
                lat = getattr(item, 'lat', 0) 
                lng = getattr(item, 'lng', 0)

                best_route = logistics_service.find_best_route(
                    item.product, item.state, lat, lng, item.current_price
                )
                
                # 2. Definição de Preços (Unificada)
                target_sell_price = best_route['net_result']
                
                # 3. Simulação
                sim_req = SimulationRequest(
                    product=item.product,
                    state=item.state,
                    current_price=target_sell_price, # Venda no MELHOR destino
                    buy_price=0, # Deixa o StorageAdvisor calcular os 70%
                    storage_cost_per_day=0.03,
                    accumulated_rainfall=500,
                    lat=lat, lng=lng
                )
                
                analysis = storage_advisor.predict_storage_viability(sim_req)
                
                # Extrai Timeline
                prices = analysis["chart_data"]["prices"]
                costs = analysis["chart_data"]["costs"]
                
                profit_0 = prices[0] - costs[0]
                profit_7 = prices[7] - costs[7] if len(prices) > 7 else profit_0
                profit_30 = prices[-1] - costs[-1]
                
                results[item.id] = {
                    "action": analysis["recommendation"]["action"],
                    "best_dest": best_route['dest_name'],
                    "timeline": {
                        "0": {"roi": round((profit_0/costs[0])*100, 1), "profit": round(profit_0, 2), "price": prices[0]},
                        "7": {"roi": round((profit_7/costs[7])*100, 1), "profit": round(profit_7, 2), "price": prices[7]},
                        "30": {"roi": round((profit_30/costs[-1])*100, 1), "profit": round(profit_30, 2), "price": prices[-1]}
                    },
                    "confidence": analysis["recommendation"]["confidence"]
                }
            except Exception as e:
                # logger.error(f"Erro item {item.id}: {e}")
                results[item.id] = {"error": "Falha"}
                
        return results
    except Exception as e:
        logger.error(f"❌ Erro Batch: {e}")
        raise HTTPException(status_code=500, detail="Erro interno")

# --- ROTA 3: Combustível ---
@router.get('/fuel')
async def get_fuel_prices():
    """
    ⛽ Retorna preços médios de combustível por estado.
    """
    try:
        prices = fuel_api.fetch_current_prices()  
        
        if not prices:
            raise HTTPException(status_code=503, detail="Serviço indisponível")
            
        return prices

    except Exception as e:
        logger.error(f"❌ Erro ao buscar combustível: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno")
@router.post('/market/scan')
def scan_market_opportunities(data: MarketScanRequest):
    """
    📡 Radar: Retorna Ranking de Destinos para o Frontend.
    """
    try:
        # 1. Recupera Preço Base
        engine = get_engine()
        base_price = 4.00
        with engine.connect() as conn:
            res = conn.execute(text(
                'SELECT "sellPrice" FROM "Opportunity" WHERE product = :p AND state = :s ORDER BY "createdAt" DESC LIMIT 1'
            ), {"p": data.product, "s": data.origin_state}).fetchone()
            if res: base_price = float(res[0])

        # 2. Gera Ranking Logístico (Todas as rotas ordenadas)
        # Usa coordenadas padrão do estado se não vierem no request
        from config.constants import STATE_COORDS
        lat, lng = STATE_COORDS.get(data.origin_state, (-15.0, -48.0))
        
        all_routes = logistics_service.analyze_routes(
            data.product, data.origin_state, lat, lng, base_price
        )
        
        if not all_routes:
            raise HTTPException(status_code=404, detail="Nenhuma rota encontrada")

        best_route = all_routes[0]
        
        # 3. Formata para o Frontend (RoiCalculator.jsx espera 'ranking' e 'best_opportunity')
        # Estimativa de ROI (Custo base = 70% do preço local)
        base_cost = base_price * 0.70
        
        formatted_ranking = []
        for r in all_routes:
            profit = r['net_result'] - base_cost
            roi = (profit / base_cost) * 100 if base_cost > 0 else 0
            
            formatted_ranking.append({
                "destination": r['dest_state'], # Para o dropdown
                "dest_name": r['dest_name'],    # Para exibição
                "net_profit": round(profit * data.volume, 2), # Lucro total no volume
                "roi": round(roi, 1),
                "price": r['net_result']
            })

        return {
            "status": "success",
            # Objeto do vencedor para preencher o input
            "best_opportunity": formatted_ranking[0],
            # Lista completa para a tabela Top 5
            "ranking": formatted_ranking
        }

    except Exception as e:
        logger.error(f"❌ Erro Market Scan: {e}")
        raise HTTPException(status_code=500, detail=str(e))