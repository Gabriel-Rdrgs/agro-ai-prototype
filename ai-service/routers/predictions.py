# ai-service/routers/predictions.py
from fastapi import APIRouter, HTTPException, Query
import math
from models.schemas import (
    BatchPredictionRequest, MarketScanRequest, SimulationRequest, ArbitrageRequest,
    PriceForecastResponse
)
from services.fuel_pricing import fuel_api
from services.arbitrage_calculator import arbitrage_calculator
from services.logistics import logistics_service
from services.price_forecast import price_forecast_service
from config.constants import STATE_COORDS
import logging
from datetime import datetime, timedelta
from config.crops import get_crop_specs
from services.storage_advisor import storage_advisor
import random

router = APIRouter()
logger = logging.getLogger(__name__)

# Definimos MAJOR_HUBS aqui para garantir que a função Scan tenha acesso
MAJOR_HUBS = {
    'SP': {'name': 'CEAGESP - SP', 'lat': -23.5369, 'lng': -46.7368},
    'MG': {'name': 'CEASA - MG (Contagem)', 'lat': -19.8837, 'lng': -44.0125},
    'RJ': {'name': 'CEASA - RJ (Irajá)', 'lat': -22.8256, 'lng': -43.3424},
    'PR': {'name': 'CEASA - PR (Curitiba)', 'lat': -25.5458, 'lng': -49.2885},
    'GO': {'name': 'CEASA - GO (Goiânia)', 'lat': -16.6346, 'lng': -49.2138},
    'BA': {'name': 'CEASA - BA (Salvador)', 'lat': -12.8727, 'lng': -38.4116},
    'PE': {'name': 'CEASA - PE (Recife)', 'lat': -8.0772, 'lng': -34.9392},
    'RS': {'name': 'CEASA - RS (P. Alegre)', 'lat': -30.0346, 'lng': -51.2177},
}

# --- 1. ROTA DE PREVISÃO DE PREÇOS (Prophet) ---
@router.get("/price-forecast", response_model=PriceForecastResponse)
async def get_price_forecast(
    product: str = Query(..., description="Nome do produto (ex: 'Tomate', 'Soja', 'Milho')"),
    region: str = Query(None, description="Código UF (ex: 'SP', 'MG'). Opcional, usa todos se não informado"),
    days: int = Query(30, ge=7, le=90, description="Quantos dias à frente prever (7-90)")
):
    """
    🔮 Previsão de preços usando Prophet (séries temporais).
    
    Retorna previsões futuras de preços com intervalos de confiança.
    Usa Prophet quando há dados suficientes, fallback para regressão polinomial.
    
    **Exemplo:**
    ```
    GET /api/v1/predict/price-forecast?product=Tomate&region=SP&days=30
    ```
    
    **Resposta:**
    ```json
    {
      "status": "success",
      "forecast": [
        {
          "date": "2025-12-10",
          "price": 4.65,
          "lower": 4.18,
          "upper": 5.12
        },
        ...
      ],
      "model_type": "prophet",
      "model_metrics": {
        "data_points": 90,
        "forecast_days": 30
      }
    }
    ```
    """
    try:
        logger.info(f"🔮 Previsão solicitada: {product}/{region or 'todas'} - {days} dias")
        
        result = price_forecast_service.forecast(
            product=product,
            region=region,
            days_ahead=days
        )
        
        if result['status'] == 'error':
            logger.warning(f"⚠️ Previsão falhou: {result.get('message', 'Erro desconhecido')}")
            raise HTTPException(
                status_code=503 if 'Dados insuficientes' in result.get('message', '') else 500,
                detail=result.get('message', 'Erro ao gerar previsão')
            )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erro crítico na previsão: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erro interno: {str(e)}")

# --- 2. ROTA DE COMBUSTÍVEL (Diesel) ---
@router.get("/fuel")
def get_fuel_prices():
    try:
        return fuel_api.fetch_current_prices()
    except Exception as e:
        logger.error(f"Erro Fuel: {e}")
        # Fallback para não quebrar o Dashboard
        return {"diesel": {"br": "6.00", "sp": "6.10"}}

