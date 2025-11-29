# services/production_calculator.py
"""
Calculadora de ROI para produção agrícola.
Considera calendário de plantio regional e ajusta produtividade.
"""

import logging
from typing import Dict

from models.schemas import ProductionRequest, ProductionAnalysisResponse
from config.crops import get_crop_specs
from config.calendar import PLANTING_CALENDAR

logger = logging.getLogger(__name__)


class ProductionCalculator:
    """
    Calcula retorno sobre investimento (ROI) para produção local.
    """
    
    def __init__(self):
        logger.info("✅ ProductionCalculator iniciado")
    
    def calculate_roi(self, data: ProductionRequest) -> ProductionAnalysisResponse:
        """
        Calcula ROI considerando janela de plantio ideal.
        
        Args:
            data: ProductionRequest com dados da produção
        
        Returns:
            {
                'adjusted_productivity': 285.0,
                'productivity_loss_pct': 5.0,
                'net_profit': 45000.00,
                'roi': 15.2,
                'risk_analysis': ['Plantio na JANELA IDEAL.']
            }
        """
        logger.info(
            f"📊 Calculando ROI: {data.product} em {data.state}, "
            f"{data.area_ha}ha, plantio mês {data.planting_month}"
        )
        
        # ========================================
        # 1. CONFIGURAÇÃO
        # ========================================
        specs = get_crop_specs(data.product)
        calendar = PLANTING_CALENDAR.get(data.product, {}).get(data.state)
        
        prod_factor = 1.0
        risk_notes = []
        
        # ========================================
        # 2. AJUSTE POR JANELA DE PLANTIO
        # ========================================
        if calendar:
            ideal_months = calendar.get('ideal', [])
            risk_months = calendar.get('risk', [])
            
            if data.planting_month in ideal_months:
                prod_factor = 1.05  # +5% produtividade
                risk_notes.append('✅ Plantio na JANELA IDEAL.')
                logger.info(f"✅ Mês {data.planting_month} é IDEAL para {data.state}")
            
            elif data.planting_month in risk_months:
                prod_factor = 0.70  # -30% produtividade (perda significativa)
                risk_notes.append(
                    f'⚠️ ALERTA: Mês de ALTO RISCO em {data.state}. '
                    f'Recomendado: {ideal_months}'
                )
                logger.warning(
                    f"⚠️ Mês {data.planting_month} é RISCO em {data.state}"
                )
            
            else:
                prod_factor = 0.90  # -10% (janela de transição)
                risk_notes.append('⚠️ Janela de transição (não ideal).')
                logger.info(f"⚠️ Mês {data.planting_month} é TRANSIÇÃO")
        
        else:
            # Sem calendário definido
            risk_notes.append(
                f'ℹ️ Calendário não disponível para {data.product} em {data.state}.'
            )
        
        # ========================================
        # 3. CÁLCULO FINANCEIRO
        # ========================================
        # Produtividade ajustada
        final_prod_units = data.expected_productivity * prod_factor
        
        # Receita bruta
        gross_revenue = final_prod_units * data.area_ha * data.expected_sell_price
        
        # Custo total
        total_cost = data.area_ha * data.cost_per_ha
        
        # Lucro líquido
        net_profit = gross_revenue - total_cost
        
        # ROI (%)
        roi = 0.0
        if total_cost > 0:
            roi = (net_profit / total_cost) * 100
        
        # Perda de produtividade (%)
        productivity_loss_pct = 0.0
        if prod_factor < 1.0:
            productivity_loss_pct = round((1 - prod_factor / 1.05) * 100, 1)
        
        # ========================================
        # 4. RESULTADO
        # ========================================
        result = {
            'adjusted_productivity': round(final_prod_units, 1),
            'productivity_loss_pct': productivity_loss_pct,
            'net_profit': round(net_profit, 2),
            'roi': round(roi, 1),
            'risk_analysis': risk_notes
        }
        
        logger.info(
            f"✅ ROI calculado: {roi:.1f}% | "
            f"Lucro líquido: R$ {net_profit:,.2f}"
        )
        
        return result


# ========================================
# INSTÂNCIA GLOBAL (Singleton)
# ========================================
production_calculator = ProductionCalculator()
