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
from utils.geography import calculate_distance

logger = logging.getLogger(__name__)


class ArbitrageCalculator:
    """
    Calcula viabilidade de arbitragem (produzir em A, vender em B).
    """
    
    def __init__(self):
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
        
        # ========================================
        # 3. LOGÍSTICA
        # ========================================
        distance = calculate_distance(data.origin_state, data.destination_state)
        
        # Custo de combustível (API real Petrobras)
        fuel_cost_data = fuel_api.calculate_route_fuel_cost(
            data.origin_state,
            data.destination_state,
            distance
        )
        
        # Outros custos logísticos
        maint_cost = LOGISTICS_DATA['maintenance_per_km'] * distance
        driver_cost = LOGISTICS_DATA['driver_cost_per_km'] * distance
        toll_cost = (distance / 100) * LOGISTICS_DATA.get('toll_cost_per_100km', 15.0)
        insurance = LOGISTICS_DATA.get('insurance_per_trip', 250.0)
        
        # Custo total por viagem
        trip_cost = (
            fuel_cost_data['total_fuel_cost'] + 
            maint_cost + 
            driver_cost + 
            toll_cost + 
            insurance
        )
        
        # Número de viagens necessárias
        capacity = TRUCK_CAPACITIES.get(data.product, 1000)
        trips = math.ceil(total_volume_units / capacity) if total_volume_units > 0 else 0
        
        total_logistics = trip_cost * trips
        
        # ========================================
        # 4. MERCADO DE DESTINO
        # ========================================
        # Estima mês de colheita (plantio + ciclo)
        harvest_month = (data.planting_month + 3) if data.planting_month <= 9 else (data.planting_month - 9)
        
        # Preço previsto no destino (com sazonalidade)
        predicted_price_kg = market_intelligence.get_predicted_market_price(
            data.product, 
            data.destination_state, 
            harvest_month
        )
        
        # Preço por unidade comercial (caixa/saca)
        predicted_sell_price_unit = predicted_price_kg * unit_weight
        
        # Receita bruta
        gross_revenue = total_volume_units * predicted_sell_price_unit
        
        # ========================================
        # 5. RESULTADO FINANCEIRO
        # ========================================
        total_cost = production_cost + total_logistics
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
            'analysis': {
                'origin': data.origin_state,
                'destination': data.destination_state,
                'distance_km': round(distance, 1),
                'est_harvest_month': harvest_month
            },
            'production': {
                'productivity_ha': round(predicted_prod_units, 1),
                'total_volume': round(total_volume_units, 1),
                'unit_cost_origin': round(unit_cost, 2),
                'total_production_cost': round(production_cost, 2)
            },
            'logistics': {
                'fuel_breakdown': fuel_cost_data,
                'maintenance_cost': round(maint_cost, 2),
                'driver_cost': round(driver_cost, 2),
                'toll_cost': round(toll_cost, 2),
                'insurance_cost': insurance,
                'trips_needed': trips,
                'cost_per_trip': round(trip_cost, 2),
                'total_logistics_cost': round(total_logistics, 2)
            },
            'market': {
                'predicted_sell_price_kg': predicted_price_kg,
                'predicted_sell_price_unit': round(predicted_sell_price_unit, 2),
                'gross_revenue': round(gross_revenue, 2)
            },
            'financial': {
                'total_cost': round(total_cost, 2),
                'net_profit': round(net_profit, 2),
                'roi': round(roi, 1)
            },
            'risks': climate_notes
        }
        
        logger.info(
            f"✅ Arbitragem calculada: ROI {roi:.1f}% | "
            f"Lucro R$ {net_profit:,.2f}"
        )
        
        return result


# ========================================
# INSTÂNCIA GLOBAL (Singleton)
# ========================================
arbitrage_calculator = ArbitrageCalculator()
