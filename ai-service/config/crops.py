# config/crops.py
"""
Especificações agronômicas de culturas.

Baseado em:
- document.pdf: Clima e Produção de Tomates no Brasil
- document-1.pdf: Função Custo de Armazenagem
- Embrapa, UFG (2024)

Última atualização: 2025-11-29
Validado por: Gabriel Rodrigues
"""

CROPS_SPECS = {
    'Tomate': {
        # ========================================
        # 📊 PRODUTIVIDADE E ECONOMIA
        # ========================================
        'base_productivity': 300,           # caixas/ha (média nacional campo aberto)
        'base_cost_ha': 25000.00,           # R$/ha (custo produção sem estufa)
        'unit_weight_kg': 20.0,             # kg por caixa K (padrão Embrapa)
        
        # ========================================
        # 🌡️ TEMPERATURA (document.pdf - Tabela 1)
        # ========================================
        'temp_min_critical': 10.0,          # °C - Abaixo: prejudica crescimento
        'temp_max_critical': 34.0,          # °C - Acima: impede frutificação
        'temp_ideal_min': 18.0,             # °C - Limite inferior da faixa ideal
        'temp_ideal_max': 27.0,             # °C - Limite superior (crescimento ótimo)
        'temp_germination_min': 11.0,       # °C - Germinação
        'temp_germination_max': 34.0,       # °C - Germinação
        'temp_night_ideal': 14.0,           # °C - Temperatura noturna mínima
        
        # ========================================
        # 💧 ÁGUA E PRECIPITAÇÃO (document.pdf pág 2)
        # ========================================
        'ideal_rain_cycle': 500.0,          # mm/ciclo (120 dias) - Meio da faixa 400-600
        'min_rain_cycle': 400.0,            # mm/ciclo - Mínimo necessário
        'max_rain_cycle': 600.0,            # mm/ciclo - Acima favorece doenças
        'rain_logistics_limit': 20.0,       # mm/dia - Chuva que atrasa colheita/transporte
        'rain_disease_threshold': 100.0,    # mm/mês - Risco alto de doenças fúngicas
        'ideal_humidity_min': 50.0,         # % - Umidade relativa mínima
        'ideal_humidity_max': 70.0,         # % - Umidade relativa máxima
        'critical_humidity': 75.0,          # % - Acima: doenças fúngicas
        
        # ========================================
        # ☀️ RADIAÇÃO SOLAR (document.pdf pág 3)
        # ========================================
        'min_solar_mj': 8.4,                # MJ/m²/dia - Mínimo p/ crescimento normal
        'ideal_solar_hours': 8.0,           # horas/dia - Sol pleno recomendado
        'solar_deficit_tolerance': 0.20,    # 20% - Déficit aceitável antes de penalizar
        
        # ========================================
        # 📦 ARMAZENAGEM (document-1.pdf - Função Custo)
        # ========================================
        # CORREÇÃO CRÍTICA: PDF especifica 6%/mês, não 1,5%/dia!
        'storage_loss_rate_daily': 0.002,   # 0,2%/dia (6%/mês ÷ 30 dias) ✅ CORRIGIDO
        'storage_loss_rate_monthly': 0.06,  # 6%/mês - Taxa de deterioração (PDF)
        
        # Custos energéticos (document-1.pdf exemplo)
        'energy_cost_daily_kg': 0.025,      # R$/kg·dia (câmara fria 2-8°C) ✅ CORRIGIDO
        'energy_cost_daily_unit': 0.50,     # R$/caixa·dia (0,025 × 20kg) ✅ CORRIGIDO
        
        # Custos fixos e variáveis
        'packaging_cost_kg': 0.10,          # R$/kg (embalagem unitária)
        'fixed_cost_monthly': 1700.00,      # R$/mês (aluguel + seguro + mão-de-obra)
        'fixed_cost_unit': 1.50,            # R$/caixa (rateio 1700÷1133 caixas/mês)
        
        # ========================================
        # 📈 VOLATILIDADE E MERCADO
        # ========================================
        'volatility_factor': 2.5,           # Multiplicador de ruído (tomate = alta volatilidade)
        'price_elasticity': 1.8,            # Sensibilidade preço vs oferta/demanda
        'seasonal_amplitude': 0.35,         # 35% - Variação sazonal máxima
        
        # ========================================
        # 🚛 LOGÍSTICA
        # ========================================
        'truck_capacity': 1200,             # caixas por caminhão (carreta baú)
        'perishability_hours': 48,          # horas - Tempo crítico pós-colheita
        'cold_chain_required': True,        # Requer cadeia fria
        
        # ========================================
        # 🔬 QUALIDADE (Brix)
        # ========================================
        'min_brix': 4.0,                    # °Brix - Mínimo comercial
        'ideal_brix': 5.5,                  # °Brix - Ideal para consumo in natura
        'solar_brix_coefficient': 0.15,     # Coef. impacto solar no Brix
    },
    
    # ========================================
    # SOJA (mantém estrutura similar)
    # ========================================
    'Soja': {
        'base_productivity': 60,            # sacas/ha (60kg)
        'base_cost_ha': 4500.00,
        'unit_weight_kg': 60.0,
        'temp_min_critical': 15.0,
        'temp_max_critical': 40.0,
        'ideal_rain_cycle': 800.0,
        'min_rain_cycle': 600.0,
        'max_rain_cycle': 1000.0,
        'rain_logistics_limit': 25.0,
        'min_solar_mj': 12.0,
        'storage_loss_rate_daily': 0.001,
        'energy_cost_daily_kg': 0.02,
        'energy_cost_daily_unit': 1.20,
        'packaging_cost_kg': 0.05,
        'fixed_cost_monthly': 500.00,
        'fixed_cost_unit': 0.50,
        'volatility_factor': 0.8,
        'truck_capacity': 550,              # sacas (33 toneladas)
    },
    
    # ========================================
    # MILHO
    # ========================================
    'Milho': {
        'base_productivity': 150,           # sacas/ha
        'base_cost_ha': 5000.00,
        'unit_weight_kg': 60.0,
        'temp_min_critical': 10.0,
        'temp_max_critical': 38.0,
        'ideal_rain_cycle': 700.0,
        'min_rain_cycle': 500.0,
        'max_rain_cycle': 900.0,
        'rain_logistics_limit': 25.0,
        'min_solar_mj': 15.0,
        'storage_loss_rate_daily': 0.001,
        'energy_cost_daily_kg': 0.02,
        'energy_cost_daily_unit': 1.20,
        'packaging_cost_kg': 0.05,
        'fixed_cost_monthly': 500.00,
        'fixed_cost_unit': 0.50,
        'volatility_factor': 0.9,
        'truck_capacity': 550,
    },
    
    # ========================================
    # DEFAULT (fallback)
    # ========================================
    'Default': {
        'base_productivity': 100,
        'base_cost_ha': 5000,
        'unit_weight_kg': 1.0,
        'temp_min_critical': 0,
        'temp_max_critical': 40,
        'ideal_rain_cycle': 500,
        'min_rain_cycle': 300,
        'max_rain_cycle': 800,
        'rain_logistics_limit': 20.0,
        'min_solar_mj': 5.0,
        'storage_loss_rate_daily': 0.005,
        'energy_cost_daily_kg': 0.05,
        'energy_cost_daily_unit': 0.05,
        'packaging_cost_kg': 0.05,
        'fixed_cost_monthly': 1000.00,
        'fixed_cost_unit': 1.0,
        'volatility_factor': 1.0,
        'truck_capacity': 1000,
    }
}


# ========================================
# FUNÇÃO AUXILIAR
# ========================================
def get_crop_specs(product_name: str) -> dict:
    """
    Retorna especificações da cultura com fallback.
    
    Args:
        product_name: Nome do produto (ex: 'Tomate', 'tomate', 'TOMATE')
    
    Returns:
        dict com especificações da cultura
    """
    normalized = product_name.strip().capitalize()
    return CROPS_SPECS.get(normalized, CROPS_SPECS['Default'])
# config/crops.py (adicionar no FINAL do arquivo)

# ========================================
# FUNÇÃO AUXILIAR
# ========================================

def get_crop_specs(product_name: str) -> dict:
    """
    Retorna especificações de uma cultura.
    
    Args:
        product_name: Nome do produto (ex: 'Tomate', 'Soja', 'Milho')
    
    Returns:
        dict com especificações da cultura
    """
    # Normaliza nome
    product_key = product_name.strip().capitalize()
    
    # Retorna specs ou default
    if product_key in CROPS_SPECS:
        return CROPS_SPECS[product_key]
    
    # Fallback: retorna Tomate como padrão
    return CROPS_SPECS.get('Tomate', {
        'base_productivity': 100,
        'base_cost_ha': 10000,
        'unit_weight_kg': 1.0
    })
