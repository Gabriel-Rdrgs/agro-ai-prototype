# ai-service/config/mathematical_formulas.py
"""
FÓRMULAS MATEMÁTICAS CENTRALIZADAS
Fonte da Verdade baseada nos 3 documentos base:
1. Épocas de Plantio e Métricas de Decisão para Cultivo de Tomate no Brasil
2. Clima e Produção de Tomates no Brasil (estudos tomate.pdf)
3. Função Custo de Armazenagem de Tomate

TODA A APLICAÇÃO DEVE USAR ESTAS FÓRMULAS E PARÂMETROS.
"""

from typing import Dict, Tuple
import math

# ========================================
# 1. FUNÇÃO CUSTO DE ARMAZENAGEM
# Fonte: Função Custo de Armazenagem de Tomate.pdf
# ========================================

def calculate_storage_cost(
    quantity_kg: float,
    time_months: float,
    price_per_kg: float
) -> Dict[str, float]:
    """
    Calcula o custo total de armazenagem usando a fórmula oficial.
    
    Fórmula: C(x,t) = Cf + Cv(x,t) + Cp(x,t)
    
    Onde:
    - C(x,t) = custo total para quantidade x (kg) por tempo t (meses)
    - Cf = custos fixos mensais (R$ 1700 = R$ 1500 aluguel + R$ 200 seguro)
    - Cv(x,t) = custos variáveis = 0.10x + 0.025xt
      * 0.10x = embalagens (R$ 0,10/kg)
      * 0.025xt = energia elétrica (R$ 0,025/kg/dia, convertido para meses)
    - Cp(x,t) = custos de perdas = 0.06xt·P
      * 0.06 = 6% de perda mensal por deterioração
      * P = preço médio de venda por kg
    
    Args:
        quantity_kg: Quantidade de tomate em kg
        time_months: Tempo de armazenagem em meses
        price_per_kg: Preço médio de venda por kg
    
    Returns:
        Dict com:
        - total_cost: Custo total
        - fixed_cost: Custos fixos
        - variable_cost: Custos variáveis
        - loss_cost: Custos de perdas
    """
    # Custos fixos mensais
    FIXED_COST_MONTHLY = 1700.0  # R$ 1500 (aluguel) + R$ 200 (seguro)
    
    # Custos variáveis
    PACKAGING_COST_PER_KG = 0.10  # R$ 0,10/kg (embalagens)
    ENERGY_COST_PER_KG_DAY = 0.025  # R$ 0,025/kg/dia (energia)
    DAYS_PER_MONTH = 30.0
    
    # Perdas mensais
    MONTHLY_LOSS_RATE = 0.06  # 6% ao mês
    
    # Calcula componentes
    fixed_cost = FIXED_COST_MONTHLY * time_months
    
    packaging_cost = PACKAGING_COST_PER_KG * quantity_kg
    energy_cost = ENERGY_COST_PER_KG_DAY * quantity_kg * (time_months * DAYS_PER_MONTH)
    variable_cost = packaging_cost + energy_cost
    
    # Perdas: 6% do volume ao mês multiplicado pelo preço
    loss_cost = MONTHLY_LOSS_RATE * quantity_kg * time_months * price_per_kg
    
    total_cost = fixed_cost + variable_cost + loss_cost
    
    return {
        "total_cost": total_cost,
        "fixed_cost": fixed_cost,
        "variable_cost": variable_cost,
        "loss_cost": loss_cost,
        "packaging_cost": packaging_cost,
        "energy_cost": energy_cost
    }

# Exporta constantes para uso em outros módulos
MONTHLY_LOSS_RATE = 0.06  # 6% ao mês
DAILY_LOSS_RATE = MONTHLY_LOSS_RATE / 30.0  # 0.002 (0.2%/dia)


# ========================================
# 2. PARÂMETROS CLIMÁTICOS
# Fonte: Clima e Produção de Tomates no Brasil (estudos tomate.pdf)
# ========================================

