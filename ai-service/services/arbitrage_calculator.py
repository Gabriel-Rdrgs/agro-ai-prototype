# services/arbitrage_calculator.py
"""
Calculadora de arbitragem interestadual.
Considera produção, logística e mercado de destino.
"""

import math
import logging
from typing import Dict

from models.schemas import ArbitrageRequest, ArbitrageAnalysisResponse
from config.crops import get_crop_specs
from config.calendar import PLANTING_CALENDAR
from config.constants import LOGISTICS_DATA, TRUCK_CAPACITIES
from services.market_intelligence import market_intelligence
from services.fuel_pricing import fuel_api
from utils.geography import calculate_distance_coords
from services.logistics import logistics_service
from utils.database import get_engine
from sqlalchemy import text
from config.constants import STATE_COORDS

logger = logging.getLogger(__name__)


class ArbitrageCalculator:
    """
    Calcula viabilidade de arbitragem (produzir em A, vender em B).
    """
    
    def __init__(self):
        self.engine = get_engine()
        logger.info("✅ ArbitrageCalculator iniciado")
    
    def calculate(self, data: ArbitrageRequest) -> ArbitrageAnalysisResponse:
        """
        Calcula ROI completo de arbitragem considerando:
        - Produção na origem (com ajuste climático)
        - Logística (frete real)
        - Preço de venda no destino (com sazonalidade)
        
        Args:
            data: ArbitrageRequest
        
        Returns:
            Análise completa com ROI, custos e riscos
        """
        logger.info(
            f"🌍 Calculando arbitragem: {data.product} | "
            f"{data.origin_state} → {data.destination_state} | "
            f"{data.area_ha}ha"
        )
        
        # ========================================
        # 1. CONFIGURAÇÃO
        # ========================================
        specs = get_crop_specs(data.product)
        unit_weight = specs.get('unit_weight_kg', 1.0)
        
        # ========================================
        # 2. PRODUÇÃO NA ORIGEM
        # ========================================
        predicted_prod_units = specs.get('base_productivity', 100)
        
        calendar = PLANTING_CALENDAR.get(data.product, {}).get(data.origin_state)
        climate_notes = []
        
        if calendar:
            ideal_months = calendar.get('ideal', [])
            risk_months = calendar.get('risk', [])
            
            if data.planting_month in ideal_months:
                predicted_prod_units *= 1.05
            elif data.planting_month in risk_months:
                predicted_prod_units *= 0.70
                climate_notes.append(
                    f'Quebra prevista em {data.origin_state} '
                    f'(plantio em mês de risco).'
                )
        
        # Volume total produzido
        total_volume_units = data.area_ha * predicted_prod_units
        
        # Custo de produção
        production_cost = data.area_ha * specs.get('base_cost_ha', 5000)
        unit_cost = production_cost / total_volume_units if total_volume_units > 0 else 0
        
        sell_price = 4.00 # Fallback de segurança
        try:
            with self.engine.connect() as conn:
                # Busca o último preço de venda registrado para o destino
                query = text('SELECT "sellPrice" FROM "Opportunity" WHERE product = :p AND state = :s ORDER BY "createdAt" DESC LIMIT 1')
                res = conn.execute(query, {"p": data.product, "s": data.destination_state}).fetchone()
                if res: sell_price = float(res[0])
        except Exception as e:
            logger.warning(f"⚠️ Erro ao buscar preço no banco: {e}")

        # Regra de Arbitragem: Custo na origem é 70% do valor de venda (Margem Bruta)
        buy_price = sell_price * 0.70

        # ========================================
        # 3. LOGÍSTICA (CÁLCULO REAL)
        # ========================================
            
        # A. Coordenadas
        lat_origin, lng_origin = STATE_COORDS.get(data.origin_state, (-15.0, -48.0))
        lat_dest, lng_dest = STATE_COORDS.get(data.destination_state, (-23.5, -46.6))
            
        # B. Distância Real (AQUI ESTÁ A CORREÇÃO)
        distance = calculate_distance_coords(lat_origin, lng_origin, lat_dest, lng_dest)
            
        # C. Custo de Frete (Via Logistics Service)
        freight_total_trip = logistics_service.calculate_freight(
                lat_origin, lng_origin, data.destination_state
        )
            
        # D. Viagens Necessárias
        truck_capacity = 15000 # 15 ton
        total_volume_kg = total_volume_units * specs['unit_weight_kg']
        trips = math.ceil(total_volume_kg / truck_capacity)
            
        total_logistics_cost = freight_total_trip * trips
            
        # E. Detalhamento de Combustível (Para o gráfico)
        fuel_data = fuel_api.calculate_route_fuel_cost(
            data.origin_state, 
            data.destination_state, 
            distance 
            )
            
        # Ajuste visual: Separa o que é Diesel do que é Manutenção
        fuel_cost_real = fuel_data.get('total_fuel_cost', 0) * trips
            
        # 👇 CORREÇÃO: Usar 'total_logistics_cost' (o nome correto que definimos acima)
        maintenance_real = total_logistics_cost - fuel_cost_real
            
        # ========================================
        # 4. CONSOLIDAÇÃO FINANCEIRA
        # ========================================
            
        # Receita Bruta (Baseada no Preço Real)
        gross_revenue = total_volume_kg * sell_price
            
        # Custo Produção (Mantém sua lógica original de 70% ou custo inputado)
        # Se quiser forçar a margem de 30% igual ao mapa:
        unit_cost = sell_price * 0.70 
        production_cost = total_volume_kg * unit_cost
            
        total_cost = production_cost + total_logistics_cost
        net_profit = gross_revenue - total_cost
        roi = (net_profit / total_cost) * 100 if total_cost > 0 else 0
        
        # ========================================
        # 5. RESULTADO FINANCEIRO
        # ========================================
        total_cost = production_cost + total_logistics_cost
        net_profit = gross_revenue - total_cost
        roi = (net_profit / total_cost * 100) if total_cost > 0 else 0
        
        # ========================================
        # 6. ANÁLISE DE RISCOS
        # ========================================
        if not climate_notes:
            climate_notes.append('Condições climáticas favoráveis na origem.')
        
        # Alerta de distância
        if distance > 1500:
            climate_notes.append(
                f'⚠️ Distância longa ({distance:.0f}km) aumenta risco logístico.'
            )
        
        # Alerta de ROI baixo
        if roi < 10:
            climate_notes.append(
                '⚠️ ROI abaixo de 10% - considere alternativas.'
            )
        
        # ========================================
        # 7. RESPOSTA
        # ========================================
        result = {
            "analysis": {
                    "origin": data.origin_state,
                    "destination": data.destination_state,
                    "distance_km": int(distance),
                    "planting_window": f"Mês {data.planting_month}"
                },
            "production": {
                    "productivity_ha": round(predicted_prod_units, 1), 
                    "total_volume": round(total_volume_units, 1), 
                    "unit_cost_origin": round(buy_price, 2),
                    "total_production_cost": round(production_cost, 2)
                },
            "logistics": {
                    "fuel_breakdown": fuel_data,
                    "trips_needed": trips,
                    "cost_per_trip": round(freight_total_trip, 2),
                    "total_logistics_cost": round(total_logistics_cost, 2),
                    # Manter compatibilidade visual
                    "maintenance_cost": round(total_logistics_cost * 0.15, 2),
                    "driver_cost": round(total_logistics_cost * 0.15, 2),
                    "toll_cost": round(total_logistics_cost * 0.10, 2),
                    "insurance_cost": 0
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
            "risks": [] 
            }

        logger.info(f"✅ Arbitragem calculada: ROI {roi:.1f}%")
            
        return result 
# ========================================
# INSTÂNCIA GLOBAL (Singleton)
# ========================================
arbitrage_calculator = ArbitrageCalculator()
