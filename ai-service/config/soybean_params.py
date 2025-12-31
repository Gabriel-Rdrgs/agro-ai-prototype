# ai-service/config/soybean_params.py
"""
PARÂMETROS AGRONÔMICOS CIENTÍFICOS PARA SOJA
Fonte da Verdade: Importa de soybean_formulas.py (fonte única)

Este arquivo mantém compatibilidade com código legado, mas TODOS os valores
vêm de soybean_formulas.py para garantir consistência.
"""

# ✅ FONTE ÚNICA DA VERDADE
from .soybean_formulas import (
    SOYBEAN_TEMPERATURE_THRESHOLDS,
    SOYBEAN_MIN_SOLAR_RADIATION,
    SOYBEAN_RAINFALL_THRESHOLDS,
    SOYBEAN_PLANTING_CALENDAR,
    SOYBEAN_MONTHLY_LOSS_RATE,
    SOYBEAN_DAILY_LOSS_RATE
)

# Extrai valores de armazenagem da fórmula oficial
# (Estes valores são usados pela função calculate_soybean_storage_cost)
SOYBEAN_STORAGE_PARAMS = {
    "fixed_cost_monthly": 1200.0,  # R$ 1000 (aluguel) + R$ 200 (seguro)
    "energy_cost_per_kg_day": 0.015,  # R$ 0,015/kg/dia
    "packaging_cost_per_kg": 0.03,  # R$ 0,03/kg
    "daily_loss_rate": SOYBEAN_DAILY_LOSS_RATE,  # 0.00067 (0.067%/dia)
    "monthly_loss_rate": SOYBEAN_MONTHLY_LOSS_RATE  # 0.02 (2%/mês)
}

# Extrai thresholds de temperatura (usa vegetative_growth como padrão)
SOYBEAN_CLIMATE_THRESHOLDS = {
    "min_maturation_temp": SOYBEAN_TEMPERATURE_THRESHOLDS["maturation"]["min"],
    "risk_germination_temp": SOYBEAN_TEMPERATURE_THRESHOLDS["germination"]["min"],
    "ideal_min": SOYBEAN_TEMPERATURE_THRESHOLDS["vegetative_growth"]["optimal_min"],
    "ideal_max": SOYBEAN_TEMPERATURE_THRESHOLDS["vegetative_growth"]["optimal_max"],
    "critical_heat": SOYBEAN_TEMPERATURE_THRESHOLDS["critical"]["max_critical"]
}

# Converte SOYBEAN_PLANTING_CALENDAR para formato legado (start/end)
def _convert_soybean_planting_calendar():
    """Converte SOYBEAN_PLANTING_CALENDAR para formato start/end."""
    windows = {}
    for key, value in SOYBEAN_PLANTING_CALENDAR.items():
        months = value["months"]
        if months:
            start = months[0]
            # Se atravessa o ano (ex: [9,10,11,12]), end = último mês
            if months[-1] < months[0]:
                end = months[-1]
            else:
                end = months[-1]
            windows[key] = {"start": start, "end": end, "desc": value["description"]}
    return windows

SOYBEAN_SPECS = {
    # ========================================
    # 📦 ARMAZENAGEM & CUSTOS
    # ✅ Importado de soybean_formulas.py
    # ========================================
    "storage": SOYBEAN_STORAGE_PARAMS,

    # ========================================
    # 🌡️ GATILHOS CLIMÁTICOS
    # ✅ Importado de soybean_formulas.py
    # ========================================
    "climate_thresholds": SOYBEAN_CLIMATE_THRESHOLDS,
    
    # Radiação solar mínima
    "min_solar_mj": SOYBEAN_MIN_SOLAR_RADIATION,  # 8.0 MJ/m²/dia

    # ========================================
    # 🗓️ CALENDÁRIO DE PLANTIO
    # ✅ Importado de soybean_formulas.py
    # ========================================
    "planting_windows": _convert_soybean_planting_calendar(),
    
    # ========================================
    # 📊 DADOS GERAIS (Baseados em dados científicos e mercado)
    # ========================================
    'base_productivity': 60,  # sacas/ha (60kg cada) - média nacional
    'base_cost_ha': 4500.00,  # Custo médio de produção/ha
    'unit_weight_kg': 60.0,  # Peso da saca padrão
    'volatility_factor': 0.8,  # Menor volatilidade que tomate (grão commodity)
    'price_elasticity': 1.2,  # Elasticidade de preço (menor que tomate)
    'truck_capacity': 550,  # Sacas por caminhão (33 toneladas)
    'perishability_hours': 720,  # 30 dias (grão seco, muito mais estável que tomate)
    'cultivar_cycle_early': 100,  # Dias (90-110)
    'cultivar_cycle_medium': 120,  # Dias (110-130)
    'cultivar_cycle_late': 140,  # Dias (130-150+)
    'ideal_rain_cycle': 800.0,  # mm por ciclo
    'min_rain_cycle': 600.0,  # mm por ciclo
    'max_rain_cycle': 1000.0,  # mm por ciclo
    'rain_logistics_limit': 25.0,  # mm/dia - limite para logística
}

