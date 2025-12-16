# ai-service/routers/predictions.py
from fastapi import APIRouter, HTTPException, Query
import math
from models.schemas import (
    BatchPredictionRequest, MarketScanRequest, SimulationRequest, ArbitrageRequest,
    PriceForecastResponse, RecommendationRequest
)
from services.fuel_pricing import fuel_api
from services.arbitrage_calculator import arbitrage_calculator, REGIONAL_FACTORS
from services.logistics import logistics_service
from services.price_forecast import price_forecast_service
from config.constants import STATE_COORDS
import logging
from datetime import datetime, timedelta
from config.crops import get_crop_specs
from services.storage_advisor import storage_advisor
from services.recommendation_engine import recommendation_engine
from utils.cache import CacheManager
import random
import hashlib
import json

router = APIRouter()
logger = logging.getLogger(__name__)

# ✅ Cache para endpoint /batch (evita reprocessar mesmas oportunidades)
batch_cache = CacheManager(ttl_seconds=300)  # 5 minutos (previsões mudam com frequência)

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
def _calculate_complete_roi(opportunity: dict, projected_sell_price: float) -> float:
    """
    Calcula ROI completo de produção usando preço futuro projetado.
    
    Usa a mesma lógica do arbitrage_calculator.find_best_route, mas com preço futuro.
    Considera: produção, frete, embalagem, taxas de mercado (17%), quebra técnica.
    
    Args:
        opportunity: Dict com dados da oportunidade (product, state, lat, lng, buyPrice, etc.)
        projected_sell_price: Preço de venda futuro projetado (R$/kg)
    
    Returns:
        ROI completo (float) ou 0.0 se erro
    """
    try:
        import math
        from config.crops import get_crop_specs
        # REGIONAL_FACTORS já importado no topo, MAJOR_HUBS definido neste arquivo
        
        product_name = opportunity.get('product', 'Tomate')
        origin_state = opportunity.get('state', 'SP')
        buy_price_kg = float(opportunity.get('buyPrice', 0))
        
        # Validação: loga se encontrar preço suspeito (não altera mais)
        # Após migração, todos os dados devem estar em R$/kg
        if buy_price_kg > 15:
            logger.warning(
                f"⚠️ buyPrice suspeito (R$ {buy_price_kg}) para {product_name}/{origin_state} - "
                f"possível dado legado em caixa. Execute migrate_units_to_kg.py se necessário."
            )
        
        if buy_price_kg <= 0:
            buy_price_kg = 2.50
        
        # 1. Configuração de produção
        specs = get_crop_specs(product_name)
        region_factor = REGIONAL_FACTORS.get(origin_state, REGIONAL_FACTORS['DEFAULT'])
        
        area_ha_standard = 10.0
        base_prod_cx = specs.get('base_productivity', 300)
        unit_weight = specs.get('unit_weight_kg', 20.0)
        
        real_productivity_kg_ha = base_prod_cx * region_factor * unit_weight
        total_volume_kg = area_ha_standard * real_productivity_kg_ha
        
        # Custo de produção unitário (R$/kg)
        base_cost_ha = specs.get('base_cost_ha', 25000)
        production_cost_unit = base_cost_ha / real_productivity_kg_ha
        total_production_cost = total_volume_kg * production_cost_unit
        
        # 2. Logística (usa destino atual da oportunidade ou melhor destino)
        orig_lat = float(opportunity.get('lat', -15.7))
        orig_lng = float(opportunity.get('lng', -47.9))
        
        # Tenta usar o destino salvo na oportunidade
        destination_state = opportunity.get('destination', {}).get('state') or opportunity.get('sellLocation', 'SP')
        dest_info = MAJOR_HUBS.get(destination_state, MAJOR_HUBS.get('SP', {'lat': -23.55, 'lng': -46.63}))
        
        route = logistics_service.calculate_freight(
            orig_lat, orig_lng, 
            dest_info['lat'], dest_info['lng']
        )
        
        truck_capacity_kg = 15000.0
        trips_needed = math.ceil(total_volume_kg / truck_capacity_kg)
        total_freight_cost = route['total_cost'] * trips_needed
        
        # 3. Cálculo completo de ROI (mesma lógica do find_best_route)
        distance_km = route['distance_km']
        breakage_pct = 0.05 + (distance_km / 50000)
        if breakage_pct > 0.15:
            breakage_pct = 0.15
        
        volume_lost = total_volume_kg * breakage_pct
        effective_volume_sold = total_volume_kg - volume_lost
        
        # Receita bruta com preço futuro
        gross_revenue = effective_volume_sold * projected_sell_price
        
        # Custos de comercialização (17% CEASA)
        market_fees_pct = 0.17
        market_cost = gross_revenue * market_fees_pct
        
        # Custo de embalagem
        packaging_cost = (total_volume_kg / unit_weight) * 3.50
        
        # Custo total operacional
        total_op_cost = (
            total_production_cost +
            total_freight_cost +
            packaging_cost +
            market_cost
        )
        
        # Lucro líquido e ROI
        net_profit = gross_revenue - total_op_cost
        roi = (net_profit / total_op_cost) * 100 if total_op_cost > 0 else 0
        
        # Filtro de sanidade (ROI > 300% é suspeito)
        if roi > 300:
            logger.warning(f"⚠️ ROI futuro suspeito ({roi:.1f}%) para {product_name}/{origin_state}. Limitando a 300%.")
            roi = 300.0
        
        return round(roi, 1)
        
    except Exception as e:
        logger.error(f"❌ Erro calculando ROI completo futuro: {e}", exc_info=True)
        return 0.0