# --- 2. ROTA DE ARMAZENAGEM (IA Climática) ---
@router.post("/storage")
async def predict_storage(request: SimulationRequest):
    """
    Simula viabilidade de armazenagem usando o StorageAdvisor (Padrão Custo Brasil).
    """
    try:
        # Delega para o especialista (agora assíncrono)
        return await storage_advisor.analyze(request)
    except AttributeError as e:
        # Erro específico de atributo faltando
        error_msg = str(e)
        logger.error(f"❌ Erro Storage (AttributeError): {error_msg}")
        logger.error(f"   Request recebido: product={request.product}, state={request.state}, lat={request.lat}, lng={request.lng}")
        logger.error(f"   Atributos disponíveis: {[attr for attr in dir(request) if not attr.startswith('_')]}")
        raise HTTPException(status_code=500, detail=f"Erro de atributo: {error_msg}. Verifique se todos os campos necessários foram enviados.")
    except Exception as e:
        logger.error(f"❌ Erro Storage: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    
# --- 3. ROTA BATCH (Slider Temporal do Mapa) ---
@router.post("/batch")
async def predict_batch(request: BatchPredictionRequest):
    """
    Processa previsões rápidas para múltiplos itens (Mapa).
    """
    results = {}
    for item in request.items:
        try:
            # Normalização de Preços
            curr = item.current_price
            if curr > 15: curr /= 20
            buy = item.buy_price
            if buy > 15: buy /= 20
            
            if curr <= 0: curr = 4.00
            if buy <= 0: buy = 2.50

            # Projeções Matemáticas
            d7_price = curr * 1.02 # +2% em 7 dias
            d30_price = curr * 1.08 # +8% em 30 dias
            
            results[item.id] = {
                "d7": {"sellPrice": round(d7_price, 2), "roi": round(((d7_price - buy)/buy)*100, 1)},
                "d30": {"sellPrice": round(d30_price, 2), "roi": round(((d30_price - buy)/buy)*100, 1)}
            }
        except Exception as e:
            # Fallback seguro com log para debug
            logger.warning(f"⚠️ Erro ao processar item {item.id}: {e}", exc_info=True)
            results[item.id] = {"d7": {"sellPrice": 0, "roi": 0}, "d30": {"sellPrice": 0, "roi": 0}}
    return results

# --- 4. ROTA SCAN (Botão Sugerir Destino) ---
@router.post("/market/scan")
async def market_scan(request: MarketScanRequest):
    """
    🔍 Scan Centralizado (v3.0): Usa a mesma matemática do Simulador.
    """
    try:
        logger.info(f"🔎 Scan Centralizado: {request.product} de {request.origin_state}")
        
        # 1. Normalização
        origin_uf = request.origin_state.strip().upper()[:2]
        ranking = []
        
        # 2. Área Padrão (10ha) para justificar frete de carga fechada
        AREA_STANDARD_HA = 10.0
        
        # 3. Importa Hubs da calculadora para não duplicar lista
        from services.arbitrage_calculator import MAJOR_HUBS
        
        # Define destinos: Hubs + SP + PR (referências de mercado) + mercado local
        destinos = set(list(MAJOR_HUBS.keys()) + ['SP', 'PR', 'MG', origin_uf])
        
        for dest_uf in destinos:
            # ✅ NÃO PULA MERCADO LOCAL: Pode ser vantajoso vender no próprio estado

            try:
                # 4. A MÁGICA DA CENTRALIZAÇÃO ✨
                # Cria um pedido idêntico ao do simulador manual
                calc_request = ArbitrageRequest(
                    product=request.product,
                    origin_state=origin_uf,
                    destination_state=dest_uf,
                    area_ha=AREA_STANDARD_HA,
                    planting_month=getattr(request, 'month', 1)
                )
                
                # Chama a FONTE DA VERDADE (ArbitrageCalculator)
                # Ela já tem a lógica de Kg, Fator Regional, Diesel e Frota
                result = arbitrage_calculator.calculate(calc_request)
                
                # 5. Extração dos Dados
                fin = result['financial']
                log = result['logistics']
                mkt = result['market']
                prod = result['production']
                
                # Filtros de Sanidade da Calculadora
                roi = fin['roi']
                # Ignora apenas prejuízo total extremo (-100%) ou lucro absurdo (>200%)
                # Mantém ROIs negativos moderados para comparação (ex: -28.7% vs 28.8%)
                if roi <= -100 or roi > 200: continue 

                ranking.append({
                    "destination": dest_uf,
                    "destination_name": MAJOR_HUBS.get(dest_uf, {}).get('name', f"Mercado {dest_uf}"),
                    
                    # Dados Reais vindos da Calculadora
                    "net_profit": fin['net_profit'],
                    "roi": roi,
                    "sell_price": mkt['predicted_sell_price'],
                    
                    # Custo Unitário de Frete (apenas para exibição na tabela)
                    # Total Logística / Volume Total
                    "freight": round(log['total_logistics_cost'] / prod['total_volume'], 2),
                    
                    "distance_km": int(result['analysis']['distance_km'])
                })

            except Exception:
                continue # Se um destino falhar, tenta o próximo

        # Ordena: Melhor ROI primeiro (maior ROI = melhor)
        ranking.sort(key=lambda x: x['roi'], reverse=True)
        
        # ✅ Pega o melhor (Top 1) - deve ser o maior ROI positivo, ou o menos negativo se todos forem negativos
        best = ranking[0] if ranking else None
        
        # Validação: Se o melhor tem ROI negativo, mas há opções positivas, algo está errado
        if best and best['roi'] < 0:
            # Procura se há algum ROI positivo no ranking
            positive_rois = [r for r in ranking if r['roi'] > 0]
            if positive_rois:
                logger.warning(f"⚠️ Melhor ROI é negativo ({best['roi']}%), mas há {len(positive_rois)} opções positivas. Usando a melhor positiva.")
                best = positive_rois[0]  # Pega o melhor ROI positivo
        
        if not best:
            # Fallback: sugere mercado local com ROI conservador
            best = {"destination": origin_uf, "roi": 0, "net_profit": 0, "destination_name": f"Mercado Local ({origin_uf})"}
            ranking.append(best)

        return {
            "status": "success", 
            "best_opportunity": best,
            "ranking": ranking[:5] # Retorna Top 5
        }

    except Exception as e:
        logger.error(f"❌ Erro Crítico Scan: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))