# ai-service/config/crops.py
"""
Especificações agronômicas de culturas.
Gerenciador central que une dados científicos (Tomate) e dados gerais (Legado).
"""

# ✅ AQUI ESTÁ A MÁGICA: Importamos a verdade científica do novo arquivo
from .agronomic_params import TOMATO_SPECS

CROPS_SPECS = {
    # 🍅 TOMATE: Agora vem limpo e validado do arquivo agronomic_params.py
    'Tomate': TOMATO_SPECS,
    
    # 🌽 MILHO & SOJA: Mantidos hardcoded (Legado) como você pediu
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
        'truck_capacity': 550,
    },
    
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
# FUNÇÃO AUXILIAR (Unificada)
# ========================================
def get_crop_specs(product_name: str) -> dict:
    """
    Retorna especificações de uma cultura com fallback seguro.
    """
    if not product_name:
        return CROPS_SPECS['Default']
        
    # Normaliza nome (remove espaços, capitaliza)
    product_key = product_name.strip().capitalize()
    
    # Retorna specs ou Default se não encontrar
    return CROPS_SPECS.get(product_key, CROPS_SPECS['Default'])