@router.post("/batch")
async def predict_batch(request: BatchPredictionRequest):
    """
    Processa previsões rápidas para múltiplos itens (Mapa).
    
    ✅ CORRIGIDO: Agora usa cálculo completo de ROI de produção (mesmo do "hoje")
    em vez de fórmula simples de arbitragem.
    
    ✅ OTIMIZADO: Usa cache para evitar reprocessar mesmas oportunidades.
    """
    # ✅ Gera chave de cache baseada no conteúdo da requisição
    cache_key_data = {
        'items': [
            {
                'id': item.id,
                'product': item.product,
                'state': getattr(item, 'state', 'SP'),
                'current_price': round(item.current_price, 2),
                'buy_price': round(item.buy_price, 2)
            }
            for item in request.items
        ]
    }
    cache_key = f"batch_{hashlib.md5(json.dumps(cache_key_data, sort_keys=True).encode()).hexdigest()}"
    
    # Verifica cache
    cached_result = batch_cache.get(cache_key)
    if cached_result:
        logger.debug(f"✅ Cache HIT para /batch ({len(request.items)} itens)")
        return cached_result
    
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

            # ✅ MELHORADO: Usa Prophet com processamento paralelo e logs detalhados
            origin_state = item.state if hasattr(item, 'state') else 'SP'
            
            # Valores padrão (fallback se Prophet falhar ou demorar)
            d7_price = curr * 1.02   # +2% em 7 dias (fallback conservador)
            d30_price = curr * 1.08  # +8% em 30 dias (fallback conservador)
            
            # ✅ NOVO: Tenta usar Prophet com processamento paralelo
            try:
                import concurrent.futures
                
                def get_forecast_7d():
                    """Busca previsão de 7 dias"""
                    try:
                        result = price_forecast_service.forecast(
                            product=item.product,
                            region=origin_state,
                            days_ahead=7
                        )
                        if result.get('status') == 'success' and result.get('forecast'):
                            forecast_list = result['forecast']
                            if len(forecast_list) > 0:
                                # Pega o último preço previsto (dia 7)
                                last_price = forecast_list[-1].get('price')
                                if last_price and last_price > 0:
                                    logger.info(f"✅ Prophet 7d: {item.product}/{origin_state} → R$ {last_price:.2f} (modelo: {result.get('forecast_model', 'unknown')})")
                                    return last_price
                        # Se chegou aqui, Prophet não retornou dados válidos
                        logger.debug(f"⚠️ Prophet 7d: status={result.get('status')}, forecast_len={len(result.get('forecast', []))}")
                    except Exception as e:
                        logger.warning(f"⚠️ Prophet 7d falhou para {item.product}/{origin_state}: {str(e)[:100]}")
                    return None
                
                def get_forecast_30d():
                    """Busca previsão de 30 dias"""
                    try:
                        result = price_forecast_service.forecast(
                            product=item.product,
                            region=origin_state,
                            days_ahead=30
                        )
                        if result.get('status') == 'success' and result.get('forecast'):
                            forecast_list = result['forecast']
                            if len(forecast_list) > 0:
                                # Pega o último preço previsto (dia 30)
                                last_price = forecast_list[-1].get('price')
                                if last_price and last_price > 0:
                                    logger.info(f"✅ Prophet 30d: {item.product}/{origin_state} → R$ {last_price:.2f} (modelo: {result.get('forecast_model', 'unknown')})")
                                    return last_price
                        # Se chegou aqui, Prophet não retornou dados válidos
                        logger.debug(f"⚠️ Prophet 30d: status={result.get('status')}, forecast_len={len(result.get('forecast', []))}")
                    except Exception as e:
                        logger.warning(f"⚠️ Prophet 30d falhou para {item.product}/{origin_state}: {str(e)[:100]}")
                    return None
                
                # ✅ OTIMIZADO: Processa ambas as previsões em paralelo (mais rápido)
                # Timeout de 5 segundos por previsão (total máximo 5s, não 10s)
                with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
                    future_7d = executor.submit(get_forecast_7d)
                    future_30d = executor.submit(get_forecast_30d)
                    
                    try:
                        # Aguarda até 5 segundos para cada previsão
                        price_7d = future_7d.result(timeout=5.0)
                        if price_7d:
                            d7_price = price_7d
                    except concurrent.futures.TimeoutError:
                        logger.warning(f"⏱️ Timeout ao buscar previsão 7d para {item.product}/{origin_state} (usando fallback)")
                    except Exception as e:
                        logger.warning(f"⚠️ Erro ao buscar previsão 7d: {str(e)[:100]}")
                    
                    try:
                        price_30d = future_30d.result(timeout=5.0)
                        if price_30d:
                            d30_price = price_30d
                    except concurrent.futures.TimeoutError:
                        logger.warning(f"⏱️ Timeout ao buscar previsão 30d para {item.product}/{origin_state} (usando fallback)")
                    except Exception as e:
                        logger.warning(f"⚠️ Erro ao buscar previsão 30d: {str(e)[:100]}")
                    
            except Exception as e:
                # Se qualquer erro ocorrer, usa fallback (já definido acima)
                logger.warning(f"⚠️ Erro geral ao usar Prophet para {item.product}/{origin_state}: {str(e)[:100]}")
                logger.debug(f"   Usando valores fallback: 7d={d7_price:.2f}, 30d={d30_price:.2f}")
            
            # ✅ Converte item para dict para usar na função de ROI completo
            # O backend envia: id, product, state, lat, lng, current_price, buy_price
            # Não envia destination, então usamos o estado de origem como destino padrão
            opportunity_dict = {
                'product': item.product,
                'state': origin_state,
                'lat': item.lat if hasattr(item, 'lat') else -15.7,
                'lng': item.lng if hasattr(item, 'lng') else -47.9,
                'buyPrice': buy,
                'destination': {'state': origin_state},  # Usa origem como destino padrão
                'sellLocation': origin_state
            }
            
            # ✅ NOVO: Calcula ROI completo usando preço futuro projetado
            roi_d7 = _calculate_complete_roi(opportunity_dict, d7_price)
            roi_d30 = _calculate_complete_roi(opportunity_dict, d30_price)
            
            # ✅ LOG: Mostra se usou Prophet ou fallback (agora de forma mais explícita)
            # Usamos os valores "baseline" (+2% e +8%) como referência:
            # - Se o preço final for diferente do baseline, assumimos que veio do serviço Prophet/fallback inteligente.
            # - Se for igual ao baseline, significa que caímos no fallback simples definido aqui no router.
            used_prophet_7d = abs(d7_price - (curr * 1.02)) > 0.01  # Diferença > 1 centavo
            used_prophet_30d = abs(d30_price - (curr * 1.08)) > 0.01

            source_7d = "prophet" if used_prophet_7d else "fallback_simple_router"
            source_30d = "prophet" if used_prophet_30d else "fallback_simple_router"

            if used_prophet_7d or used_prophet_30d:
                logger.info(
                    f"📊 BatchPriceModel {item.product}/{origin_state}: "
                    f"7d={source_7d} (R$ {d7_price:.2f}), "
                    f"30d={source_30d} (R$ {d30_price:.2f})"
                )
            else:
                logger.debug(
                    f"ℹ️ BatchPriceModel Fallback simples aplicado para {item.product}/{origin_state} "
                    f"(7d={d7_price:.2f}, 30d={d30_price:.2f})"
                )

            # ✅ NOVO: Inclui metadata de origem do preço (Prophet vs fallback) no payload
            # Isso permite que o frontend / dashboards saibam exatamente de onde veio cada projeção.
            results[item.id] = {
                "d7": {
                    "sellPrice": round(d7_price, 2),
                    "roi": roi_d7  # ROI completo de produção
                },
                "d30": {
                    "sellPrice": round(d30_price, 2),
                    "roi": roi_d30  # ROI completo de produção
                },
                "meta": {
                    "price_source_7d": source_7d,
                    "price_source_30d": source_30d
                }
            }
            
        except Exception as e:
            # Fallback seguro com log para debug
            logger.warning(f"⚠️ Erro ao processar item {item.id}: {e}", exc_info=True)
            results[item.id] = {"d7": {"sellPrice": 0, "roi": 0}, "d30": {"sellPrice": 0, "roi": 0}}
    
    # ✅ Salva no cache antes de retornar
    batch_cache.set(cache_key, results)
    logger.debug(f"✅ Cache SET para /batch ({len(request.items)} itens)")
    
    return results