TEMPERATURE_THRESHOLDS = {
    "germination": {
        "min": 11.0,      # °C - mínimo absoluto
        "optimal_min": 15.0,  # °C - início da faixa ótima
        "optimal_max": 25.0,  # °C - fim da faixa ótima
        "max": 34.0      # °C - máximo absoluto
    },
    "vegetative_growth": {
        "min": 18.0,     # °C - mínimo ideal
        "optimal_min": 21.0,  # °C - início da faixa ótima
        "optimal_max": 24.0,  # °C - fim da faixa ótima
        "max": 32.0      # °C - máximo ideal
    },
    "fruiting": {
        "min": 18.0,     # °C - mínimo noturno
        "optimal_min": 20.0,  # °C - início da faixa ótima
        "optimal_max": 24.0,  # °C - fim da faixa ótima
        "max": 30.0      # °C - máximo ideal
    },
    "maturation": {
        "min": 10.0,     # °C - abaixo disso paralisa
        "optimal_min": 20.0,  # °C - início da faixa ótima
        "optimal_max": 24.0,  # °C - fim da faixa ótima
        "max": 30.0      # °C - máximo ideal
    },
    "critical": {
        "min_critical": 10.0,   # °C - abaixo disso: dano severo
        "max_critical": 34.0,   # °C - acima disso: abortamento/queima
        "heat_damage": 35.0     # °C - acima disso: menor pegamento
    }
}

def evaluate_temperature_risk(temp: float, phase: str = "vegetative_growth") -> Dict[str, any]:
    """
    Avalia risco climático baseado na temperatura.
    
    Args:
        temp: Temperatura em °C
        phase: Fase do cultivo (germination, vegetative_growth, fruiting, maturation)
    
    Returns:
        Dict com:
        - risk_level: 'low', 'moderate', 'high', 'critical'
        - score: 0.0 a 1.0 (1.0 = ideal, 0.0 = crítico)
        - message: Descrição do risco
    """
    thresholds = TEMPERATURE_THRESHOLDS.get(phase, TEMPERATURE_THRESHOLDS["vegetative_growth"])
    
    optimal_min = thresholds["optimal_min"]
    optimal_max = thresholds["optimal_max"]
    min_critical = thresholds.get("min", TEMPERATURE_THRESHOLDS["critical"]["min_critical"])
    max_critical = thresholds.get("max", TEMPERATURE_THRESHOLDS["critical"]["max_critical"])
    
    # Dentro da faixa ótima
    if optimal_min <= temp <= optimal_max:
        return {
            "risk_level": "low",
            "score": 1.0,
            "message": f"Temperatura ideal para {phase} ({temp}°C)"
        }
    
    # Fora da faixa ótima mas dentro dos limites
    if min_critical <= temp <= max_critical:
        # Calcula score baseado na distância da faixa ótima
        if temp < optimal_min:
            distance = (optimal_min - temp) / (optimal_min - min_critical)
        else:
            distance = (temp - optimal_max) / (max_critical - optimal_max)
        
        score = max(0.3, 1.0 - distance * 0.7)
        
        return {
            "risk_level": "moderate",
            "score": score,
            "message": f"Temperatura fora da faixa ótima para {phase} ({temp}°C)"
        }
    
    # Crítico
    if temp < min_critical or temp > max_critical:
        return {
            "risk_level": "critical",
            "score": 0.0,
            "message": f"Temperatura crítica para {phase} ({temp}°C) - risco de dano severo"
        }
    
    return {
        "risk_level": "unknown",
        "score": 0.5,
        "message": "Temperatura não classificada"
    }


# ========================================
# 3. RADIAÇÃO SOLAR
# Fonte: Clima e Produção de Tomates no Brasil
# ========================================

MIN_SOLAR_RADIATION = 8.4  # MJ/m²/dia - mínimo para crescimento ótimo

