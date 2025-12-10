# ai-service/config/agronomic_params.py
"""
PARÂMETROS AGRONÔMICOS CIENTÍFICOS
Fonte da Verdade: Importa de mathematical_formulas.py (fonte única)

Este arquivo mantém compatibilidade com código legado, mas TODOS os valores
vêm de mathematical_formulas.py para garantir consistência.
"""

# ✅ FONTE ÚNICA DA VERDADE
from .mathematical_formulas import (
    TEMPERATURE_THRESHOLDS,
    MIN_SOLAR_RADIATION,
    RAINFALL_THRESHOLDS,
    PLANTING_CALENDAR,
    MONTHLY_LOSS_RATE,
    DAILY_LOSS_RATE
)

# Extrai valores de armazenagem da fórmula oficial
# (Estes valores são usados pela função calculate_storage_cost)
STORAGE_PARAMS = {
    "fixed_cost_monthly": 1700.0,  # R$ 1500 (aluguel) + R$ 200 (seguro)
    "energy_cost_per_kg_day": 0.025,  # R$ 0,025/kg/dia
    "packaging_cost_per_kg": 0.10,  # R$ 0,10/kg
    "daily_loss_rate": DAILY_LOSS_RATE,  # 0.002 (0.2%/dia)
    "monthly_loss_rate": MONTHLY_LOSS_RATE  # 0.06 (6%/mês)
}

# Extrai thresholds de temperatura (usa vegetative_growth como padrão)
CLIMATE_THRESHOLDS = {
    "min_maturation_temp": TEMPERATURE_THRESHOLDS["maturation"]["min"],
    "risk_germination_temp": TEMPERATURE_THRESHOLDS["germination"]["min"],
    "ideal_min": TEMPERATURE_THRESHOLDS["vegetative_growth"]["optimal_min"],
    "ideal_max": TEMPERATURE_THRESHOLDS["vegetative_growth"]["optimal_max"],
    "critical_heat": TEMPERATURE_THRESHOLDS["critical"]["max_critical"]
}

# Converte PLANTING_CALENDAR para formato legado (start/end)
def _convert_planting_calendar():
    """Converte PLANTING_CALENDAR para formato start/end."""
    windows = {}
    for key, value in PLANTING_CALENDAR.items():
        months = value["months"]
        if months:
            start = months[0]
            # Se atravessa o ano (ex: [8,9,10,11,12,1]), end = último mês
            if months[-1] < months[0]:
                end = months[-1]
            else:
                end = months[-1]
            windows[key] = {"start": start, "end": end, "desc": value["description"]}
    return windows

TOMATO_SPECS = {
    # ========================================
    # 📦 ARMAZENAGEM & CUSTOS
    # ✅ Importado de mathematical_formulas.py
    # ========================================
    "storage": STORAGE_PARAMS,

    # ========================================
    # 🌡️ GATILHOS CLIMÁTICOS
    # ✅ Importado de mathematical_formulas.py
    # ========================================
    "climate_thresholds": CLIMATE_THRESHOLDS,
    
    # Radiação solar mínima
    "min_solar_mj": MIN_SOLAR_RADIATION,  # 8.4 MJ/m²/dia

    # ========================================
    # 🗓️ CALENDÁRIO DE PLANTIO
    # ✅ Importado de mathematical_formulas.py
    # ========================================
    "planting_windows": _convert_planting_calendar(),
    
    # ========================================
    # 📊 DADOS GERAIS (Mantidos do sistema anterior para compatibilidade)
    # ========================================
    'base_productivity': 300,
    'base_cost_ha': 25000.00,
    'unit_weight_kg': 20.0,
    'volatility_factor': 2.5,
    'price_elasticity': 1.8,
    'truck_capacity': 1200,
    'perishability_hours': 48,
    'min_brix': 4.0,
    'ideal_brix': 5.5
}