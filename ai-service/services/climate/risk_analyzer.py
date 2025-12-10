# services/climate/risk_analyzer.py
"""
Analisador de risco climático para culturas.
✅ FONTE ÚNICA DA VERDADE: config.mathematical_formulas

Todas as avaliações climáticas usam as funções padronizadas dos PDFs base.
"""

import logging
from typing import Dict, Tuple, List
from datetime import datetime

from .intelligence import climate_api
from config.crops import CROPS_SPECS
from config.mathematical_formulas import (
    evaluate_temperature_risk,
    evaluate_solar_radiation,
    evaluate_rainfall,
    MIN_SOLAR_RADIATION,
    TEMPERATURE_THRESHOLDS
)
from utils.database import get_engine
from sqlalchemy import text

logger = logging.getLogger(__name__)


class TomatoRiskAnalyzer:
    """
    Analisador de risco climático específico para tomate.
    Baseado em document.pdf (Clima e Produção de Tomates no Brasil).
    """
    
    def __init__(self):
        self.engine = get_engine()
        self.specs = CROPS_SPECS['Tomate']
        logger.info("✅ TomatoRiskAnalyzer iniciado")
    
    def calculate_risk(self, meteo_data: Dict) -> Tuple[float, str]:
        """
        Calcula score de risco climático para tomate.
        
        Args:
            meteo_data: {
                'radiation_mj': 18.5,
                'rain_mm': 45.2,       # Chuva acumulada 7 dias
                'humidity_pct': 72.0
            }
        
        Returns:
            (risk_score, reasons)
            risk_score: 0.0 (sem risco) a 1.0 (risco máximo)
            reasons: String com justificativas
        """
        risk_score = 0.0
        reasons = []
        
        # ========================================
        # 1. RADIAÇÃO SOLAR
        # ✅ USA: evaluate_solar_radiation() de mathematical_formulas.py
        # ========================================
        radiation = meteo_data.get('radiation_mj', 18.0)
        solar_eval = evaluate_solar_radiation(radiation)
        
        if not solar_eval["adequate"]:
            # Converte score (0-1) para penalty (0-0.3)
            risk_penalty = (1.0 - solar_eval["score"]) * 0.3
            risk_score += risk_penalty
            reasons.append(solar_eval["message"])
            logger.warning(f"⚠️ {solar_eval['message']}")
        
        # ========================================
        # 2. PRECIPITAÇÃO
        # ✅ USA: evaluate_rainfall() de mathematical_formulas.py
        # ========================================
        # Converte chuva 7 dias para mm/ciclo (aproximação: 7 dias = 7/120 do ciclo)
        rain_7days = meteo_data.get('rain_mm', 0)
        rain_per_cycle = rain_7days * (120 / 7)  # Projeta para ciclo completo
        
        humidity = meteo_data.get('humidity_pct', 65.0)
        rain_eval = evaluate_rainfall(rain_per_cycle, humidity)
        
        if not rain_eval["rainfall_adequate"]:
            # Converte score (0-1) para penalty (0-0.4)
            risk_penalty = (1.0 - rain_eval["rainfall_score"]) * 0.4
            risk_score += risk_penalty
            reasons.append(rain_eval["rainfall_message"])
            logger.warning(f"⚠️ {rain_eval['rainfall_message']}")
        
        # Avalia umidade se disponível
        if "humidity_score" in rain_eval and rain_eval["humidity_score"] < 0.8:
            risk_penalty = (1.0 - rain_eval["humidity_score"]) * 0.3
            risk_score += risk_penalty
            reasons.append(rain_eval["humidity_message"])
        
        # ========================================
        # 3. TEMPERATURA
        # ✅ USA: evaluate_temperature_risk() de mathematical_formulas.py
        # ========================================
        temp_avg = meteo_data.get('temp_avg', 22.0)
        if 'temp_avg' not in meteo_data:
            # Tenta calcular média se tiver min/max
            temp_max = meteo_data.get('temp_max', 25.0)
            temp_min = meteo_data.get('temp_min', 18.0)
            temp_avg = (temp_max + temp_min) / 2.0
        
        # Avalia para fase de desenvolvimento vegetativo (padrão)
        temp_eval = evaluate_temperature_risk(temp_avg, "vegetative_growth")
        
        if temp_eval["risk_level"] in ["moderate", "high", "critical"]:
            # Converte score (0-1) para penalty
            risk_penalty = (1.0 - temp_eval["score"]) * 0.3
            risk_score += risk_penalty
            reasons.append(temp_eval["message"])
            logger.warning(f"⚠️ {temp_eval['message']}")
        
        # ========================================
        # 4. RESULTADO FINAL
        # ========================================
        # Limita entre 0 e 1
        risk_score = min(max(risk_score, 0.0), 1.0)
        
        # Se não há riscos, mensagem positiva
        if not reasons:
            reasons.append("Condições climáticas favoráveis")
        
        reasons_str = ", ".join(reasons)
        
        logger.info(f"📊 Score de Risco: {risk_score:.2f} | {reasons_str}")
        
        return (round(risk_score, 2), reasons_str)


