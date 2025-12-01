"""
Serviço de recomendação de armazenagem com IA.
Implementa função custo do document-1.pdf.

CORREÇÕES CRÍTICAS APLICADAS:
- Perdas: 0,2%/dia (era 1,5%/dia ❌) - document-1.pdf
- Custo energia: R$ 0,025/kg·dia (document-1.pdf)
- Normalização de unidades: sempre em KG
- Preço acumulado = Compra + Custos de armazenagem
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

# --- CONSTANTES TÉCNICAS (Fonte: parametrização.pdf e document 1.pdf) ---
COST_ENERGY_PER_KG_DAY = 0.025  # R$ 0,025 (Refrigeração)
COST_PACKAGING_PER_KG = 0.10    # R$ 0,10 (Entrada)

# Parâmetros Biológicos (parametrização.pdf - Pág 1)
BIO_PARAMS = {
    'temp': {
        'min_night': 14.0,      # Pegamento de frutos
        'min_critical': 10.0,   # Dano por frio
        'max_critical': 34.0,   # Abortamento
        'ideal_min': 18.0,
        'ideal_max': 27.0
    },
    'radiation': {
        'min_mj': 8.4,          # Mínimo para fotossíntese eficiente
        'critical_mj': 7.5      # Risco de frutos ocos/baixo brix
    },
    'rain': {
        'monthly_limit': 150.0,
        'disease_trigger': 100.0,
        'cycle_min': 400.0,  # 👇 Mínimo ideal (Estresse hídrico se for menor)
        'cycle_max': 600.0   # 👇 Máximo ideal (Risco de podridão se for maior)
    },
    'loss': {
        'min': 0.0015,  # 0.15% ao dia
        'avg': 0.0025,  # 0.25% ao dia (Média de referência)
        'max': 0.0035   # 0.35% ao dia
    }
}

class StorageAdvisor:
    """
    Análise preditiva de viabilidade de armazenagem.
    Considera custos, perdas, clima e evolução de preço.
    """
    
    def __init__(self):
        self.engine = get_engine()
        logger.info("✅ StorageAdvisor iniciado")

    def _calculate_climate_risk(self, daily_temp_max: List[float], daily_temp_min: List[float], daily_rain: List[float], daily_sun: List[float]) -> Tuple[float, str]:
        """
        Analisa risco climático conforme 'parametrização.pdf'.
        Considera: Temperatura, Chuva (Doenças) e Radiação (Qualidade).
        """
        risk_penalty = 0.0
        alerts = []
        
        # Validação básica de listas vazias
        if not daily_temp_max: return 0.0, ""

        # 1. Análise de Radiação (Qualidade do Fruto - Frutos Ocos/Brix)
        if daily_sun:
            avg_sun = sum(daily_sun) / len(daily_sun)
            if avg_sun < BIO_PARAMS['radiation']['critical_mj']:
                risk_penalty += 0.15
                alerts.append(f"Radiação Crítica ({avg_sun:.1f} MJ): Risco de frutos ocos/baixo brix")
            elif avg_sun < BIO_PARAMS['radiation']['min_mj']:
                risk_penalty += 0.05
                alerts.append("Baixa luminosidade: Maturação lenta")

        # 2. Análise de Chuva (Doenças Fúngicas)
        if daily_rain:
            total_rain = sum(daily_rain)
            # Se a projeção de 30 dias extrapolar o limite mensal proporcional
            if total_rain > BIO_PARAMS['rain']['monthly_limit']:
                risk_penalty += 0.20
                alerts.append(f"Excesso de Chuva ({total_rain:.0f}mm): Alto risco fúngico")

        # 3. Análise Térmica (Stress Fisiológico)
        days_analyzed = min(len(daily_temp_max), 30)
        for i in range(days_analyzed):
            t_max = daily_temp_max[i]
            t_min = daily_temp_min[i]

            # Calor Extremo (Abortamento)
            if t_max >= BIO_PARAMS['temp']['max_critical']:
                risk_penalty += 0.02 # Acumula por dia de calor
                if "Calor excessivo" not in alerts: alerts.append("Calor (>34°C): Risco de abortamento")
            
            # Frio (Pegamento/Dano)
            if t_min <= BIO_PARAMS['temp']['min_critical']:
                risk_penalty += 0.03 # Frio é severo
                if "Frio intenso" not in alerts: alerts.append("Frio (<10°C): Dano tecidual")

        return min(0.6, risk_penalty), " | ".join(alerts[:3]) # Limita a 3 alertas

    def _analyze_crop_history(self, accumulated_rain: float) -> Tuple[float, str, float]:
        """
        Analisa o histórico da safra (Chuva acumulada no ciclo).
        Regra: Ideal entre 400mm e 600mm (Fonte: parametrização.pdf).
        """
        if accumulated_rain is None:
            return 0.0, "", BIO_PARAMS['loss']['avg']

        risk = 0.0
        msg = ""
        suggested_loss = BIO_PARAMS['loss']['avg'] # 0.25% (Padrão)

        # Cenario 1: Excesso de Chuva (>600mm) -> Tomate "inchado", cutícula fina
        if accumulated_rain > BIO_PARAMS['rain']['cycle_max']:
            excess = accumulated_rain - BIO_PARAMS['rain']['cycle_max']
            # Risco sobe rápido: +10% de risco a cada 100mm excedente
            risk += 0.15 + (excess * 0.001) 
            msg = f"Safra Chuvosa ({accumulated_rain:.0f}mm): Fruto com menor pós-colheita"
            suggested_loss = BIO_PARAMS['loss']['max'] # Força perda máxima (0.35%)

        # Cenario 2: Seca (<400mm) -> Podridão apical / Defeitos
        elif accumulated_rain < BIO_PARAMS['rain']['cycle_min']:
            risk += 0.10
            msg = f"Estresse Hídrico ({accumulated_rain:.0f}mm): Risco de defeitos/calibre menor"
            # Perda mantém média, mas confiança da venda cai
        
        return risk, msg, suggested_loss
    
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
    
    # 👇 COLE ISTO ANTES DE "def predict_storage_viability..." 👇
    
    def _get_regional_energy_cost(self, state: str, month: int) -> float:
        """
        Calcula o custo de energia baseado na região e estação do ano.
        Base: R$ 0,025/kg/dia (document-1.pdf)
        """
        base_cost = COST_ENERGY_PER_KG_DAY
        
        sul = ['RS', 'SC', 'PR']
        sudeste = ['SP', 'MG', 'RJ', 'ES']
        nordeste_norte = ['BA', 'PE', 'CE', 'MA', 'RN', 'PA', 'AM', 'TO']
        centro = ['GO', 'MT', 'MS', 'DF']
        
        state = state.upper().strip()
        factor = 1.0
        
        # Inverno (Mai-Ago)
        if 5 <= month <= 8:
            if state in sul: factor = 0.60
            elif state in sudeste: factor = 0.80
            elif state in centro: factor = 0.90
            
        # Verão (Nov-Fev)
        elif month in [11, 12, 1, 2]:
            if state in sul: factor = 1.10
            elif state in sudeste: factor = 1.20
            elif state in nordeste_norte: factor = 1.30
            elif state in centro: factor = 1.25
            
        return base_cost * factor
    

    def predict_storage_viability(self, data: SimulationRequest) -> Dict:
        """
        Simula 30 dias de armazenagem.
        Lógica Day 0: Força Margem de 30% (Custo = 70% da Venda).
        """
        logger.info(f"📦 Iniciando análise: {data.product} ({data.state})")
        
        # 1. CONFIGURAÇÃO & NORMALIZAÇÃO
        product_key = data.product.strip().capitalize()
        specs = get_crop_specs(product_key)
        specs['product_key'] = product_key
        
        # Normaliza Preço de VENDA (Referência do Ceasa - Linha Verde)
        sell_price_kg, _ = self._normalize_units(data.current_price, 0, specs)

        # 👇 CORREÇÃO DO GAP: Forçamos a regra de negócio (30% de margem bruta)
        # Ignoramos o data.buy_price para evitar "dupla tributação" da margem
        buy_price_kg = sell_price_kg * 0.70
        
        # Custo de Energia Regionalizado (A função que colamos acima)
        current_month = datetime.now().month
        regional_energy_cost = self._get_regional_energy_cost(data.state, current_month)
        
        # ========================================
        # 2. PREPARAÇÃO CLIMÁTICA (MANTIDO)
        # ========================================
        climate_data = self._get_climate_forecast(data, current_month)
        monthly_rain_avg = climate_data['monthly_rain_avg']
        solar_mj_avg = climate_data['solar_mj_avg']
        forecast_rain = climate_data['forecast_rain']
        
        days = 30
        days_blind = max(0, days - len(forecast_rain))
        missing_rain = max(0, monthly_rain_avg - sum(forecast_rain))
        daily_avg_missing = missing_rain / days_blind if days_blind > 0 else 0
        
        seed_source = f"{data.product}-{data.state}-{datetime.now().strftime('%Y-%m-%d')}"
        seed_val = int(hashlib.sha256(seed_source.encode('utf-8')).hexdigest(), 16) % (2**32)
        rng = np.random.RandomState(seed_val)
        
        final_rain = list(forecast_rain)
        for _ in range(days_blind):
            sim_rain = rng.normal(daily_avg_missing, daily_avg_missing * 0.5) if rng.random() < 0.6 else 0
            final_rain.append(max(0, sim_rain))
        final_rain = final_rain[:days]
        
        # ========================================
        # 3. ANÁLISE DE RISCO (MANTIDO)
        # ========================================
        climate_risk, future_msg = self._calculate_climate_risk(
            data.daily_temp_max, data.daily_temp_min, final_rain, data.daily_sun
        )

        acc_rain = data.accumulated_rainfall if data.accumulated_rainfall is not None else 500.0
        # Chama a análise automática de safra
        if data.lat and data.lng:
            real_rain = climate_api.get_accumulated_rain_recent(data.lat, data.lng, days_back=120)
            past_risk, past_msg, crop_loss_rate = self._analyze_crop_history(real_rain)
            past_msg = f"{past_msg} (Real: {real_rain:.0f}mm)" if past_msg else ""
        else:
            past_risk, past_msg, crop_loss_rate = self._analyze_crop_history(acc_rain)

        current_loss_rate = crop_loss_rate
        if climate_risk > 0.15:
            current_loss_rate = max(current_loss_rate, BIO_PARAMS['loss']['max'])

        total_risk = climate_risk + past_risk
        combined_msg = " | ".join(filter(None, [past_msg, future_msg])) or "Condições Favoráveis"

        # ========================================
        # 4. SIMULAÇÃO DE 30 DIAS
        # ========================================
        model, volatility = market_intelligence.get_prediction_model(data.product)
        
        prices_kg = []
        costs_kg = []
        future_dates = []
        
        vol_boost = specs.get('volatility_factor', 1.0)
        quality_factor = 1.0
        
        required_sun = specs.get('min_solar_mj', 8.4)
        if solar_mj_avg < required_sun:
            deficit = (required_sun - solar_mj_avg) / required_sun
            quality_factor -= deficit * 0.5 
        
        # 👇 CALIBRAGEM DA IA (NOVO) 👇
        # Calcula o "Erro" do modelo para o dia de hoje e ajusta toda a curva
        model_offset = 0.0
        if model:
            try:
                today_ordinal = datetime.now().toordinal()
                pred_today = float(model.predict(pd.DataFrame({'date_ordinal': [today_ordinal]}))[0])
                
                # Normaliza se necessário (mesma lógica do loop)
                weight = specs.get('unit_weight_kg', 1.0)
                if (product_key == 'Tomate' and pred_today > 15.0): pred_today /= weight
                elif (product_key in ['Soja', 'Milho'] and pred_today > 10.0): pred_today /= weight
                
                # O Offset é a diferença entre a Realidade e a IA
                model_offset = sell_price_kg - pred_today
                logger.info(f"📐 Calibrando IA: Real R${sell_price_kg:.2f} vs IA R${pred_today:.2f} | Offset: {model_offset:.2f}")
            except Exception as e:
                logger.warning(f"⚠️ Falha ao calibrar modelo: {e}")

        for i in range(days):
            future_date = datetime.now() + timedelta(days=i)
            future_dates.append(future_date.strftime('%d/%m'))
            
            # --- CÁLCULO DE CUSTO ---
            c_fixed = COST_PACKAGING_PER_KG
            c_energy = regional_energy_cost * i
            c_loss = (buy_price_kg * current_loss_rate) * i
            
            total_cost = buy_price_kg + c_fixed + c_energy + c_loss
            costs_kg.append(round(total_cost, 2))
            
            # --- CÁLCULO DE PREÇO (COM TRAVA NO DIA 0) ---
            if i == 0:
                # 🔒 DIA 0: REALIDADE PURA
                # Começa exatamente no preço do Ceasa (Linha Verde)
                # Garante que a relação visual com a linha Vermelha seja exata
                prices_kg.append(round(sell_price_kg, 2))
            else:
                # 🌊 DIA 1+: SIMULAÇÃO COM IA
                trend = sell_price_kg
                if model:
                    try:
                        X_pred = pd.DataFrame({'date_ordinal': [future_date.toordinal()]})
                        raw_pred = float(model.predict(X_pred)[0])
                        
                        weight = specs.get('unit_weight_kg', 1.0)
                        if (product_key == 'Tomate' and raw_pred > 15.0): raw_pred /= weight
                        elif (product_key in ['Soja', 'Milho'] and raw_pred > 10.0): raw_pred /= weight
                        
                        trend = raw_pred + model_offset
                    except Exception: pass
                
                # Sazonalidade
                if product_key == 'Tomate' and future_date.month in [4, 5, 6, 7]:
                    trend *= 1 + 0.005 * i
                
                # Impacto Chuva
                impact = 0.0
                if final_rain[i] > specs.get('rain_logistics_limit', 20):
                    impact = 0.05 + (total_risk * 0.1)
                
                # Ruído (Volatilidade)
                noise = rng.normal(0, volatility * vol_boost * 0.5)
                
                final_price_kg = max(0.5, trend * quality_factor * (1 + impact) + noise)
                prices_kg.append(round(final_price_kg, 2))
        
        # ========================================
        # 5. DECISÃO FINAL
        # ========================================
        net_profits = []
        for p, c in zip(prices_kg, costs_kg):
            net_profits.append(p - c)
        
        max_profit = max(net_profits)
        best_idx = net_profits.index(max_profit)
        
        if best_idx == 0:
            action = 'VENDER IMEDIATAMENTE'
            conf_score = 0.90
        else:
            action = 'ARMAZENAR'
            conf_score = max(0.20, 0.95 - total_risk)

        logger.info(f"✅ Análise {data.state}: Energia R$ {regional_energy_cost:.4f}/dia | Buy: {buy_price_kg:.2f} | Sell: {sell_price_kg:.2f}")
        
        return {
            'chart_data': {
                'labels': future_dates,
                'prices': prices_kg,
                'costs': costs_kg
            },
            'recommendation': {
                'action': action,
                'best_day_date': future_dates[best_idx],
                'projected_profit': round(max_profit, 2),
                'confidence_score': round(conf_score, 2),
                'risk_event': combined_msg
            }
        }

# ========================================
# INSTÂNCIA GLOBAL (Singleton)
# ========================================
storage_advisor = StorageAdvisor()
