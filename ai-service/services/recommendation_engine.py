# ai-service/services/recommendation_engine.py
"""
Engine de Recomendação Automática para Oportunidades de Compra/Venda.

Analisa múltiplos fatores para gerar recomendações inteligentes:
- ROI financeiro
- Qualidade e shelf-life
- Clima e eventos extremos
- Safra e época de plantio
- Tendências de mercado
"""

import logging
from typing import Dict, Optional
from datetime import datetime
from config.calendar import get_planting_window, is_ideal_month, is_risk_month

logger = logging.getLogger(__name__)


class RecommendationEngine:
    """
    Engine de recomendação automática baseada em múltiplos fatores.
    """
    
    def __init__(self):
        logger.info("✅ RecommendationEngine iniciado")
    
    def analyze_opportunity(
        self,
        roi: float,
        roi_d7: Optional[float] = None,
        roi_d30: Optional[float] = None,
        quality_score: Optional[float] = None,
        shelf_life_days: Optional[int] = None,
        has_extreme_events: bool = False,
        extreme_event_severity: Optional[str] = None,
        is_ideal_planting_month: bool = False,
        is_risk_planting_month: bool = False,
        market_trend: Optional[str] = None,
        current_price: Optional[float] = None,
        buy_price: Optional[float] = None
    ) -> Dict:
        """
        Analisa oportunidade e gera recomendação automática.
        
        Args:
            roi: ROI atual (%)
            roi_d7: ROI projetado em 7 dias (%)
            roi_d30: ROI projetado em 30 dias (%)
            quality_score: Score de qualidade (0-1)
            shelf_life_days: Dias de vida útil restantes
            has_extreme_events: Se há eventos climáticos extremos
            extreme_event_severity: Severidade do evento ('high' ou 'extreme')
            is_ideal_planting_month: Se está em mês ideal de plantio
            is_risk_planting_month: Se está em mês de risco de plantio
            market_trend: Tendência de mercado ('alta', 'baixa', 'lateral')
            current_price: Preço atual de venda (R$/kg)
            buy_price: Preço de compra (R$/kg)
        
        Returns:
            Dict com:
            - recommendation: 'COMPRAR', 'NÃO COMPRAR', 'AGUARDAR'
            - confidence: Score de confiança (0-100)
            - reasons: Lista de razões para a recomendação
            - risk_factors: Lista de fatores de risco
            - opportunity_score: Score geral (0-100)
        """
        
        reasons = []
        risk_factors = []
        score = 0.0
        
        # ========================================
        # 1. ANÁLISE FINANCEIRA (ROI) - Peso: 40%
        # ========================================
        financial_score = 0.0
        
        if roi is not None:
            if roi >= 50:
                financial_score += 40
                reasons.append(f"✅ ROI excelente: {roi:.1f}%")
            elif roi >= 30:
                financial_score += 30
                reasons.append(f"✅ ROI bom: {roi:.1f}%")
            elif roi >= 15:
                financial_score += 20
                reasons.append(f"⚠️ ROI moderado: {roi:.1f}%")
            elif roi >= 5:
                financial_score += 10
                reasons.append(f"⚠️ ROI baixo: {roi:.1f}%")
                risk_factors.append("ROI abaixo do ideal")
            else:
                financial_score += 0
                reasons.append(f"❌ ROI muito baixo: {roi:.1f}%")
                risk_factors.append("ROI insuficiente para compensar riscos")
        
        # Analisa tendência futura (ROI projetado)
        if roi_d7 is not None and roi_d30 is not None:
            if roi_d7 > roi and roi_d30 > roi_d7:
                financial_score += 10
                reasons.append(f"📈 Tendência de alta: ROI projetado aumenta para {roi_d30:.1f}% em 30 dias")
            elif roi_d7 < roi or roi_d30 < roi_d7:
                financial_score -= 5
                risk_factors.append("ROI projetado em declínio")
                reasons.append(f"📉 Tendência de baixa: ROI projetado cai para {roi_d30:.1f}% em 30 dias")
        
        score += financial_score
        
        # ========================================
        # 2. ANÁLISE DE QUALIDADE - Peso: 20%
        # ========================================
        quality_score_points = 0.0
        
        if shelf_life_days is not None:
            if shelf_life_days >= 20:
                quality_score_points += 15  # Máximo 15 pontos para shelf-life
                reasons.append(f"✅ Shelf-life excelente: {shelf_life_days} dias")
            elif shelf_life_days >= 15:
                quality_score_points += 12
                reasons.append(f"✅ Shelf-life bom: {shelf_life_days} dias")
            elif shelf_life_days >= 10:
                quality_score_points += 8
                reasons.append(f"⚠️ Shelf-life moderado: {shelf_life_days} dias")
            else:
                quality_score_points += 4
                reasons.append(f"⚠️ Shelf-life baixo: {shelf_life_days} dias")
                risk_factors.append("Vida útil curta pode comprometer qualidade")
        
        if quality_score is not None:
            if quality_score >= 0.8:
                quality_score_points += 5  # Bônus de até 5 pontos por qualidade alta
            elif quality_score < 0.5:
                quality_score_points -= 3  # Penalidade por qualidade baixa
                risk_factors.append("Qualidade abaixo do ideal")
        
        # Garante que não ultrapasse 20 pontos
        quality_score_points = min(20, max(0, quality_score_points))
        score += quality_score_points
        
        # ========================================
        # 3. ANÁLISE CLIMÁTICA - Peso: 20%
        # ========================================
        climate_score = 0.0
        
        if has_extreme_events:
            if extreme_event_severity == 'extreme':
                climate_score -= 20
                reasons.append("❌ Eventos climáticos extremos detectados")
                risk_factors.append("Riscos climáticos extremos podem comprometer produção/qualidade")
            elif extreme_event_severity == 'high':
                climate_score -= 10
                reasons.append("⚠️ Eventos climáticos de alta intensidade")
                risk_factors.append("Riscos climáticos elevados")
        else:
            climate_score += 20
            reasons.append("✅ Nenhum evento climático extremo detectado")
        
        score += climate_score
        
        # ========================================
        # 4. ANÁLISE DE SAFRA - Peso: 10%
        # ========================================
        season_score = 0.0
        
        if is_ideal_planting_month:
            season_score += 10
            reasons.append("✅ Mês ideal para plantio/colheita")
        elif is_risk_planting_month:
            season_score -= 10
            reasons.append("⚠️ Mês de risco para plantio/colheita")
            risk_factors.append("Período de risco para operação")
        else:
            season_score += 5
            reasons.append("ℹ️ Período neutro para operação")
        
        score += season_score
        
        # ========================================
        # 5. ANÁLISE DE MERCADO - Peso: 10%
        # ========================================
        market_score = 0.0
        
        if market_trend:
            if market_trend.lower() in ['alta', 'high', 'up']:
                market_score += 10
                reasons.append("📈 Tendência de mercado: Alta")
            elif market_trend.lower() in ['baixa', 'low', 'down']:
                market_score -= 5
                reasons.append("📉 Tendência de mercado: Baixa")
                risk_factors.append("Mercado em tendência de baixa")
            else:
                market_score += 5
                reasons.append("➡️ Tendência de mercado: Lateral")
        
        # Análise de margem (se tiver preços)
        if current_price and buy_price and current_price > 0 and buy_price > 0:
            margin_pct = ((current_price - buy_price) / buy_price) * 100
            if margin_pct >= 50:
                market_score += 5
            elif margin_pct < 20:
                market_score -= 5
                risk_factors.append("Margem de lucro muito apertada")
        
        score += market_score
        
        # ========================================
        # 6. DECISÃO FINAL
        # ========================================
        # Normaliza score para 0-100
        score = max(0, min(100, score))
        
        # Calcula confiança baseada na quantidade de dados disponíveis
        data_points = sum([
            1 if roi is not None else 0,
            1 if shelf_life_days is not None else 0,
            1 if has_extreme_events is not None else 0,
            1 if is_ideal_planting_month is not None or is_risk_planting_month is not None else 0
        ])
        confidence = min(100, 50 + (data_points * 12.5))  # 50% base + até 50% por dados
        
        # Gera recomendação baseada no score
        if score >= 70:
            recommendation = "COMPRAR"
            reasons.insert(0, f"🎯 Score geral: {score:.0f}/100 - Oportunidade muito atrativa")
        elif score >= 50:
            recommendation = "COMPRAR"
            reasons.insert(0, f"✅ Score geral: {score:.0f}/100 - Oportunidade atrativa")
        elif score >= 35:
            recommendation = "AGUARDAR"
            reasons.insert(0, f"⏳ Score geral: {score:.0f}/100 - Aguardar melhores condições")
        else:
            recommendation = "NÃO COMPRAR"
            reasons.insert(0, f"❌ Score geral: {score:.0f}/100 - Oportunidade não recomendada")
        
        # Adiciona resumo de fatores de risco se houver
        if risk_factors:
            reasons.append(f"⚠️ Fatores de risco identificados: {len(risk_factors)}")
        
        return {
            "recommendation": recommendation,
            "confidence": round(confidence, 1),
            "reasons": reasons,
            "risk_factors": risk_factors,
            "opportunity_score": round(score, 1),
            "financial_score": round(financial_score, 1),
            "quality_score": round(quality_score_points, 1),
            "climate_score": round(climate_score, 1),
            "season_score": round(season_score, 1),
            "market_score": round(market_score, 1)
        }


# Instância Global
recommendation_engine = RecommendationEngine()






