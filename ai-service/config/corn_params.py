# ai-service/config/corn_params.py
"""
PARÂMETROS AGRONÔMICOS CIENTÍFICOS PARA MILHO
Fonte da Verdade: Importa de corn_formulas.py (fonte única)

Este arquivo mantém compatibilidade com código legado, mas TODOS os valores
vêm de corn_formulas.py para garantir consistência.
"""

# ✅ FONTE ÚNICA DA VERDADE
from .corn_formulas import (
    CORN_TEMPERATURE_THRESHOLDS,
    CORN_MIN_SOLAR_RADIATION,
    CORN_OPTIMAL_SOLAR_RADIATION,
    CORN_RAINFALL_THRESHOLDS,
    CORN_PLANTING_CALENDAR,
    CORN_MONTHLY_LOSS_RATE,
    CORN_DAILY_LOSS_RATE
)

# Extrai valores de armazenagem da fórmula oficial
# (Estes valores são usados pela função calculate_corn_storage_cost)
CORN_STORAGE_PARAMS = {
    "fixed_cost_monthly": 1100.0,  # R$ 900 (aluguel) + R$ 200 (seguro)
    "energy_cost_per_kg_day": 0.012,  # R$ 0,012/kg/dia
    "packaging_cost_per_kg": 0.025,  # R$ 0,025/kg
    "daily_loss_rate": CORN_DAILY_LOSS_RATE,  # 0.00083 (0.083%/dia)
    "monthly_loss_rate": CORN_MONTHLY_LOSS_RATE  # 0.025 (2.5%/mês)
}

# Extrai thresholds de temperatura (usa vegetative_growth como padrão)
CORN_CLIMATE_THRESHOLDS = {
    "min_maturation_temp": CORN_TEMPERATURE_THRESHOLDS["maturation"]["min"],
    "risk_germination_temp": CORN_TEMPERATURE_THRESHOLDS["germination"]["min"],
    "ideal_min": CORN_TEMPERATURE_THRESHOLDS["vegetative_growth"]["optimal_min"],
    "ideal_max": CORN_TEMPERATURE_THRESHOLDS["vegetative_growth"]["optimal_max"],
    "critical_heat": CORN_TEMPERATURE_THRESHOLDS["critical"]["max_critical"],
    "heat_damage_threshold": CORN_TEMPERATURE_THRESHOLDS["critical"]["heat_damage"],
    "cold_damage_threshold": CORN_TEMPERATURE_THRESHOLDS["critical"]["cold_damage"]
}

# Converte CORN_PLANTING_CALENDAR para formato legado (start/end)
def _convert_corn_planting_calendar():
    """Converte CORN_PLANTING_CALENDAR para formato start/end."""
    windows = {}
    for key, value in CORN_PLANTING_CALENDAR.items():
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

CORN_SPECS = {
    # ========================================
    # 📦 ARMAZENAGEM & CUSTOS
    # ✅ Importado de corn_formulas.py
    # ========================================
    "storage": CORN_STORAGE_PARAMS,

    # ========================================
    # 🌡️ GATILHOS CLIMÁTICOS
    # ✅ Importado de corn_formulas.py
    # ========================================
    "climate_thresholds": CORN_CLIMATE_THRESHOLDS,
    
    # Radiação solar mínima
    "min_solar_mj": CORN_MIN_SOLAR_RADIATION,  # 7.5 MJ/m²/dia (mínimo)
    "optimal_solar_mj": CORN_OPTIMAL_SOLAR_RADIATION,  # 8.0 MJ/m²/dia (ótimo)

    # ========================================
    # 🗓️ CALENDÁRIO DE PLANTIO
    # ✅ Importado de corn_formulas.py
    # ========================================
    "planting_windows": _convert_corn_planting_calendar(),
    
    # ========================================
    # 📊 DADOS GERAIS (Baseados em dados científicos e mercado)
    # ========================================
    'base_productivity': 150,  # sacas/ha (60kg cada) - média nacional
    'base_cost_ha': 5000.00,  # Custo médio de produção/ha
    'unit_weight_kg': 60.0,  # Peso da saca padrão
    'volatility_factor': 0.9,  # Volatilidade intermediária (menor que tomate, maior que soja)
    'price_elasticity': 1.3,  # Elasticidade de preço (intermediária)
    'truck_capacity': 550,  # Sacas por caminhão (33 toneladas)
    'perishability_hours': 720,  # 30 dias (grão seco, similar a soja)
    'cultivar_cycle_early': 100,  # Dias (90-110)
    'cultivar_cycle_medium': 120,  # Dias (110-130)
    'cultivar_cycle_late': 140,  # Dias (130-150+)
    'ideal_rain_cycle': 650.0,  # mm por ciclo (média entre 500-800)
    'min_rain_cycle': 500.0,  # mm por ciclo
    'max_rain_cycle': 800.0,  # mm por ciclo
    'rain_logistics_limit': 25.0,  # mm/dia - limite para logística
    'thermal_amplitude_ideal_min': 6.0,  # °C - variação térmica diária mínima
    'thermal_amplitude_ideal_max': 9.0,  # °C - variação térmica diária máxima
    'productivity_loss_per_degree_above_30': 4.0,  # % por °C acima de 30°C (floração/enchimento)
}

