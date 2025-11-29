# services/storage_advisor.py
"""
Serviço de recomendação de armazenagem com IA.
Implementa função custo do document-1.pdf.

CORREÇÕES CRÍTICAS APLICADAS:
- Perdas: 0,2%/dia (era 1,5%/dia ❌) - document-1.pdf
- Custo energia: R$ 0,025/kg·dia (document-1.pdf)
- Normalização de unidades: sempre em KG
- Preço acumulado = Compra + Custos de armazenagem
"""

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


class StorageAdvisor:
    """
    Análise preditiva de viabilidade de armazenagem.
    Considera custos, perdas, clima e evolução de preço.
    """
    
    def __init__(self):
        self.engine = get_engine()
        logger.info("✅ StorageAdvisor iniciado")
    
    def _normalize_units(
        self, 
        raw_price: float, 
        raw_cost: float, 
        specs: Dict
    ) -> Tuple[float, float]:
        """
        Detecta e converte unidades comerciais (Caixa/Saca) para Kg.
        
        Args:
            raw_price: Preço como vem do usuário
            raw_cost: Custo diário como vem do usuário
            specs: Especificações da cultura (CROPS_SPECS)
        
        Returns:
            (price_per_kg, daily_cost_kg)
        """
        product_key = specs.get('product_key', 'Default')
        weight = specs.get('unit_weight_kg', 1.0)
        
        # Detecção de unidade comercial
        is_commercial_unit = False
        
        if (product_key == 'Tomate' and raw_price > 15.0) or \
           (product_key in ['Soja', 'Milho'] and raw_price > 10.0):
            is_commercial_unit = True
        
        # Conversão para KG
        if is_commercial_unit:
            price_per_kg = raw_price / weight
            
            # ✅ SEGREDO: Se preço é caixa, custo também é!
            # Usuário informa: "Caixa custa R$ 80, armazenar custa R$ 0,10/dia"
            # Esse R$ 0,10 é POR CAIXA, não por kg!
            daily_cost_kg = raw_cost / weight
            
            logger.info(
                f"🔄 Convertido: Preço R$ {raw_price:.2f}/{weight}kg "
                f"→ R$ {price_per_kg:.2f}/kg | "
                f"Custo R$ {raw_cost:.2f} → R$ {daily_cost_kg:.4f}/kg·dia"
            )
        else:
            price_per_kg = raw_price
            daily_cost_kg = raw_cost
        
        # Validação de sanidade
        if daily_cost_kg <= 0 or daily_cost_kg > price_per_kg:
            logger.warning(
                f"⚠️ Custo diário suspeito ({daily_cost_kg:.4f}), "
                f"usando padrão do PDF"
            )
            # Fallback: usa valor do PDF (R$ 0,025/kg·dia)
            daily_cost_kg = specs.get('energy_cost_daily_kg', 0.025)
        
        return price_per_kg, daily_cost_kg
    
    def _get_climate_forecast(
        self, 
        data: SimulationRequest, 
        current_month: int
    ) -> Dict:
        """
        Busca dados climáticos (histórico + previsão).
        
        Returns:
            {
                'monthly_rain_avg': 150.0,
                'solar_mj_avg': 18.0,
                'forecast_rain': [2.5, 0, 5.2, ...]
            }
        """
        # Busca histórico
        if data.lat and data.lng:
            try:
                monthly_rain_avg = climate_api.get_rain_history(
                    data.lat, data.lng, current_month
                )
                solar_mj_avg = climate_api.get_solar_radiation(
                    data.lat, data.lng, current_month
                )
            except Exception as e:
                logger.warning(f"⚠️ Erro ao buscar clima: {e}")
                monthly_rain_avg = BRAZIL_CLIMATE_NORMS.get(
                    data.state, {}
                ).get(current_month, 150)
                solar_mj_avg = 18.0
        else:
            monthly_rain_avg = BRAZIL_CLIMATE_NORMS.get(
                data.state, {}
            ).get(current_month, 150)
            solar_mj_avg = 18.0
        
        # Previsão de chuva (fornecida ou simulada)
        forecast_rain = data.daily_rain if data.daily_rain else [0] * 16
        
        return {
            'monthly_rain_avg': monthly_rain_avg,
            'solar_mj_avg': solar_mj_avg,
            'forecast_rain': forecast_rain
        }
    
    def predict_storage_viability(
        self, 
        data: SimulationRequest
    ) -> StorageAnalysisResponse:
        """
        Simula 30 dias de armazenagem considerando:
        - Custos fixos + variáveis (document-1.pdf)
        - Perdas por deterioração (0,2%/dia - PDF)
        - Evolução de preço (IA)
        - Impactos climáticos (chuva, insolação)
        
        Returns:
            Recomendação: ARMAZENAR ou VENDER IMEDIATAMENTE
        """
        logger.info(f"📦 Iniciando análise de armazenagem: {data.product}")
        
        # ========================================
        # 1. CONFIGURAÇÃO
        # ========================================
        product_key = data.product.strip().capitalize()
        specs = get_crop_specs(product_key)
        specs['product_key'] = product_key  # Adiciona para _normalize_units
        
        # Normaliza unidades para KG
        price_per_kg, daily_cost_kg = self._normalize_units(
            data.current_price,
            data.storage_cost_per_day if data.storage_cost_per_day > 0 else 0.10,
            specs
        )
        
        # ========================================
        # 2. CLIMA
        # ========================================
        current_month = datetime.now().month
        climate_data = self._get_climate_forecast(data, current_month)
        
        monthly_rain_avg = climate_data['monthly_rain_avg']
        solar_mj_avg = climate_data['solar_mj_avg']
        forecast_rain = climate_data['forecast_rain']
        
        # Gap fill (completa até 30 dias)
        days = 30
        days_blind = max(0, days - len(forecast_rain))
        missing_rain = max(0, monthly_rain_avg - sum(forecast_rain))
        daily_avg_missing = missing_rain / days_blind if days_blind > 0 else 0
        
        # Seed para reprodutibilidade
        seed_source = f"{data.product}-{data.state}-{datetime.now().strftime('%Y-%m-%d')}"
        seed_val = int(hashlib.sha256(seed_source.encode('utf-8')).hexdigest(), 16) % (2**32)
        rng = np.random.RandomState(seed_val)
        
        final_rain = list(forecast_rain)
        for _ in range(days_blind):
            sim_rain = (
                rng.normal(daily_avg_missing, daily_avg_missing * 0.5) 
                if rng.random() < 0.6 else 0
            )
            final_rain.append(max(0, sim_rain))
        
        final_rain = final_rain[:days]
        
        # ========================================
        # 3. SIMULAÇÃO DE 30 DIAS
        # ========================================
        model, volatility = market_intelligence.get_prediction_model(data.product)
        
        prices_kg = []
        costs_kg = []
        future_dates = []
        risk_acc = 0
        
        vol_boost = specs.get('volatility_factor', 1.0)
        quality_factor = 1.0
        
        # ✅ CORREÇÃO PDF: Verifica insolação mínima (8.4 MJ)
        required_sun = specs.get('min_solar_mj', 0)
        if required_sun > 0 and solar_mj_avg < required_sun:
            deficit = (required_sun - solar_mj_avg) / required_sun
            quality_factor -= deficit * 0.5  # Penaliza qualidade (Brix)
            if deficit > 0.2:
                risk_acc += 2
        
        # ✅ CORREÇÃO PDF: Perdas = 0,2%/dia (document-1.pdf)
        daily_loss_rate = specs.get('storage_loss_rate_daily', 0.002)  # 0,2%/dia
        
        for i in range(days):
            future_date = datetime.now() + timedelta(days=i)
            future_dates.append(future_date.strftime('%d/%m'))
            
            # ========================================
            # CUSTO ACUMULADO (document-1.pdf)
            # ========================================
            # Custo = Energia diária × dias
            # Perdas são aplicadas no volume, não no custo direto
            accumulated_cost = i * daily_cost_kg
            costs_kg.append(round(accumulated_cost, 4))
            
            # ========================================
            # PREDIÇÃO DE PREÇO (IA + Tendência)
            # ========================================
            trend = price_per_kg
            
            if model:
                try:
                    X_pred = pd.DataFrame({'date_ordinal': [future_date.toordinal()]})
                    predicted = float(model.predict(X_pred)[0])
                    
                    # Safety check: converte se vier em unidade comercial
                    weight = specs.get('unit_weight_kg', 1.0)
                    if (product_key == 'Tomate' and predicted > 15.0):
                        predicted /= weight
                    elif (product_key in ['Soja', 'Milho'] and predicted > 10.0):
                        predicted /= weight
                    
                    trend = predicted
                except Exception as e:
                    logger.warning(f"⚠️ Erro na predição dia {i}: {e}")
            
            # Ajuste sazonal (Tomate em outono/inverno sobe)
            if product_key == 'Tomate' and future_date.month in [4, 5, 6, 7]:
                trend *= 1 + 0.005 * i  # +0,5% por dia
            
            # Aplica fator de qualidade (insolação)
            trend *= quality_factor
            
            # Impacto de chuva
            impact = 0.0
            if final_rain[i] > specs.get('rain_logistics_limit', 20):
                impact = 0.12 * vol_boost
                risk_acc += 1
            
            # Ruído estocástico
            noise = rng.normal(0, volatility * vol_boost * 0.5)
            
            # Preço final
            final_price_kg = max(0.5, trend * (1 + impact) + noise)
            prices_kg.append(round(final_price_kg, 2))
        
        # ========================================
        # 4. DECISÃO
        # ========================================
        base_ref = price_per_kg
        
        # Lucro líquido = Preço Futuro - Preço Base - Custo Armazenagem - Perdas
        net_profit = []
        for i, (p, c) in enumerate(zip(prices_kg, costs_kg)):
            # Aplica perdas acumuladas no valor
            loss_factor = 1 - (daily_loss_rate * i)  # Ex: dia 10 = 98% do valor
            effective_price = p * loss_factor
            
            profit = effective_price - base_ref - c
            net_profit.append(profit)
        
        max_profit = max(net_profit)
        best_idx = net_profit.index(max_profit)
        
        # Análise de risco
        risk_msg = 'Tendência favorável.'
        if quality_factor < 0.95:
            risk_msg = f'Alerta: Baixa insolação ({solar_mj_avg:.1f} MJ) afeta qualidade (Brix).'
        
        # Decisão
        action = 'ARMAZENAR' if max_profit > 0.10 else 'VENDER IMEDIATAMENTE'
        
        # Confiança
        conf_score = 0.95 if (data.lat and solar_mj_avg > 10) else 0.80
        if risk_acc > 5:
            conf_score -= 0.15
        
        logger.info(
            f"✅ Decisão: {action} | "
            f"Lucro máximo: R$ {max_profit:.2f}/kg no dia {best_idx+1} | "
            f"Confiança: {conf_score:.0%}"
        )
        
        return {
            'chart_data': {
                'labels': future_dates,
                'prices': prices_kg,
                'costs': costs_kg
            },
            'recommendation': {
                'action': action,
                'best_day_date': future_dates[best_idx] if max_profit > -5 else 'Hoje',
                'projected_profit': round(max_profit, 2),
                'confidence_score': round(conf_score, 2),
                'risk_event': risk_msg
            }
        }


# ========================================
# INSTÂNCIA GLOBAL (Singleton)
# ========================================
storage_advisor = StorageAdvisor()