# --- 4. ROTA DE RECOMENDAÇÃO AUTOMÁTICA ---
@router.post("/recommendation")
async def get_recommendation(request: RecommendationRequest):
    """
    🤖 Gera recomendação automática (COMPRAR/NÃO COMPRAR/AGUARDAR) baseada em múltiplos fatores.
    
    Analisa:
    - ROI financeiro (atual e projetado)
    - Qualidade e shelf-life
    - Clima e eventos extremos
    - Safra e época de plantio
    - Tendências de mercado
    """
    try:
        # Se não tem informações de safra, busca do calendário
        is_ideal = request.is_ideal_planting_month
        is_risk = request.is_risk_planting_month
        
        if is_ideal is None and is_risk is None:
            from config.calendar import is_ideal_month, is_risk_month
            current_month = datetime.now().month
            is_ideal = is_ideal_month(request.product, request.state, current_month)
            is_risk = is_risk_month(request.product, request.state, current_month)
        
        # Gera recomendação usando o engine
        recommendation = recommendation_engine.analyze_opportunity(
            roi=request.roi,
            roi_d7=request.roi_d7,
            roi_d30=request.roi_d30,
            quality_score=request.quality_score,
            shelf_life_days=request.shelf_life_days,
            has_extreme_events=request.has_extreme_events,
            extreme_event_severity=request.extreme_event_severity,
            is_ideal_planting_month=is_ideal or False,
            is_risk_planting_month=is_risk or False,
            market_trend=request.market_trend,
            current_price=request.current_price,
            buy_price=request.buy_price
        )
        
        logger.info(f"🤖 Recomendação gerada: {recommendation['recommendation']} (Score: {recommendation['opportunity_score']}/100)")
        
        return recommendation
        
    except Exception as e:
        logger.error(f"❌ Erro ao gerar recomendação: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erro ao gerar recomendação: {str(e)}")

# --- 5. ROTA SCAN (Botão Sugerir Destino) ---
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