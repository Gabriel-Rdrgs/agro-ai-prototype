# ai-service/services/storage_advisor.py
"""
Serviço de recomendação de armazenagem com IA.
Implementa função custo do document-1.pdf e inteligência climática.

ATUALIZADO:
- Conectado ao agronomic_params.py (Sem hardcode)
- Conectado à Volatilidade de Mercado (Chuva = Preço Alto)
"""
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import hashlib
from typing import Dict, List, Tuple
import logging

from models.schemas import SimulationRequest, StorageAnalysisResponse
from config.crops import get_crop_specs
from config.constants import BRAZIL_CLIMATE_NORMS
from services.market_intelligence import market_intelligence
from services.climate.intelligence import climate_api
from utils.database import get_engine

logger = logging.getLogger(__name__)

# --- (CONSTANTES REMOVIDAS: Agora usamos agronomic_params via specs) ---

class StorageAdvisor:
    """
    Análise preditiva de viabilidade de armazenagem.
    Considera custos, perdas, clima e evolução de preço.
    """
    
    def __init__(self):
        self.engine = get_engine()
        logger.info("✅ StorageAdvisor iniciado (Modo Científico)")

    def _calculate_climate_risk(self, daily_temp_max: List[float], daily_temp_min: List[float], daily_rain: List[float], daily_sun: List[float]) -> float:
        """
        Calcula risco climático simplificado para o período de armazenagem.
        """
        risk_score = 0.0
        # Exemplo simples: Muita chuva na saída = Risco Logístico
        if daily_rain and sum(daily_rain) > 100:
            risk_score += 0.2
        return risk_score

    def _analyze_crop_history(self, accumulated_rain: float, specs: Dict) -> Tuple[float, str, float]:
        """
        Analisa o histórico da safra usando parâmetros científicos (specs).
        """
        # Recupera limites do specs (agronomic_params)
        min_rain = specs.get('min_rain_cycle', 400.0)
        max_rain = specs.get('max_rain_cycle', 600.0)
        
        storage_specs = specs.get('storage', {})
        base_loss = storage_specs.get('daily_loss_rate', 0.002) # 0.2% ao dia padrão

        if accumulated_rain is None:
            return 0.0, "", base_loss

        risk = 0.0
        msg = ""
        suggested_loss = base_loss

        # Cenario 1: Excesso de Chuva (Tomate inchado, menor pós-colheita)
        if accumulated_rain > max_rain:
            excess = accumulated_rain - max_rain
            # Risco sobe: +15% fixo + proporcional
            risk += 0.15 + (excess * 0.001)
            msg = f"Safra Chuvosa ({accumulated_rain:.0f}mm): Menor vida útil (pós-colheita reduzida)"
            suggested_loss = base_loss * 1.5 # Acelera a perda em 50%

        # Cenario 2: Seca (Estresse Hídrico)
        elif accumulated_rain < min_rain:
            risk += 0.10
            msg = f"Estresse Hídrico ({accumulated_rain:.0f}mm): Risco de defeitos/calibre menor"
            # Mantém perda base, mas avisa do risco
        
        return risk, msg, suggested_loss

    def analyze(self, data: SimulationRequest) -> Dict:
        """
        Gera análise de viabilidade de armazenagem (30 dias).
        Conecta: Clima (Chuva) -> Inteligência de Mercado (Preço) -> Custo (Energia/Perda).
        """
        logger.info(f"🔮 Análise Científica: {data.product} em {data.state}")
        
        # 1. CARREGAR PARÂMETROS CIENTÍFICOS (Fonte da Verdade)
        specs = get_crop_specs(data.product)
        storage_specs = specs.get('storage', {})
        
        # Custos operacionais (do arquivo, sem hardcode)
        cost_energy = storage_specs.get('energy_cost_per_kg_day', 0.025)
        
        # 2. Analisar Risco da Safra (Passando specs!)
        # Define a taxa de perda diária (quebra) baseada no histórico da chuva
        risk_score, risk_msg, daily_loss_rate = self._analyze_crop_history(data.accumulated_rainfall, specs)
        
        # Fator de risco do usuário (ex: "Alto Risco" no front multiplica a quebra)
        final_loss_rate = daily_loss_rate * data.risk_factor

        # 3. PREPARAÇÃO DO LOOP
        current_date = datetime.now()
        accumulated_cost = data.buy_price
        
        prices_kg = []
        costs_kg = []
        future_dates = []
        
        # 4. LOOP DE SIMULAÇÃO (30 DIAS)
        for day in range(1, 31):
            target_date = current_date + timedelta(days=day)
            future_dates.append(target_date.strftime('%d/%m'))
            
            # A. PEGAR A CHUVA DESTE DIA (Vinda da previsão do front ou API)
            rain_day = 0.0
            if data.daily_rain and len(data.daily_rain) > (day - 1):
                rain_day = float(data.daily_rain[day - 1])
            
            # B. CONSULTAR PREÇO COM VOLATILIDADE 🌩️
            # Aqui a mágica acontece: Se rain_day for alto, o preço sobe!
            raw_price = market_intelligence.get_predicted_market_price(
                data.product, 
                data.state, 
                target_date.month, 
                meteo_data={'rain_mm': rain_day} 
            )
            
            # C. APLICAR PERDA DE QUALIDADE
            # O preço de mercado pode subir, mas o NOSSO tomate vale menos a cada dia
            quality_factor = (1 - (final_loss_rate * day))
            if quality_factor < 0: quality_factor = 0 # Não vende lixo
            
            final_sell_price = raw_price * quality_factor
            prices_kg.append(round(final_sell_price, 2))
            
            # D. ACUMULAR CUSTOS
            accumulated_cost += cost_energy
            costs_kg.append(round(accumulated_cost, 2))

            # Debug Log (Só para dias de chuva forte)
            if rain_day > 20:
                logger.info(f"🌧️ Dia {day} ({rain_day}mm): Preço reagiu -> R$ {raw_price:.2f}")

        # 5. DECISÃO FINAL (Melhor dia para vender)
        # Lucro = Preço de Venda (ajustado p/ qualidade) - Custo Acumulado
        profits = [p - c for p, c in zip(prices_kg, costs_kg)]
        max_profit = max(profits)
        best_day_idx = profits.index(max_profit)
        
        # Lógica de Decisão
        if best_day_idx == 0 or max_profit < 0:
            action = 'VENDER IMEDIATAMENTE'
            if max_profit < 0:
                risk_msg += " (Operação inviável: Custos superam ganhos futuros)"
        else:
            action = f'ARMAZENAR ATÉ {future_dates[best_day_idx]}'

        return {
            'chart_data': {
                'labels': future_dates,
                'prices': prices_kg,
                'costs': costs_kg
            },
            'recommendation': {
                'action': action,
                'best_day_date': future_dates[best_day_idx],
                'projected_profit': round(max_profit, 2),
                'risk_note': risk_msg
            }
        }

# Instância Global
storage_advisor = StorageAdvisor()