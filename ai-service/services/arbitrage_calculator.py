# services/arbitrage_calculator.py
"""
Calculadora de arbitragem interestadual.
Considera produção, logística e mercado de destino.
"""

import math
import logging
from typing import Dict, List

from models.schemas import ArbitrageRequest, ArbitrageAnalysisResponse
from config.crops import get_crop_specs
from config.calendar import PLANTING_CALENDAR
from services.fuel_pricing import fuel_api
from utils.geography import calculate_distance_coords
from services.logistics import logistics_service
from utils.database import get_engine
from sqlalchemy import text
from config.constants import STATE_COORDS

logger = logging.getLogger(__name__)

# ==============================================================================
# 📍 CONFIGURAÇÃO DE HUBS (NOVOS DESTINOS PARA A INTELIGÊNCIA)
# ==============================================================================
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

class ArbitrageCalculator:
    """
    Calcula viabilidade de arbitragem (produzir em A, vender em B).
    """
    
    def __init__(self):
        self.engine = get_engine()
        logger.info("✅ ArbitrageCalculator iniciado")
    
    def _get_market_price(self, product: str, state: str) -> float:
        """Helper para buscar preço no banco"""
        try:
            with self.engine.connect() as conn:
                query = text('SELECT "sellPrice" FROM "Opportunity" WHERE product = :p AND state = :s ORDER BY "createdAt" DESC LIMIT 1')
                res = conn.execute(query, {"p": product, "s": state}).fetchone()
                if res: 
                    price = float(res[0])
                    # --- NORMALIZAÇÃO AUTOMÁTICA ---
                    # Se preço > 15, assume que é caixa e converte para Kg
                    if price > 15: return price / 20
                    return price
        except Exception as e:
            logger.warning(f"⚠️ Preço não encontrado para {product}-{state}: {e}")
        return 0.0

    # ==========================================================================
    # 🧠 NOVO MÉTODO: ENCONTRA A MELHOR ROTA AUTOMATICAMENTE
    # ==========================================================================
    def find_best_route(self, opportunity: Dict) -> Dict:
        """
        Recebe uma oportunidade (origem) e calcula para ONDE é melhor enviar.
        Retorna o dicionário com o cenário vencedor.
        """
        origin_state = opportunity['state']
        product = opportunity['product']
        buy_price = float(opportunity['buyPrice'])
        if buy_price > 15: buy_price /= 20
        origin_lat = float(opportunity['lat'])
        origin_lng = float(opportunity['lng'])

        best_scenario = None
        max_roi = -float('inf')

        # Definimos quais destinos testar: O próprio estado + SP (Referência) + Todos os Hubs
        destinations_to_test = set([origin_state, 'SP'] + list(MAJOR_HUBS.keys()))
        
        results = []

        for dest_uf in destinations_to_test:
            sell_price = self._get_market_price(product, dest_uf)
            if sell_price <= 0: continue 

            try:
                # Dados de Destino
                dest_info = MAJOR_HUBS.get(dest_uf, {'lat': -23.55, 'lng': -46.63, 'name': f'Mercado Local {dest_uf}'})
                
                # Frete
                if origin_state == dest_uf:
                    freight_cost = 0.15 # Custo baixo local
                    distance = 50
                else:
                    route = logistics_service.calculate_freight(
                        origin_lat, origin_lng,
                        dest_info['lat'], dest_info['lng']
                    )
                    distance = route['distance_km']
                    # Frete por Kg (considerando rateio de carga plena)
                    # Se custo unitário veio > 1.0 (provavel caixa), divide por 20
                    f_unit = route['cost_per_unit']
                    freight_cost = f_unit / 20 if f_unit > 1.0 else f_unit

                # 3. Calcula ROI
                # Lucro Bruto = Venda - (Compra + Frete)
                gross_profit = sell_price - buy_price - freight_cost
                roi = (gross_profit / (buy_price + freight_cost)) * 100

                scenario = {
                    'destination_state': dest_uf,
                    'destination_name': dest_info['name'], # Ex: CEASA - MG
                    'sell_price': sell_price,
                    'freight_cost': round(freight_cost, 2),
                    'distance_km': int(distance),
                    'roi': round(roi, 2)
                }
                
                if roi > max_roi:
                    max_roi = roi
                    best_scenario = scenario
            
            except Exception as e:
                # Log silencioso para não poluir, apenas ignora rota inválida
                continue

        # Se falhar tudo, retorna o próprio estado como fallback
        if not best_scenario:
            best_scenario = {
                'destination_state': origin_state,
                'destination_name': f"Mercado Local {origin_state}",
                'roi': 0.0,
                'freight_cost': 0.0
            }

        return best_scenario

    # ==========================================================================
    # MÉTODO ANTIGO (MANTIDO PARA O SIMULADOR MANUAL)
    # ==========================================================================
    def calculate(self, data: ArbitrageRequest) -> ArbitrageAnalysisResponse:
        logger.info(f"🌍 Arbitragem Manual: {data.origin_state} -> {data.destination_state}")
        
        # --- HELPER INTERNO PARA EXTRAIR LAT/LNG ---
        def get_lat_lng(coord_data):
            # Se for dicionário {'lat': -23, 'lng': -46}
            if isinstance(coord_data, dict):
                return float(coord_data.get('lat', 0)), float(coord_data.get('lng', 0))
            # Se for tupla (-23, -46) ou lista
            if isinstance(coord_data, (tuple, list)) and len(coord_data) >= 2:
                return float(coord_data[0]), float(coord_data[1])
            # Fallback
            return -15.7, -47.9

        # 1. Obter Coordenadas (Origem e Destino) com segurança
        raw_origin = STATE_COORDS.get(data.origin_state)
        # Se não achou no STATE_COORDS, usa um padrão
        if not raw_origin: raw_origin = (-15.7, -47.9)
        
        origin_lat, origin_lng = get_lat_lng(raw_origin)
        
        # Para o destino, tenta ver se é um HUB conhecido primeiro
        if data.destination_state in MAJOR_HUBS:
            raw_dest = MAJOR_HUBS[data.destination_state]
        else:
            raw_dest = STATE_COORDS.get(data.destination_state)
            if not raw_dest: raw_dest = (-23.5, -46.6) # SP Default
            
        dest_lat, dest_lng = get_lat_lng(raw_dest)

        # 2. Chamar Logística (Agora passamos floats limpos)
        route = logistics_service.calculate_freight(
            origin_lat, origin_lng, 
            dest_lat, dest_lng
        )
        
        # 3. Financeiro
        sell_price = self._get_market_price(data.product, data.destination_state)
        if sell_price <= 0: sell_price = 80.00 # Fallback realista
        
        buy_price = sell_price * 0.6 # Margem teórica
        
        total_freight = route['total_cost']
        volume_units = 750 # 15 ton / 20kg
        
        gross_revenue = volume_units * sell_price
        total_cost = (volume_units * buy_price) + total_freight
        
        net_profit = gross_revenue - total_cost
        roi = (net_profit / total_cost) * 100 if total_cost > 0 else 0

        return {
            "analysis": {
                "origin": data.origin_state,
                "destination": data.destination_state,
                "distance_km": route['distance_km'],
                "planting_window": f"Mês {data.planting_month}"
            },
            "production": {
                "productivity_ha": 80,
                "total_volume": volume_units,
                "unit_cost_origin": round(buy_price, 2),
                "total_production_cost": round(volume_units * buy_price, 2)
            },
            "logistics": {
                "fuel_breakdown": {"diesel_price": 6.00, "total_fuel": total_freight * 0.4},
                "trips_needed": 1,
                "cost_per_trip": total_freight,
                "total_logistics_cost": total_freight,
                "maintenance_cost": 0, "driver_cost": 0, "toll_cost": 0, "insurance_cost": 0
            },
            "market": {
                "predicted_sell_price": round(sell_price, 2),
                "gross_revenue": round(gross_revenue, 2)
            },
            "financial": {
                "total_cost": round(total_cost, 2),
                "net_profit": round(net_profit, 2),
                "roi": round(roi, 1)
            },
            "risks": ["Cálculo baseado em médias estaduais"]
        }
# ========================================
# INSTÂNCIA GLOBAL (Singleton)
# ========================================
arbitrage_calculator = ArbitrageCalculator()
