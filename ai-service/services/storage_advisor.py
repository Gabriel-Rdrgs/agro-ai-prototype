# ai-service/services/storage_advisor.py
import numpy as np
from datetime import datetime, timedelta
import logging
import random

from models.schemas import SimulationRequest
from config.crops import get_crop_specs
from services.market_intelligence import market_intelligence
from utils.database import get_engine

logger = logging.getLogger(__name__)

class StorageAdvisor:
    """
    Análise preditiva de viabilidade de armazenagem.
    Padronizada com a lógica do Simulador (ArbitrageCalculator).
    """
    
    def __init__(self):
        self.engine = get_engine()
        logger.info("✅ StorageAdvisor iniciado (Padrão Custo Brasil)")

    def analyze(self, data: SimulationRequest) -> dict:
        """
        Gera análise de 30 dias com Momentum de Preço e Custo Suavizado.
        """
        # 1. Parâmetros e Normalização
        specs = get_crop_specs(data.product)
        unit_weight = specs.get('unit_weight_kg', 20.0)
        
        c_price = data.current_price
        if c_price > 15: c_price /= unit_weight
        
        b_price = data.buy_price
        if b_price > 15: b_price /= unit_weight
        
        storage_cost_day = data.storage_cost_per_day or 0.03
        
        # 2. Configuração de Volatilidade (Ondas de Mercado)
        is_rainy = (data.accumulated_rainfall or 0) > 50
        
        # Momentum Inicial (Tendência de curto prazo)
        # Se chove, viés de alta. Se sol, neutro.
        market_momentum = 0.002 if is_rainy else 0.0 
        
        current_simulated_price = c_price
        labels, prices, costs = [], [], []
        curr_date = datetime.now()

        # 3. Simulação de 30 dias
        for day in range(30):
            date_str = (curr_date + timedelta(days=day)).strftime("%d/%m")
            labels.append(date_str)
            
            # --- A. PREÇO COM MOMENTUM (ONDAS) 🌊 ---
            # Em vez de aleatório puro, o preço segue uma inércia.
            # A cada dia, o momentum muda um pouco, criando curvas suaves.
            
            # Mudança na força do mercado (-1% a +1%)
            momentum_shift = random.uniform(-0.01, 0.01)
            
            # Se chover, força o momentum para cima (viés de escassez)
            if is_rainy and random.random() < 0.3:
                momentum_shift += 0.005 

            # Atualiza o momentum (com decaimento para não explodir)
            market_momentum = (market_momentum * 0.8) + momentum_shift
            
            # Aplica o momentum ao preço
            current_simulated_price *= (1 + market_momentum)
            
            # Ruído diário pequeno (volatilidade intradia)
            noise = random.uniform(-0.005, 0.005)
            final_daily_price = current_simulated_price * (1 + noise)

            # --- B. CUSTOS SUAVIZADOS (Realidade Refrigerada) ❄️ ---
            
            # 1. Custo Base (Produto + Geladeira)
            base_cost_accumulated = b_price + (storage_cost_day * day)
            
            # 2. Quebra Técnica (Calibrada para Menos Agressiva)
            # Começa com 2% (seleção na entrada) + 0.1% ao dia (refrigerado)
            # Dia 30 = ~5% de perda (muito mais realista que os 15% de antes)
            breakage_pct = 0.02 + (day * 0.001)
            
            # Teto de segurança (máximo 20% de perda em 30 dias)
            if breakage_pct > 0.20: breakage_pct = 0.20
            
            # 3. Custo Efetivo
            effective_cost = base_cost_accumulated / (1 - breakage_pct)
            
            # 4. Taxas de Mercado (Mantidas)
            market_fees = final_daily_price * 0.17
            packaging_cost = 0.175 
            
            total_breakeven_price = effective_cost + market_fees + packaging_cost

            prices.append(round(final_daily_price, 2))
            costs.append(round(total_breakeven_price, 2))

        # 4. Decisão e Recomendação
        last_profit = prices[-1] - costs[-1]
        current_profit = prices[0] - costs[0]
        
        # Encontra topo de lucro
        best_profit = -float('inf')
        best_day_idx = 0
        for i, (p, c) in enumerate(zip(prices, costs)):
            if (p - c) > best_profit:
                best_profit = (p - c)
                best_day_idx = i
        
        risk_msg = "Mercado Estável"
        if is_rainy: risk_msg = "Alta Volatilidade (Chuva)"
        
        # Lógica de "Vender Agora" mais inteligente
        # Se o lucro futuro for apenas centavos maior que hoje, não vale o risco.
        # Exigimos pelo menos 5% de ganho extra para recomendar esperar.
        threshold = current_profit * 1.05
        
        if best_profit > threshold and best_day_idx > 0:
            action = f"VENDER EM {labels[best_day_idx]}"
            risk_msg += " - Tendência de Alta detectada"
        else:
            action = "VENDER AGORA"
            risk_msg += " - Melhor momento é hoje"

        return {
            "chart_data": {"labels": labels, "prices": prices, "costs": costs},
            "recommendation": {
                "action": action,
                "best_day_date": labels[best_day_idx],
                "projected_profit": round(best_profit, 2),
                "confidence_score": 0.85 if is_rainy else 0.95,
                "risk_event": risk_msg
            }
        }

# Instância Global
storage_advisor = StorageAdvisor()