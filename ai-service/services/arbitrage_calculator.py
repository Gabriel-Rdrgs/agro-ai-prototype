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
REGIONAL_FACTORS = {
    'GO': 1.4,  # Alta tecnologia (Pivôs) -> ~420cx/ha
    'SP': 1.2,  # Alta tecnologia -> ~360cx/ha
    'MG': 1.0,  # Média nacional -> 300cx/ha
    'PR': 1.1,  # Boa tecnologia -> 330cx/ha
    'BA': 0.9,  # Polo Juazeiro é alto, mas média estado puxa pra baixo
    'PE': 0.8,  # Agricultura familiar predominante
    'CE': 1.1,  # Ibiapaba (Alta tecnologia em estufas/irrigação)
    'DEFAULT': 1.0
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
    # 🧠 MÉTODO 1: FIND BEST ROUTE (Versão DEBUG X-RAY 🕵️‍♂️)
    # ==========================================================================
    def find_best_route(self, opportunity: Dict) -> Dict:
        """
        Encontra a melhor rota com LOGS DETALHADOS para auditoria.
        """
        try:
            # 1. Configuração Inicial
            product_name = opportunity.get('product', 'Tomate')
            specs = get_crop_specs(product_name)
            origin_state = opportunity.get('state', 'SP')
            
            logger.info(f"🕵️‍♂️ [DEBUG START] Analisando Rota para {origin_state}")

            # Recupera Fator Regional
            region_factor = REGIONAL_FACTORS.get(origin_state, REGIONAL_FACTORS['DEFAULT'])
            
            # 2. Definição de Volume
            area_ha_standard = 10.0 
            base_prod_cx = specs.get('base_productivity', 300)
            unit_weight = specs.get('unit_weight_kg', 20.0)
            
            # Produtividade
            real_productivity_kg_ha = base_prod_cx * region_factor * unit_weight
            total_volume_kg = area_ha_standard * real_productivity_kg_ha
            
            # Custo de Produção UNITÁRIO (R$/kg)
            base_cost_ha = specs.get('base_cost_ha', 25000)
            production_cost_unit = base_cost_ha / real_productivity_kg_ha

            logger.info(f"📊 [DEBUG PROD] Custo Prod/Kg: R$ {production_cost_unit:.4f} (Base Ha: {base_cost_ha})")

            # Coordenadas
            orig_lat = float(opportunity.get('lat', -15.7))
            orig_lng = float(opportunity.get('lng', -47.9))

            best_scenario = None
            max_roi = -float('inf')

            # 3. Loop de Destinos
            destinations_to_test = set([origin_state, 'SP'] + list(MAJOR_HUBS.keys()))
            
            for dest_uf in destinations_to_test:
                # Busca Preço
                sell_price_kg = self._get_market_price(product_name, dest_uf, specs)
                
                # SE NÃO TIVER PREÇO, LOGA E PULA
                if sell_price_kg <= 0: 
                    # logger.debug(f"   🚫 {dest_uf}: Sem preço de venda.")
                    continue 

                try:
                    dest_info = MAJOR_HUBS.get(dest_uf, {'lat': -23.55, 'lng': -46.63, 'name': dest_uf})
                    
                    # 4. Logística
                    route = logistics_service.calculate_freight(orig_lat, orig_lng, dest_info['lat'], dest_info['lng'])
                    
                    truck_capacity_kg = 15000.0
                    trips_needed = math.ceil(total_volume_kg / truck_capacity_kg)
                    total_freight_cost = route['total_cost'] * trips_needed
                    
                    # 5. Financeiro (✅ UNIFICADO: Mesmo cálculo do simulador - produção completa)
                    # A. Quebra Técnica (Perda física na viagem)
                    distance_km = route['distance_km']
                    breakage_pct = 0.05 + (distance_km / 50000)  # Ex: 1000km = 0.05 + 0.02 = 7%
                    if breakage_pct > 0.15: breakage_pct = 0.15  # Teto de 15%
                    
                    volume_lost = total_volume_kg * breakage_pct
                    effective_volume_sold = total_volume_kg - volume_lost
                    
                    # B. Receita Bruta (Só recebe sobre o que chegou inteiro)
                    gross_revenue = effective_volume_sold * sell_price_kg
                    
                    # C. Custos de Comercialização (Comissão do Box/Ceasa 17% + Descarga)
                    market_fees_pct = 0.17
                    market_cost = gross_revenue * market_fees_pct
                    
                    # D. Custo de Embalagem (Caixa K custa ~R$ 3,50 para 20kg)
                    packaging_cost = (total_volume_kg / unit_weight) * 3.50
                    
                    # E. Custo Total Operacional (Produção + Frete + Embalagem + Taxas de Mercado)
                    total_production_cost = total_volume_kg * production_cost_unit
                    total_op_cost = (
                        total_production_cost + 
                        total_freight_cost + 
                        packaging_cost + 
                        market_cost
                    )
                    
                    # F. Lucro Líquido e ROI
                    net_profit = gross_revenue - total_op_cost
                    roi = (net_profit / total_op_cost) * 100 if total_op_cost > 0 else 0

                    # 🚨 O LOG REVELADOR 🚨
                    logger.info(f"   👉 Rota {origin_state}->{dest_uf}:")
                    logger.info(f"      - Venda: R$ {sell_price_kg:.2f}/kg")
                    logger.info(f"      - Custo Prod: R$ {production_cost_unit:.2f}/kg")
                    logger.info(f"      - Frete Total: R$ {total_freight_cost:.2f} ({trips_needed} viagens)")
                    logger.info(f"      - ROI: {roi:.2f}%")

                    # Filtro de Sanidade (> 300%)
                    if roi > 300: 
                        logger.warning(f"      ⚠️ ROI {roi:.2f}% IGNORADO (Suspeito)")
                        continue

                    if roi > max_roi:
                        max_roi = roi
                        best_scenario = {
                            'destination_state': dest_uf,
                            'destination_name': dest_info['name'],
                            'sell_price': round(sell_price_kg, 2),
                            'freight_cost': round(total_freight_cost / total_volume_kg, 2),
                            'distance_km': int(route['distance_km']),
                            'roi': round(roi, 1),
                            # ✅ NOVO: Informações adicionais do cálculo completo
                            'breakage_pct': round(breakage_pct * 100, 1),
                            'market_fees': round(market_cost, 2),
                            'packaging_cost': round(packaging_cost, 2)
                        }
                except Exception as e:
                    logger.error(f"❌ Erro calculando {dest_uf}: {e}")
                    continue

            if not best_scenario:
                best_scenario = {'destination_state': origin_state, 'roi': 0.0, 'freight_cost': 0.0}

            return best_scenario
            
        except Exception as e:
            logger.error(f"❌ ERRO FATAL NO FIND_BEST_ROUTE: {e}")
            return {'destination_state': 'ERRO', 'roi': 0.0}
    # ==========================================================================
    # 🧠 MÉTODO 2: SIMULADOR DETALHADO (Com Normalização de UF)
    # ==========================================================================
    def calculate(self, data: ArbitrageRequest) -> ArbitrageAnalysisResponse:
        logger.info(f"🌍 Simulador: {data.origin_state} -> {data.destination_state} | {data.area_ha}ha")
        
        # 1. Normalização de Inputs (A Correção Chave) 🛡️
        # Garante que 'goiás' vire 'GO', 'sp ' vire 'SP'
        def normalize_uf(uf):
            if not uf: return 'SP'
            clean = uf.strip().upper()
            # Mapeamento básico se vier nome completo (opcional, mas seguro)
            names = {'SÃO PAULO': 'SP', 'MINAS GERAIS': 'MG', 'GOIÁS': 'GO', 'GOIAS': 'GO', 'PARANÁ': 'PR', 'BAHIA': 'BA'}
            return names.get(clean, clean)[:2] # Pega 2 primeiras letras se não achar

        origin_uf = normalize_uf(data.origin_state)
        dest_uf = normalize_uf(data.destination_state)

        # 2. Definição de Specs e Produtividade
        specs = get_crop_specs(data.product)
        region_factor = REGIONAL_FACTORS.get(origin_uf, REGIONAL_FACTORS['DEFAULT'])
        
        base_prod_cx = specs.get('base_productivity', 300)
        unit_weight = specs.get('unit_weight_kg', 20.0)
        
        # Produtividade Real
        real_productivity_kg_ha = base_prod_cx * region_factor * unit_weight
        total_volume_kg = data.area_ha * real_productivity_kg_ha
        if total_volume_kg == 0: total_volume_kg = 15000.0

        # 3. Logística
        # Usa coordenadas de HUB se disponível, ou estaduais
        orig_info = MAJOR_HUBS.get(origin_uf)
        if orig_info:
            orig_lat, orig_lng = orig_info['lat'], orig_info['lng']
        else:
            raw_orig = STATE_COORDS.get(origin_uf, (-15.7, -47.9))
            orig_lat, orig_lng = raw_orig if isinstance(raw_orig, tuple) else (-15.7, -47.9)

        dest_info = MAJOR_HUBS.get(dest_uf)
        if dest_info:
            dest_lat, dest_lng = dest_info['lat'], dest_info['lng']
        else:
            raw_dest = STATE_COORDS.get(dest_uf, (-23.5, -46.6))
            dest_lat, dest_lng = raw_dest if isinstance(raw_dest, tuple) else (-23.5, -46.6)

        single_trip_data = logistics_service.calculate_freight(orig_lat, orig_lng, dest_lat, dest_lng)
        
        truck_capacity_kg = 15000.0 
        trips_needed = math.ceil(total_volume_kg / truck_capacity_kg)
        total_freight_cost = single_trip_data['total_cost'] * trips_needed
        
        # 4. Precificação
        # Preço de Venda
        sell_price = self._get_market_price(data.product, dest_uf, specs)
        
        # LOG X-9: Vamos ver qual preço ele achou!
        logger.info(f"💰 Preço Mercado [{dest_uf}]: R$ {sell_price:.2f}/kg")

        if sell_price <= 0: 
            sell_price = 4.00 # Fallback
            logger.warning(f"⚠️ Usando preço Fallback R$ 4.00 para {dest_uf}")

        # Custo de Produção (R$/kg)
        base_cost_ha = specs.get('base_cost_ha', 25000)
        production_cost_unit = base_cost_ha / real_productivity_kg_ha

        # 5. Consolidação com "CUSTO BRASIL" 🇧🇷
        
        # --- CORREÇÃO: Reintroduzindo o cálculo que faltava ---
        total_production_cost = total_volume_kg * production_cost_unit

        # A. Quebra Técnica (Perda física na viagem)
        # Viagens longas estragam mais tomate.
        distance_km = single_trip_data['distance_km']
        breakage_pct = 0.05 + (distance_km / 50000) # Ex: 1000km = 0.05 + 0.02 = 7%
        if breakage_pct > 0.15: breakage_pct = 0.15 # Teto de 15%
        
        volume_lost = total_volume_kg * breakage_pct
        effective_volume_sold = total_volume_kg - volume_lost

        # B. Receita Bruta (Só recebe sobre o que chegou inteiro)
        gross_revenue = effective_volume_sold * sell_price

        # C. Custos de Comercialização (Onde o lucro morre)
        # Comissão do Box/Ceasa (17% padrão) + Descarga
        market_fees_pct = 0.17 
        market_cost = gross_revenue * market_fees_pct
        
        # D. Custo de Embalagem (Caixa K custa ~R$ 3,50 para 20kg)
        packaging_cost = (total_volume_kg / 20) * 3.50

        # E. Custo Total Operacional
        # Produção + Frete + Embalagem + Taxas de Mercado
        total_cost_operation = (
            total_production_cost + 
            total_freight_cost + 
            packaging_cost + 
            market_cost
        )
        
        net_profit = gross_revenue - total_cost_operation
        roi = (net_profit / total_cost_operation) * 100 if total_cost_operation > 0 else 0

        # Debug Diesel
        diesel_ref = single_trip_data.get('diesel_price', 6.10)

        return {
            "analysis": {
                "origin": origin_uf,
                "destination": dest_uf,
                "distance_km": single_trip_data['distance_km'],
                "planting_window": f"Mês {data.planting_month}"
            },
            "production": {
                "productivity_ha": round(real_productivity_kg_ha / unit_weight, 1),
                "total_volume": round(total_volume_kg, 1),
                "unit_cost_origin": round(production_cost_unit, 2),
                "total_production_cost": round(total_production_cost, 2),
                "packaging_cost": round(packaging_cost, 2)
            },
            "logistics": {
                "fuel_breakdown": {
                    "weighted_price_liter": diesel_ref, 
                    "total_fuel": round((total_freight_cost * 0.45), 2),
                    "data_coleta": "Hoje"
                },
                "trips_needed": trips_needed,
                "cost_per_trip": round(single_trip_data['total_cost'], 2),
                "total_logistics_cost": round(total_freight_cost, 2),
                "breakage_loss_kg": round(volume_lost, 1)
            },
            "market": {
                "predicted_sell_price": round(sell_price, 2),
                "gross_revenue": round(gross_revenue, 2),
                "market_fees": round(market_cost, 2)
            },
            "financial": {
                "total_cost": round(total_cost_operation, 2),
                "net_profit": round(net_profit, 2),
                "roi": round(roi, 1)
            },
            "risks": [
                f"Quebra Técnica Estimada: {breakage_pct*100:.1f}%",
                f"Comissão CEASA + Taxas: {market_fees_pct*100:.0f}%",
                f"Preço Destino Usado: R$ {sell_price:.2f}/kg"
            ]
        }
# ========================================
# INSTÂNCIA GLOBAL (Singleton)
# ========================================
arbitrage_calculator = ArbitrageCalculator()
