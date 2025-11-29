# services/climate/risk_analyzer.py
"""
Analisador de risco climático para culturas.
Implementa regras agronômicas baseadas em document.pdf.

CORREÇÕES APLICADAS:
- Radiação solar: 8.4 MJ/m² threshold (era 15 ❌)
- Chuva: 35mm/7dias ideal, 70mm crítico (era 80mm ❌)
- Umidade: 80% crítico (PDF)
"""

import logging
from typing import Dict, Tuple, List
from datetime import datetime

from .intelligence import climate_api
from config.crops import CROPS_SPECS
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
        # 1. RADIAÇÃO SOLAR (document.pdf pág 3)
        # ========================================
        # ✅ CORRIGIDO: Mínimo 8.4 MJ/m²/dia (era 15 ❌)
        min_solar = self.specs['min_solar_mj']  # 8.4 MJ/m²/dia
        radiation = meteo_data.get('radiation_mj', 18.0)
        
        if radiation < min_solar:
            deficit = (min_solar - radiation) / min_solar
            risk_penalty = deficit * 0.3  # Até 30% de penalização
            risk_score += risk_penalty
            reasons.append(
                f"Insolação Deficiente ({radiation:.1f} MJ < {min_solar} MJ ideal)"
            )
            logger.warning(f"⚠️ Radiação baixa: {radiation:.1f} MJ (ideal: ≥{min_solar})")
        
        # ========================================
        # 2. CHUVA (document.pdf pág 2)
        # ========================================
        # ✅ CORRIGIDO: 35mm/7dias ideal, 70mm crítico (era 80mm ❌)
        # PDF: 400-600mm/ciclo (120 dias) = 5mm/dia ideal
        rain_7days = meteo_data.get('rain_mm', 0)
        
        ideal_7days = 35.0  # 5mm/dia × 7 dias
        critical_7days = 70.0  # 10mm/dia × 7 dias (chuva forte)
        
        if rain_7days > critical_7days:
            excess = (rain_7days - critical_7days) / critical_7days
            risk_penalty = min(excess * 0.4, 0.4)  # Máximo 40% penalização
            risk_score += risk_penalty
            reasons.append(
                f"Excesso de Chuva ({rain_7days:.1f}mm/7d > {critical_7days}mm crítico)"
            )
            logger.warning(f"⚠️ Chuva excessiva: {rain_7days:.1f}mm em 7 dias")
        
        elif rain_7days > ideal_7days:
            # Chuva moderada (não crítica, mas não ideal)
            excess = (rain_7days - ideal_7days) / ideal_7days
            risk_penalty = min(excess * 0.2, 0.2)  # Máximo 20%
            risk_score += risk_penalty
            reasons.append(f"Chuva Moderada ({rain_7days:.1f}mm/7d)")
        
        # ========================================
        # 3. UMIDADE RELATIVA (document.pdf pág 2)
        # ========================================
        # PDF: Ideal 50-70%, Crítico > 75% (doenças fúngicas)
        humidity = meteo_data.get('humidity_pct', 65.0)
        
        critical_humidity = self.specs.get('critical_humidity', 75.0)  # 75% (PDF)
        ideal_max_humidity = self.specs.get('ideal_humidity_max', 70.0)
        
        if humidity > critical_humidity:
            excess = (humidity - ideal_max_humidity) / 30  # Normaliza até 100%
            risk_penalty = min(excess * 0.3, 0.3)  # Máximo 30%
            risk_score += risk_penalty
            reasons.append(
                f"Umidade Alta ({humidity:.0f}% > {critical_humidity:.0f}% crítico) - Risco Fúngico"
            )
            logger.warning(f"⚠️ Umidade elevada: {humidity:.0f}%")
        
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