def evaluate_solar_radiation(radiation_mj_per_day: float) -> Dict[str, any]:
    """
    Avalia adequação da radiação solar.
    
    Args:
        radiation_mj_per_day: Radiação solar em MJ/m²/dia
    
    Returns:
        Dict com:
        - adequate: bool
        - score: 0.0 a 1.0
        - message: Descrição
    """
    if radiation_mj_per_day >= MIN_SOLAR_RADIATION:
        return {
            "adequate": True,
            "score": min(1.0, radiation_mj_per_day / MIN_SOLAR_RADIATION),
            "message": f"Radiação adequada ({radiation_mj_per_day} MJ/m²/dia)"
        }
    else:
        deficit = (MIN_SOLAR_RADIATION - radiation_mj_per_day) / MIN_SOLAR_RADIATION
        return {
            "adequate": False,
            "score": max(0.0, 1.0 - deficit),
            "message": f"Radiação abaixo do mínimo ({radiation_mj_per_day} < {MIN_SOLAR_RADIATION} MJ/m²/dia) - compromete produtividade"
        }


# ========================================
# 4. PRECIPITAÇÃO
# Fonte: Clima e Produção de Tomates no Brasil
# ========================================

RAINFALL_THRESHOLDS = {
    "ideal_min": 400.0,  # mm por ciclo
    "ideal_max": 600.0,  # mm por ciclo
    "excess_threshold": 600.0,  # mm - acima disso aumenta doenças
    "humidity_ideal_min": 50.0,  # % umidade relativa
    "humidity_ideal_max": 70.0   # % umidade relativa
}

def evaluate_rainfall(rainfall_mm_per_cycle: float, humidity_percent: float = None) -> Dict[str, any]:
    """
    Avalia adequação da precipitação.
    
    Args:
        rainfall_mm_per_cycle: Precipitação total em mm por ciclo
        humidity_percent: Umidade relativa em % (opcional)
    
    Returns:
        Dict com avaliação de risco
    """
    # Avalia precipitação
    if RAINFALL_THRESHOLDS["ideal_min"] <= rainfall_mm_per_cycle <= RAINFALL_THRESHOLDS["ideal_max"]:
        rain_score = 1.0
        rain_message = f"Precipitação ideal ({rainfall_mm_per_cycle} mm/ciclo)"
    elif rainfall_mm_per_cycle < RAINFALL_THRESHOLDS["ideal_min"]:
        rain_score = rainfall_mm_per_cycle / RAINFALL_THRESHOLDS["ideal_min"]
        rain_message = f"Precipitação abaixo do ideal ({rainfall_mm_per_cycle} < {RAINFALL_THRESHOLDS['ideal_min']} mm/ciclo)"
    else:  # > ideal_max
        excess = rainfall_mm_per_cycle - RAINFALL_THRESHOLDS["ideal_max"]
        rain_score = max(0.0, 1.0 - (excess / RAINFALL_THRESHOLDS["ideal_max"]))
        rain_message = f"Precipitação excessiva ({rainfall_mm_per_cycle} > {RAINFALL_THRESHOLDS['ideal_max']} mm/ciclo) - aumenta risco de doenças"
    
    result = {
        "rainfall_score": rain_score,
        "rainfall_message": rain_message,
        "rainfall_adequate": RAINFALL_THRESHOLDS["ideal_min"] <= rainfall_mm_per_cycle <= RAINFALL_THRESHOLDS["ideal_max"]
    }
    
    # Avalia umidade se fornecida
    if humidity_percent is not None:
        if RAINFALL_THRESHOLDS["humidity_ideal_min"] <= humidity_percent <= RAINFALL_THRESHOLDS["humidity_ideal_max"]:
            result["humidity_score"] = 1.0
            result["humidity_message"] = f"Umidade ideal ({humidity_percent}%)"
        else:
            if humidity_percent < RAINFALL_THRESHOLDS["humidity_ideal_min"]:
                result["humidity_score"] = humidity_percent / RAINFALL_THRESHOLDS["humidity_ideal_min"]
                result["humidity_message"] = f"Umidade baixa ({humidity_percent}%)"
            else:
                result["humidity_score"] = max(0.0, 1.0 - (humidity_percent - RAINFALL_THRESHOLDS["humidity_ideal_max"]) / 30.0)
                result["humidity_message"] = f"Umidade alta ({humidity_percent}%) - favorece doenças fúngicas"
    
    return result


# ========================================
# 5. CALENDÁRIO DE PLANTIO
# Fonte: Épocas de Plantio e Métricas de Decisão
# ========================================