class MarketPriceUpdater:
    """
    Robô que atualiza preços de tomate baseado em condições climáticas.
    MIGRADO de climate_intelligence.py (função update_market_prices).
    """
    
    def __init__(self):
        self.engine = get_engine()
        self.risk_analyzer = TomatoRiskAnalyzer()
        logger.info("✅ MarketPriceUpdater iniciado")
    
    def update_tomato_prices(self) -> Dict:
        """
        Atualiza preços de tomate em todas as localidades baseado no clima.
        
        Returns:
            {
                'locations_scanned': 15,
                'locations_updated': 12,
                'average_risk': 0.25,
                'timestamp': '2025-11-29 17:10:00'
            }
        """
        logger.info("🍅 INICIANDO ATUALIZAÇÃO DE PREÇOS CLIMÁTICOS...")
        
        try:
            with self.engine.connect() as connection:
                # Busca todas as localidades de tomate
                query = text("""
                    SELECT id, city, state, lat, lng, "buyPrice", "sellPrice"
                    FROM "Opportunity"
                    WHERE product = 'Tomate' AND lat IS NOT NULL AND lng IS NOT NULL
                """)
                
                locations = connection.execute(query).fetchall()
                
                if not locations:
                    logger.warning("⚠️ Nenhuma localidade de tomate encontrada")
                    return {'error': 'No locations found'}
                
                logger.info(f"🗺️ Encontradas {len(locations)} localidades")
                
                updated_count = 0
                total_risk = 0.0
                
                for row in locations:
                    opp_id = row.id
                    city = row.city
                    state = row.state
                    lat = row.lat
                    lng = row.lng
                    
                    # Preços atuais (conversão segura)
                    current_buy = float(row.buyPrice) if row.buyPrice else 4.00
                    current_sell = float(row.sellPrice) if row.sellPrice else 5.50
                    
                    # Calcula margem atual
                    current_margin = current_sell / current_buy if current_buy > 0 else 1.35
                    
                    logger.info(f"📍 Analisando: {city} ({state})...")
                    
                    # Busca dados climáticos
                    meteo_data = climate_api.get_advanced_agrometeo(lat, lng)
                    
                    if not meteo_data:
                        logger.warning(f"⚠️ Sem dados climáticos para {city}")
                        continue
                    
                    # Calcula risco
                    risk_score, risk_reasons = self.risk_analyzer.calculate_risk(meteo_data)
                    total_risk += risk_score
                    
                    # ========================================
                    # PRECIFICAÇÃO DINÂMICA
                    # ========================================
                    # Preço base referência (deve vir do banco, mas fallback aqui)
                    base_ref_price = 4.50  # R$/kg (Tomate médio)
                    
                    # Escassez = Preço sobe
                    # risk_score 0.0 → multiplicador 1.0 (sem alteração)
                    # risk_score 0.5 → multiplicador 1.5 (+50%)
                    # risk_score 1.0 → multiplicador 2.0 (+100%)
                    scarcity_multiplier = 1.0 + risk_score
                    
                    new_buy_price = round(base_ref_price * scarcity_multiplier, 2)
                    new_sell_price = round(new_buy_price * current_margin, 2)
                    
                    # Nível de risco (1-3)
                    if risk_score <= 0.2:
                        risk_level = 1  # Baixo
                    elif risk_score <= 0.5:
                        risk_level = 2  # Médio
                    else:
                        risk_level = 3  # Alto
                    
                    # ========================================
                    # ATUALIZA BANCO DE DADOS
                    # ========================================
                    update_query = text("""
                        UPDATE "Opportunity"
                        SET "buyPrice" = :buy,
                            "sellPrice" = :sell,
                            "riskLevel" = :risk_lvl,
                            "climate" = :climate_desc,
                            "description" = :desc
                        WHERE id = :id
                    """)
                    
                    connection.execute(update_query, {
                        'buy': new_buy_price,
                        'sell': new_sell_price,
                        'risk_lvl': risk_level,
                        'climate_desc': f"Rad: {meteo_data['radiation_mj']}MJ, Chuva: {meteo_data['rain_mm']}mm",
                        'desc': f"Risco: {risk_reasons}" if risk_score > 0.1 else "Condições Favoráveis",
                        'id': opp_id
                    })
                    
                    # Histórico de preços
                    history_query = text("""
                        INSERT INTO "PriceHistory" ("opportunityId", "price", "createdAt")
                        VALUES (:opp_id, :price, NOW())
                    """)
                    connection.execute(history_query, {'opp_id': opp_id, 'price': new_buy_price})
                    
                    updated_count += 1
                    logger.info(
                        f"✅ {city}: R$ {current_buy:.2f} → R$ {new_buy_price:.2f} "
                        f"(Risco: {risk_score:.2f})"
                    )
                
                # Limpeza de histórico antigo (> 180 dias)
                cleanup_query = text("""
                    DELETE FROM "PriceHistory"
                    WHERE "createdAt" < NOW() - INTERVAL '180 days'
                """)
                connection.execute(cleanup_query)
                
                connection.commit()
                
                avg_risk = total_risk / updated_count if updated_count > 0 else 0.0
                
                logger.info("=" * 60)
                logger.info(f"✅ ATUALIZAÇÃO CONCLUÍDA")
                logger.info(f"Localidades: {updated_count}/{len(locations)}")
                logger.info(f"Risco Médio: {avg_risk:.2f}")
                logger.info("=" * 60)
                
                return {
                    'locations_scanned': len(locations),
                    'locations_updated': updated_count,
                    'average_risk': round(avg_risk, 2),
                    'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                }
        
        except Exception as e:
            logger.error(f"❌ Erro crítico na atualização: {e}", exc_info=True)
            return {'error': str(e)}


# ========================================
# INSTÂNCIAS GLOBAIS
# ========================================
tomato_risk_analyzer = TomatoRiskAnalyzer()
market_price_updater = MarketPriceUpdater()


# ========================================
# FUNÇÕES DE CONVENIÊNCIA
# ========================================

def calculate_tomato_risk(meteo_data: Dict) -> Tuple[float, str]:
    """Wrapper para compatibilidade"""
    return tomato_risk_analyzer.calculate_risk(meteo_data)


def update_market_prices() -> Dict:
    """Wrapper para compatibilidade com código antigo"""
    return market_price_updater.update_tomato_prices()
