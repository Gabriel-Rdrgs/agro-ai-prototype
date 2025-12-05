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
    
    def _get_market_price(self, product: str, state: str, specs: dict = None) -> float:
        """
        Busca preço e já devolve normalizado em Kg.
        Aceita specs opcional para saber o peso da caixa (default 20kg).
        """
        try:
            with self.engine.connect() as conn:
                query = text('SELECT "sellPrice" FROM "Opportunity" WHERE product = :p AND state = :s ORDER BY "createdAt" DESC LIMIT 1')
                res = conn.execute(query, {"p": product, "s": state}).fetchone()
                if res:
                    price = float(res[0])
                    
                    # Define peso da conversão (usa specs se tiver, ou 20kg padrão)
                    unit_weight = 20.0
                    if specs:
                        unit_weight = specs.get('unit_weight_kg', 20.0)
                        
                    # --- NORMALIZAÇÃO AUTOMÁTICA ---
                    # Se preço > 10, assume que é caixa e converte para Kg
                    if price > 10.0: 
                        return price / unit_weight
                    return price
        except Exception as e:
            logger.warning(f"⚠️ Preço não encontrado para {product}-{state}: {e}")
        return 0.0

    # ==========================================================================
    # 🧠 NOVO MÉTODO: ENCONTRA A MELHOR ROTA AUTOMATICAMENTE
    # ==========================================================================
    def find_best_route(self, opportunity: Dict) -> Dict:
        # Busca specs para saber o peso correto
        specs = get_crop_specs(opportunity['product'])
        unit_weight = specs.get('unit_weight_kg', 20.0)
        
        # 1. Normaliza Custo de Origem (Compra)
        raw_buy = float(opportunity['buyPrice'])
        # Se preço > 10, converte caixa -> kg
        buy_price_kg = raw_buy / unit_weight if raw_buy > 10.0 else raw_buy
        
        origin_lat = float(opportunity['lat'])
        origin_lng = float(opportunity['lng'])
        origin_state = opportunity['state']

        best_scenario = None
        max_roi = -float('inf')

        # Definimos quais destinos testar
        destinations_to_test = set([origin_state, 'SP'] + list(MAJOR_HUBS.keys()))
        
        for dest_uf in destinations_to_test:
            # ✅ CORREÇÃO: Passa specs para a função auxiliar
            sell_price_kg = self._get_market_price(opportunity['product'], dest_uf, specs)
            if sell_price_kg <= 0: continue

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
    # 🧠 MÉTODO 2: SIMULADOR DETALHADO (Manual)
    # ==========================================================================
    def calculate(self, data: ArbitrageRequest) -> ArbitrageAnalysisResponse:
        logger.info(f"🌍 Simulador Manual: {data.origin_state} -> {data.destination_state}")
        
        # 1. Definição de Specs (Fundamental para pesos e custos)
        specs = get_crop_specs(data.product)
        
        # 2. Definição de Coordenadas (Origem e Destino)
        # Tenta pegar de HUBS, senão usa coordenadas estaduais genéricas
        orig_info = MAJOR_HUBS.get(data.origin_state)
        if orig_info:
            orig_lat, orig_lng = orig_info['lat'], orig_info['lng']
        else:
            # Fallback seguro
            raw_orig = STATE_COORDS.get(data.origin_state, (-15.7, -47.9))
            orig_lat, orig_lng = raw_orig if isinstance(raw_orig, tuple) else (-15.7, -47.9)

        dest_info = MAJOR_HUBS.get(data.destination_state)
        if dest_info:
            dest_lat, dest_lng = dest_info['lat'], dest_info['lng']
        else:
            raw_dest = STATE_COORDS.get(data.destination_state, (-23.5, -46.6))
            dest_lat, dest_lng = raw_dest if isinstance(raw_dest, tuple) else (-23.5, -46.6)

        # 3. 🚚 CÁLCULO DA ROTA (Aqui estava o erro: a variável 'route' nasce aqui!)
        route = logistics_service.calculate_freight(orig_lat, orig_lng, dest_lat, dest_lng)
        
        # -------------------------------------------------------
        # Lógica Financeira Científica (Kg)
        # -------------------------------------------------------
        
        # A. Preço de Venda (Normalizado em Kg)
        sell_price = self._get_market_price(data.product, data.destination_state, specs)
        if sell_price <= 0: sell_price = 4.00 # Fallback R$ 4/kg

        # B. Custo de Origem (Preço de mercado ou Custo Produção)
        buy_price = self._get_market_price(data.product, data.origin_state, specs)
        
        if buy_price <= 0:
            # Fallback Científico: Custo Base / Produtividade Kg
            base_cost = specs.get('base_cost_ha', 25000)
            productivity_kg = specs.get('base_productivity', 300) * specs.get('unit_weight_kg', 20.0)
            buy_price = base_cost / productivity_kg

        # C. Resultados Consolidados
        total_freight = route['total_cost']
        
        # Volume Total em Kg
        volume_kg = data.area_ha * specs.get('base_productivity', 300) * specs.get('unit_weight_kg', 20.0)
        if volume_kg == 0: volume_kg = 15000.0 # 15 ton default

        gross_revenue = volume_kg * sell_price
        total_cost = (volume_kg * buy_price) + total_freight
        
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
                "productivity_ha": specs.get('base_productivity'),
                "total_volume": round(volume_kg, 1),
                "unit_cost_origin": round(buy_price, 2),
                "total_production_cost": round(volume_kg * buy_price, 2)
            },
            "logistics": {
                "fuel_breakdown": {
                    "diesel_price": 6.00, 
                    "total_fuel": round(total_freight * 0.4, 2)
                },
                "trips_needed": 1,
                "cost_per_trip": round(total_freight, 2),
                "total_logistics_cost": round(total_freight, 2),
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
            "risks": ["Cálculo científico em KG", "Frete calculado via rota real"]
        }
# ========================================
# INSTÂNCIA GLOBAL (Singleton)
# ========================================
arbitrage_calculator = ArbitrageCalculator()