PLANTING_CALENDAR = {
    "SE_HIGH_ALT": {  # Sudeste Alta Altitude (>800m)
        "months": [8, 9, 10, 11, 12, 1],  # Agosto a Janeiro
        "description": "Sudeste (Serra/Frio)"
    },
    "SE_LOW_ALT": {  # Sudeste Baixa Altitude
        "months": [2, 3, 4, 5, 6, 7],  # Fevereiro a Julho
        "description": "Sudeste (Baixada/Quente)"
    },
    "SP_WEST": {  # Oeste Paulista
        "months": [2, 3, 4, 5, 6],  # Fevereiro a Junho (evitar janeiro)
        "description": "Oeste Paulista"
    },
    "SOUTH": {  # Sul
        "months": [8, 9, 10, 11, 12, 1],  # Agosto a Janeiro
        "description": "Sul (Primavera/Verão)"
    },
    "CENTER_WEST": {  # Centro-Oeste
        "months": [3, 4, 5, 6, 7, 8, 9, 10],  # Março a Outubro
        "description": "Centro-Oeste"
    },
    "NORTHEAST": {  # Nordeste
        "months": [3, 4, 5, 6],  # Março a Junho
        "description": "Nordeste (polos serranos)"
    },
    "NORTH": {  # Norte
        "months": [3, 4, 5, 6, 7, 8, 9, 10],  # Março a Outubro
        "description": "Norte (época seca)"
    }
}

def is_planting_season(month: int, region: str) -> Tuple[bool, str]:
    """
    Verifica se um mês é adequado para plantio em uma região.
    
    Args:
        month: Mês (1=Janeiro, 12=Dezembro)
        region: Código da região (SE_HIGH_ALT, SE_LOW_ALT, SP_WEST, SOUTH, etc.)
    
    Returns:
        Tuple (is_adequate, message)
    """
    calendar = PLANTING_CALENDAR.get(region)
    if not calendar:
        return False, f"Região {region} não encontrada no calendário"
    
    if month in calendar["months"]:
        return True, f"Mês adequado para plantio em {calendar['description']}"
    else:
        return False, f"Mês fora da época ideal para {calendar['description']}"


# ========================================
# 6. RELAÇÕES MATEMÁTICAS ADICIONAIS
# Fonte: Clima e Produção de Tomates no Brasil
# ========================================

def calculate_temperature_by_altitude(base_temp: float, altitude_m: float) -> float:
    """
    Calcula temperatura ajustada por altitude.
    
    Fórmula: Para cada 100m de elevação, temperatura diminui ~0.5°C
    
    Args:
        base_temp: Temperatura na altitude de referência
        altitude_m: Altitude em metros
    
    Returns:
        Temperatura ajustada
    """
    TEMP_DECREASE_PER_100M = 0.5  # °C por 100m
    adjustment = (altitude_m / 100.0) * TEMP_DECREASE_PER_100M
    return base_temp - adjustment


def calculate_ideal_daily_variation(day_temp: float, night_temp: float) -> Dict[str, any]:
    """
    Avalia variação térmica diária.
    
    Fórmula: Variação ideal de 6-8°C entre dia e noite
    
    Args:
        day_temp: Temperatura diurna
        night_temp: Temperatura noturna
    
    Returns:
        Dict com avaliação
    """
    variation = day_temp - night_temp
    IDEAL_MIN = 6.0
    IDEAL_MAX = 8.0
    
    if IDEAL_MIN <= variation <= IDEAL_MAX:
        return {
            "adequate": True,
            "score": 1.0,
            "variation": variation,
            "message": f"Variação térmica ideal ({variation}°C)"
        }
    else:
        if variation < IDEAL_MIN:
            score = variation / IDEAL_MIN
            message = f"Variação térmica baixa ({variation} < {IDEAL_MIN}°C)"
        else:
            score = max(0.0, 1.0 - (variation - IDEAL_MAX) / IDEAL_MAX)
            message = f"Variação térmica alta ({variation} > {IDEAL_MAX}°C)"
        
        return {
            "adequate": False,
            "score": score,
            "variation": variation,
            "message": message
        }

