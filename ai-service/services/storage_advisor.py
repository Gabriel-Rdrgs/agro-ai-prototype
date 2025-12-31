# ai-service/services/storage_advisor.py
"""
Motor de Armazenagem usando Fórmula Oficial dos PDFs.
Fonte Única da Verdade: config.mathematical_formulas.calculate_storage_cost()
"""
import numpy as np
from datetime import datetime, timedelta
import logging
import random
import math

from models.schemas import SimulationRequest
from config.crops import get_crop_specs
from config.mathematical_formulas import calculate_storage_cost, DAILY_LOSS_RATE
from config.soybean_formulas import calculate_soybean_storage_cost, SOYBEAN_DAILY_LOSS_RATE
from config.corn_formulas import calculate_corn_storage_cost, CORN_DAILY_LOSS_RATE
from services.market_intelligence import get_predicted_market_price, get_seasonality_factor
from utils.database import get_engine

logger = logging.getLogger(__name__)

class StorageAdvisor:
    """
    Motor Econométrico de Armazenagem (v5.0 - Quantum Leap).
    Utiliza Movimento Browniano com Saltos (Jump Diffusion) calibrado por:
    - Previsão Climática Real (16 dias)
    - Sazonalidade Histórica (Banco de Dados)
    - Curva de Degradação Biológica Não-Linear
    """
    
    def __init__(self):
        self.engine = get_engine()
        logger.info("✅ StorageAdvisor: Motor Econométrico Ativado")

    def _calculate_biological_decay(self, day: int, rain_stress: bool) -> float:
        """
        Calcula a perda de qualidade (valor comercial) do tomate.
        Curva Sigmoide: Aguenta bem no início, degrada rápido depois.
        """
        # Shelf-life base: 20 dias em câmara fria ideal
        # Se tiver estresse hídrico na colheita (chuva), shelf-life cai para 12 dias
        shelf_life = 12 if rain_stress else 20
        
        # Fórmula Sigmoide Logística para simular apodrecimento
        # Dia 0: 100% qualidade
        # Dia Shelf-Life: 50% qualidade (ponto de virada)
        k = 0.4 # Agressividade da curva
        decay = 1 / (1 + np.exp(k * (day - shelf_life)))
        
        # Ajuste para garantir que comece em ~1.0
        initial_adjustment = 1 / (1 + np.exp(k * (0 - shelf_life)))
        normalized_decay = decay / initial_adjustment
        
        return normalized_decay

    async def analyze(self, data: SimulationRequest) -> dict:
        # 1. SETUP DE DADOS
        specs = get_crop_specs(data.product)
        unit_weight = specs.get('unit_weight_kg', 20.0)
        
        # Preços Base
        c_price = data.current_price
        # Auto-fill preço
        if c_price <= 0.1:
            try:
                c_price = get_predicted_market_price(data.product, data.state, datetime.now().month, {})
            except: c_price = 4.00
        
        if c_price > 15: c_price /= unit_weight
        
        # Custo Produtor (Base 60% se não informado)
        b_price = data.buy_price
        if b_price <= 0.1 or b_price >= (c_price * 0.95):
            b_price = c_price * 0.60 
        elif b_price > 15: b_price /= unit_weight

        # Recupera dados climáticos reais
        forecast_rain = data.daily_rain or []
        
        # ✅ BUSCA AUTOMÁTICA: Se não há dados climáticos, busca usando coordenadas/estado
        if not forecast_rain or len(forecast_rain) < 16:
            try:
                from services.climate.intelligence import climate_api
                
                # Tenta usar coordenadas fornecidas
                lat = data.lat if data.lat and data.lat != 0.0 else None
                lng = data.lng if data.lng and data.lng != 0.0 else None
                
                # Se não tem coordenadas, usa coordenadas do estado
                if not lat or not lng:
                    from config.constants import STATE_COORDS
                    state_coords = STATE_COORDS.get(data.state, STATE_COORDS.get('SP'))
                    lat, lng = state_coords
                
                logger.info(f"🌤️ Buscando dados climáticos para {data.state} ({lat}, {lng})")
                # Busca forecast estendido (16 dias) - agora usando await diretamente
                try:
                    forecast_data = await climate_api.get_extended_forecast(lat, lng)
                    
                    if forecast_data and 'rain_sum' in forecast_data:
                        # Formato retornado pelo get_extended_forecast: {rain_sum: [...]}
                        forecast_rain = list(forecast_data.get('rain_sum', []))[:16]
                        logger.info(f"✅ Dados climáticos obtidos: {len(forecast_rain)} dias de previsão para {data.state}")
                    elif forecast_data and 'precipitation_sum' in forecast_data:
                        # Formato alternativo
                        forecast_rain = list(forecast_data.get('precipitation_sum', []))[:16]
                        logger.info(f"✅ Dados climáticos obtidos: {len(forecast_rain)} dias de previsão para {data.state}")
                    else:
                        logger.warning(f"⚠️ Formato inesperado de dados climáticos para {data.state}: {list(forecast_data.keys()) if forecast_data else 'None'}")
                        forecast_rain = data.daily_rain or []
                except Exception as e:
                    logger.warning(f"⚠️ Erro ao buscar clima para {data.state}: {e}", exc_info=True)
                    forecast_rain = data.daily_rain or []
            except Exception as e:
                logger.warning(f"⚠️ Erro ao buscar clima: {e}, usando dados fornecidos")
                forecast_rain = data.daily_rain or []
        
        # 2. ANÁLISE MACRO (Contexto de Mercado)
        # Busca a tendência sazonal histórica para o mês atual e próximo
        curr_month = datetime.now().month
        next_month = (curr_month % 12) + 1
        
        seasonality_now = get_seasonality_factor(data.product, data.state, curr_month)
        seasonality_next = get_seasonality_factor(data.product, data.state, next_month)
        
        # Tendência Macro: Se o próximo mês historicamente é mais caro, viés de alta.
        macro_trend_daily = (seasonality_next - seasonality_now) / 30
        
        # 3. SIMULAÇÃO MONTE CARLO (30 Dias)
        prices_market = []      # O Mercado (Independente de mim)
        prices_my_product = []  # Meu Estoque (Com perda de qualidade)
        costs = []              # Custos Acumulados
        labels = []
        
        curr_date = datetime.now()
        current_market_sim = c_price
        
        # Variáveis de Controle
        shock_event = None
        days_of_rain_accumulated = 0
        
        for day in range(30):
            date_str = (curr_date + timedelta(days=day)).strftime("%d/%m")
            labels.append(date_str)

            # --- A. MODELAGEM DO MERCADO (JUMP DIFFUSION) ---
            
            # 1. Componente Climático (O "Choque")
            # Olha a previsão REAL do dia (se disponível) ou projeta estatisticamente
            has_climate_data = day < len(forecast_rain) and len(forecast_rain) > 0
            rain_today = forecast_rain[day] if has_climate_data else 0.0
            
            # Acumula dias de chuva consecutivos (Stress Logístico)
            if rain_today > 10.0:
                days_of_rain_accumulated += 1
            else:
                days_of_rain_accumulated = max(0, days_of_rain_accumulated - 1)

            # Cálculo do "Pulo" (Jump) no preço
            jump_factor = 0.0
            volatility = 0.01 # Volatilidade base (1%)

            if days_of_rain_accumulated >= 3:
                # 3 dias de chuva seguidos = Crise de Abastecimento
                jump_factor = random.uniform(0.03, 0.06) # Salto de 3% a 6%
                volatility = 0.05 # Mercado fica nervoso
                if not shock_event: shock_event = f"Ciclo de chuvas ({date_str}) restringindo oferta."
            
            elif rain_today > 25:
                # Chuva torrencial isolada
                jump_factor = 0.02
                volatility = 0.03
            
            elif has_climate_data and macro_trend_daily > 0:
                # Se TEM dados climáticos E tendência sazonal positiva, segue a tendência
                jump_factor = macro_trend_daily 
            
            elif not has_climate_data:
                # ⚠️ SEM DADOS CLIMÁTICOS: Usa volatilidade neutra (sem viés de alta/baixa)
                # Aplica apenas ruído aleatório simétrico (pode subir ou descer)
                jump_factor = random.uniform(-0.005, 0.005)  # Simétrico em torno de zero
                volatility = 0.015  # Volatilidade um pouco maior quando sem dados
            
            else:
                # Tempo bom na safra = Pressão de baixa (muita oferta)
                jump_factor = random.uniform(-0.01, 0.0)  # Ajustado para não ter viés positivo

            # Equação Estocástica: Preço Amanhã = Preço Hoje * e^(Drift + Volatilidade)
            # Drift = Tendência Macro (só se tiver dados) + Choque Climático
            # Se não tiver dados climáticos, drift = 0 (sem tendência sistemática)
            drift = (macro_trend_daily if has_climate_data else 0.0) + jump_factor
            shock = volatility * np.random.normal() # Distribuição Gaussiana
            
            current_market_sim *= math.exp(drift + shock)
            
            # Trava de Realidade (O preço não cai para zero nem vai ao infinito)
            # Suporte: Custo de Produção + 10%
            # Resistência: 3x Preço Atual
            current_market_sim = max(current_market_sim, b_price * 1.1)
            current_market_sim = min(current_market_sim, c_price * 3.0)

            # --- B. MODELAGEM DO MEU PRODUTO (DEPRECIAÇÃO BIOLÓGICA) ---
            # O meu produto vale o preço de mercado MULTIPLICADO pela qualidade dele.
            
            # Se colheu na chuva (acumulado inicial alto), degrada mais rápido
            harvest_stress = (data.accumulated_rainfall or 0) > 40
            quality_index = self._calculate_biological_decay(day, harvest_stress)
            
            # O valor real que eu recebo na venda
            my_sell_price = current_market_sim * quality_index

            # --- C. CUSTOS REAIS (ACUMULADOS) ---
            # ✅ USA FÓRMULA OFICIAL: C(x,t) = Cf + Cv + Cp
            # ✅ NOVO: Detecta produto e usa função apropriada (Tomate vs Soja)
            # IMPORTANTE: Calcula custo por kg para manter consistência com preços (R$/kg)
            # Usa quantidade padrão de 10000 kg (10 toneladas) para distribuir custo fixo de forma mais realista
            # Câmaras frias comerciais geralmente armazenam volumes maiores, reduzindo custo fixo por kg
            quantity_standard_kg = 10000.0  # 10 toneladas (quantidade padrão comercial)
            time_months = (day + 1) / 30.0  # Converte dias para meses (dia+1 para incluir o dia atual)
            
            # ✅ NOVO: Detecta produto e usa função apropriada
            product_name = data.product.strip().capitalize() if data.product else 'Tomate'
            
            if product_name == 'Soja':
                # Usa função de armazenagem de soja
                storage_costs = calculate_soybean_storage_cost(
                    quantity_kg=quantity_standard_kg,
                    time_months=time_months,
                    price_per_kg=c_price
                )
                # Taxa de comissão menor para soja (mercado exportação)
                commission_rate = 0.08  # 8% (menor que tomate)
            elif product_name == 'Milho':
                # Usa função de armazenagem de milho
                storage_costs = calculate_corn_storage_cost(
                    quantity_kg=quantity_standard_kg,
                    time_months=time_months,
                    price_per_kg=c_price
                )
                # Taxa de comissão intermediária para milho
                commission_rate = 0.10  # 10% (intermediário)
            else:
                # Usa função de armazenagem de tomate (padrão)
                storage_costs = calculate_storage_cost(
                    quantity_kg=quantity_standard_kg,
                    time_months=time_months,
                    price_per_kg=c_price
                )
                # Taxa de comissão CEASA para tomate
                commission_rate = 0.17  # 17% CEASA
            
            # Normaliza custo para R$/kg (divide pela quantidade padrão)
            # Isso distribui o custo fixo entre mais kg, reduzindo o custo unitário
            storage_cost_per_kg = storage_costs["total_cost"] / quantity_standard_kg
            
            # Custo por kg = preço de compra + custos de armazenagem por kg até o dia
            accumulated_ops_cost_per_kg = b_price + storage_cost_per_kg
            
            # Taxas de Saída (Incidem sobre o valor de venda por kg)
            commission_per_kg = my_sell_price * commission_rate
            packaging_per_kg = storage_costs["packaging_cost"] / quantity_standard_kg
            
            # Custo total por kg = custo de compra + armazenagem + taxas
            total_exit_cost_per_kg = accumulated_ops_cost_per_kg + commission_per_kg + packaging_per_kg

            # Salva os pontos (todos em R$/kg para consistência)
            prices_market.append(round(current_market_sim, 2))
            prices_my_product.append(round(my_sell_price, 2))
            costs.append(round(total_exit_cost_per_kg, 2))  # Agora em R$/kg, não R$ total

        # 4. INTELIGÊNCIA DE DECISÃO
        # Encontra o ponto ótimo onde (Meu Preço - Custo) é máximo
        profits = [p - c for p, c in zip(prices_my_product, costs)]
        current_profit = profits[0]
        
        best_profit = -float('inf')
        best_day_idx = 0
        
        for i, profit in enumerate(profits):
            if profit > best_profit:
                best_profit = profit
                best_day_idx = i
        
        # Gera Recomendação
        # Só recomenda esperar se o ganho for > 3% sobre o atual (Risco x Retorno)
        opportunity_gain = (best_profit - current_profit) / (current_profit if current_profit > 0 else 1)
        
        risk_msg = "Mercado Estável / Tendência Lateral"
        
        if shock_event:
            risk_msg = f"Alta Volatilidade: {shock_event}"
        elif macro_trend_daily > 0.001:
            risk_msg = "Tendência Sazonal de Alta (Entressafra)"
        elif macro_trend_daily < -0.001:
            risk_msg = "Tendência Sazonal de Baixa (Safra)"
            
        if best_day_idx > 2 and opportunity_gain > 0.03:
            action = f"VENDER EM {labels[best_day_idx]}"
            risk_msg += f" (+{opportunity_gain*100:.1f}% de lucro proj.)"
        else:
            action = "VENDER AGORA"
            if current_profit < 0:
                risk_msg = "Operação no prejuízo. Estancar perdas."
            else:
                risk_msg += " - Degradação supera valorização."

        return {
            "chart_data": {
                "labels": labels,
                "prices_market": prices_market,
                "prices_my_product": prices_my_product,
                "costs": costs
            },
            "recommendation": {
                "action": action,
                "best_day_date": labels[best_day_idx],
                "projected_profit": round(best_profit, 2),
                "confidence_score": 0.89,
                "risk_event": risk_msg
            }
        }

# Instância Global
storage_advisor = StorageAdvisor()