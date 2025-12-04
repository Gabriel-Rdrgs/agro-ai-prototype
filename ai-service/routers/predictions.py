# ai-service/routers/predictions.py
from fastapi import APIRouter, HTTPException
from models.schemas import BatchPredictionRequest, MarketScanRequest, SimulationRequest
from services.fuel_pricing import fuel_api
from services.arbitrage_calculator import arbitrage_calculator
from services.logistics import logistics_service
from config.constants import STATE_COORDS
import logging
from datetime import datetime, timedelta

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

# --- 1. ROTA DE COMBUSTÍVEL (Diesel) ---
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
    Simula viabilidade de armazenagem baseada em preço e clima.
    """
    try:
        # 1. Normalização de Preço (Caixa 20kg -> Kg)
        c_price = request.current_price
        b_price = request.buy_price
        
        # Se preço > 15, assume que é caixa e divide por 20
        if c_price > 15: c_price /= 20
        if b_price > 15: b_price /= 20
        
        # Fallback para evitar zeros
        if c_price <= 0: c_price = 4.00
        if b_price <= 0: b_price = 2.50
        
        logger.info(f"🧠 Storage: Preço Kg ajustado R$ {c_price:.2f}")

        labels, prices, costs = [], [], []
        storage_cost = request.storage_cost_per_day or 0.03
        curr_date = datetime.now()
        
        # Fator de tendência (Chuva = Alta)
        rain_trend = 1.002 if (request.accumulated_rainfall or 0) > 50 else 1.0005
        
        # Simulação de 30 dias
        for day in range(30):
            date_str = (curr_date + timedelta(days=day)).strftime("%d/%m")
            labels.append(date_str)
            # Preço sobe levemente com a tendência
            prices.append(round(c_price * (rain_trend ** day), 2))
            # Custo sobe com a armazenagem diária
            costs.append(round(b_price + (storage_cost * day), 2))

        # Decisão Final
        last_profit = prices[-1] - costs[-1]
        current_profit = prices[0] - costs[0]
        
        return {
            "chart_data": {"labels": labels, "prices": prices, "costs": costs},
            "recommendation": {
                "action": "ARMAZENAR" if last_profit > current_profit else "VENDER AGORA",
                "best_day_date": labels[-1] if last_profit > current_profit else labels[0],
                "projected_profit": round(max(last_profit, current_profit), 2),
                "confidence_score": 0.95,
                "risk_event": "Tendência de Alta (Chuva)" if rain_trend > 1.001 else "Mercado Estável"
            }
        }
    except Exception as e:
        logger.error(f"❌ Erro Storage: {e}")
        return {"chart_data": {}, "recommendation": {}}

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
        except:
            # Fallback seguro
            results[item.id] = {"d7": {"sellPrice": 0, "roi": 0}, "d30": {"sellPrice": 0, "roi": 0}}
    return results

# --- 4. ROTA SCAN (Botão Sugerir Destino) ---
@router.post("/market/scan")
async def market_scan(request: MarketScanRequest):
    logger.info(f"🔎 Scan Mercado: {request.product} de {request.origin_state}")
    ranking = []
    
    # Lista de destinos (Hubs + Estados principais)
    destinations = list(MAJOR_HUBS.keys()) + ['SP', 'MG', 'PR', 'SC', 'RS', 'GO', 'BA']
    destinations = list(set(destinations)) 
    
    buy_price = 2.50 # Custo base kg estimado
    
    # Coordenadas de Origem
    origin_coords = STATE_COORDS.get(request.origin_state, (-15.7, -47.9))
    if isinstance(origin_coords, dict):
        origin_coords = (origin_coords.get('lat', -15.7), origin_coords.get('lng', -47.9))

    for dest in destinations:
        if dest == request.origin_state: continue
        
        try:
            # 1. Preço Venda (Busca no banco via arbitrage_calculator)
            sell_price = arbitrage_calculator._get_market_price(request.product, dest)
            
            # Fallback realista
            if sell_price <= 0: 
                sell_price = 4.00 
                if dest in ['SP', 'RJ']: sell_price = 4.50
            
            if sell_price > 15: sell_price /= 20 # Normaliza
            
            # 2. Frete
            # Tenta pegar do HUB ou do Estado
            d_info = MAJOR_HUBS.get(dest, STATE_COORDS.get(dest))
            if not d_info: continue
            
            # Normaliza destino para (lat, lng)
            if isinstance(d_info, dict):
                d_lat, d_lng = d_info['lat'], d_info['lng']
            else:
                d_lat, d_lng = d_info[0], d_info[1]

            # Calcula Frete Real
            freight_data = logistics_service.calculate_freight(
                origin_coords[0], origin_coords[1], d_lat, d_lng
            )
            
            # Custo frete por kg (assumindo 15t = 750 caixas de 20kg)
            cost_freight_kg = freight_data['cost_per_unit'] / 20
            
            # 3. ROI
            gross_margin = sell_price - buy_price - cost_freight_kg
            roi = (gross_margin / (buy_price + cost_freight_kg)) * 100
            
            # Adiciona ao ranking
            ranking.append({
                "destination": dest,
                "net_profit": round(gross_margin * request.volume, 2),
                "roi": round(roi, 1),
                "sell_price": round(sell_price, 2),
                "freight": round(cost_freight_kg, 2)
            })

        except Exception as e:
            logger.error(f"Erro scan {dest}: {e}")
            continue

    # Ordena: Melhor ROI primeiro
    ranking.sort(key=lambda x: x['roi'], reverse=True)
    
    best = ranking[0] if ranking else None
    
    # Fallback se não achar nada
    if not best:
        best = {"destination": "Local", "roi": 0, "net_profit": 0}
        ranking.append(best)

    return {
        "status": "success", 
        "best_opportunity": best,
        "ranking": ranking
    }