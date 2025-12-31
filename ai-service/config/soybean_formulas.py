# ai-service/config/soybean_formulas.py
"""
FÓRMULAS MATEMÁTICAS CENTRALIZADAS PARA SOJA
Fonte da Verdade baseada nos documentos:
1. Épocas de Plantio e Métricas de Decisão para Cultivo de Soja no Brasil
2. Clima e Produção de Soja
3. Função Custo de Armazenagem de Soja

TODA A APLICAÇÃO DEVE USAR ESTAS FÓRMULAS E PARÂMETROS PARA SOJA.
"""

from typing import Dict, Tuple
import math

# ========================================
# 1. FUNÇÃO CUSTO DE ARMAZENAGEM
# Fonte: Função Custo Armazenagem Soja.pdf
# ========================================

def calculate_soybean_storage_cost(
    quantity_kg: float,
    time_months: float,
    price_per_kg: float
) -> Dict[str, float]:
    """
    Calcula o custo total de armazenagem de soja usando a fórmula oficial.
    
    Fórmula: C(x,t) = Cf + Cv(x,t) + Cp(x,t)
    
    Onde:
    - C(x,t) = custo total para quantidade x (kg) por tempo t (meses)
    - Cf = custos fixos mensais (armazém, seguro, manutenção)
    - Cv(x,t) = custos variáveis (energia, embalagens)
    - Cp(x,t) = custos de perdas (deterioração, umidade)
    
    Args:
        quantity_kg: Quantidade de soja em kg
        time_months: Tempo de armazenagem em meses
        price_per_kg: Preço médio de venda por kg
    
    Returns:
        Dict com:
        - total_cost: Custo total
        - fixed_cost: Custos fixos
        - variable_cost: Custos variáveis
        - loss_cost: Custos de perdas
    """
    # Custos fixos mensais (armazém para grãos)
    # Valores baseados em armazéns graneleiros (menores que tomate por volume)
    FIXED_COST_MONTHLY = 1200.0  # R$ 1000 (aluguel) + R$ 200 (seguro)
    
    # Custos variáveis
    PACKAGING_COST_PER_KG = 0.03  # R$ 0,03/kg (embalagens/sacos - menor que tomate)
    ENERGY_COST_PER_KG_DAY = 0.015  # R$ 0,015/kg/dia (energia - menor que tomate, grãos secos)
    DAYS_PER_MONTH = 30.0
    
    # Perdas mensais (soja tem menor perda que tomate - grão seco)
    MONTHLY_LOSS_RATE = 0.02  # 2% ao mês (vs 6% do tomate)
    
    # Calcula componentes
    fixed_cost = FIXED_COST_MONTHLY * time_months
    
    packaging_cost = PACKAGING_COST_PER_KG * quantity_kg
    energy_cost = ENERGY_COST_PER_KG_DAY * quantity_kg * (time_months * DAYS_PER_MONTH)
    variable_cost = packaging_cost + energy_cost
    
    # Perdas: 2% do volume ao mês multiplicado pelo preço
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
SOYBEAN_MONTHLY_LOSS_RATE = 0.02  # 2% ao mês
SOYBEAN_DAILY_LOSS_RATE = SOYBEAN_MONTHLY_LOSS_RATE / 30.0  # 0.00067 (0.067%/dia)


# ========================================
# 2. PARÂMETROS CLIMÁTICOS
# Fonte: Épocas de Plantio e Métricas de Decisão para Cultivo de Soja no Brasil
# ========================================

SOYBEAN_TEMPERATURE_THRESHOLDS = {
    "germination": {
        "min": 15.0,      # °C - mínimo absoluto
        "optimal_min": 20.0,  # °C - início da faixa ótima
        "optimal_max": 25.0,  # °C - fim da faixa ótima
        "max": 35.0      # °C - máximo absoluto
    },
    "vegetative_growth": {
        "min": 15.0,     # °C - mínimo ideal
        "optimal_min": 21.0,  # °C - início da faixa ótima
        "optimal_max": 27.0,  # °C - fim da faixa ótima
        "max": 30.0      # °C - máximo ideal
    },
    "flowering": {
        "min": 18.0,     # °C - mínimo noturno
        "optimal_min": 24.0,  # °C - início da faixa ótima
        "optimal_max": 28.0,  # °C - fim da faixa ótima
        "max": 30.0      # °C - máximo ideal (>30°C eleva evapotranspiração)
    },
    "grain_filling": {
        "min": 18.0,     # °C - abaixo disso prolonga ciclo
        "optimal_min": 24.0,  # °C - início da faixa ótima
        "optimal_max": 28.0,  # °C - fim da faixa ótima
        "max": 30.0      # °C - máximo ideal
    },
    "maturation": {
        "min": 18.0,     # °C - abaixo disso prolonga ciclo desnecessariamente
        "optimal_min": 20.0,  # °C - início da faixa ótima
        "optimal_max": 25.0,  # °C - fim da faixa ótima
        "max": 30.0      # °C - máximo ideal
    },
    "critical": {
        "min_critical": 15.0,   # °C - abaixo disso: dano severo
        "max_critical": 40.0,   # °C - acima disso: abortamento/queima
        "heat_damage": 35.0     # °C - acima disso: menor pegamento
    }
}

def evaluate_soybean_temperature_risk(temp: float, phase: str = "vegetative_growth") -> Dict[str, any]:
    """
    Avalia risco climático baseado na temperatura para soja.
    
    Args:
        temp: Temperatura em °C
        phase: Fase do cultivo (germination, vegetative_growth, flowering, grain_filling, maturation)
    
    Returns:
        Dict com:
        - risk_level: 'low', 'moderate', 'high', 'critical'
        - score: 0.0 a 1.0 (1.0 = ideal, 0.0 = crítico)
        - message: Descrição do risco
    """
    thresholds = SOYBEAN_TEMPERATURE_THRESHOLDS.get(phase, SOYBEAN_TEMPERATURE_THRESHOLDS["vegetative_growth"])
    
    optimal_min = thresholds["optimal_min"]
    optimal_max = thresholds["optimal_max"]
    min_critical = thresholds.get("min", SOYBEAN_TEMPERATURE_THRESHOLDS["critical"]["min_critical"])
    max_critical = thresholds.get("max", SOYBEAN_TEMPERATURE_THRESHOLDS["critical"]["max_critical"])
    
    # Dentro da faixa ótima
    if optimal_min <= temp <= optimal_max:
        return {
            "risk_level": "low",
            "score": 1.0,
            "message": f"Temperatura ideal para {phase} da soja ({temp}°C)"
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
            "message": f"Temperatura fora da faixa ótima para {phase} da soja ({temp}°C)"
        }
    
    # Crítico
    if temp < min_critical or temp > max_critical:
        return {
            "risk_level": "critical",
            "score": 0.0,
            "message": f"Temperatura crítica para {phase} da soja ({temp}°C) - risco de dano severo"
        }
    
    return {
        "risk_level": "unknown",
        "score": 0.5,
        "message": "Temperatura não classificada"
    }


# ========================================
# 3. RADIAÇÃO SOLAR
# Fonte: Épocas de Plantio e Métricas de Decisão
# ========================================

SOYBEAN_MIN_SOLAR_RADIATION = 8.0  # MJ/m²/dia - mínimo para crescimento ótimo

def evaluate_soybean_solar_radiation(radiation_mj_per_day: float) -> Dict[str, any]:
    """
    Avalia adequação da radiação solar para soja.
    
    Args:
        radiation_mj_per_day: Radiação solar em MJ/m²/dia
    
    Returns:
        Dict com:
        - adequate: bool
        - score: 0.0 a 1.0
        - message: Descrição
    """
    if radiation_mj_per_day >= SOYBEAN_MIN_SOLAR_RADIATION:
        return {
            "adequate": True,
            "score": min(1.0, radiation_mj_per_day / SOYBEAN_MIN_SOLAR_RADIATION),
            "message": f"Radiação adequada para soja ({radiation_mj_per_day} MJ/m²/dia)"
        }
    else:
        deficit = (SOYBEAN_MIN_SOLAR_RADIATION - radiation_mj_per_day) / SOYBEAN_MIN_SOLAR_RADIATION
        return {
            "adequate": False,
            "score": max(0.0, 1.0 - deficit),
            "message": f"Radiação abaixo do mínimo para soja ({radiation_mj_per_day} < {SOYBEAN_MIN_SOLAR_RADIATION} MJ/m²/dia) - compromete produtividade"
        }


# ========================================
# 4. PRECIPITAÇÃO
# Fonte: Épocas de Plantio e Métricas de Decisão
# ========================================

SOYBEAN_RAINFALL_THRESHOLDS = {
    "ideal_min": 600.0,  # mm por ciclo (maior que tomate - soja precisa mais água)
    "ideal_max": 1000.0,  # mm por ciclo
    "excess_threshold": 1000.0,  # mm - acima disso aumenta doenças
    "humidity_ideal_min": 60.0,  # % umidade relativa (maior que tomate)
    "humidity_ideal_max": 80.0,   # % umidade relativa
    "critical_deficit": 500.0  # mm - abaixo disso: veranico crítico
}

def evaluate_soybean_rainfall(rainfall_mm_per_cycle: float, humidity_percent: float = None) -> Dict[str, any]:
    """
    Avalia adequação da precipitação para soja.
    
    Args:
        rainfall_mm_per_cycle: Precipitação total em mm por ciclo
        humidity_percent: Umidade relativa em % (opcional)
    
    Returns:
        Dict com avaliação de risco
    """
    # Avalia precipitação
    if SOYBEAN_RAINFALL_THRESHOLDS["ideal_min"] <= rainfall_mm_per_cycle <= SOYBEAN_RAINFALL_THRESHOLDS["ideal_max"]:
        rain_score = 1.0
        rain_message = f"Precipitação ideal para soja ({rainfall_mm_per_cycle} mm/ciclo)"
    elif rainfall_mm_per_cycle < SOYBEAN_RAINFALL_THRESHOLDS["ideal_min"]:
        if rainfall_mm_per_cycle < SOYBEAN_RAINFALL_THRESHOLDS["critical_deficit"]:
            rain_score = 0.0
            rain_message = f"Veranico crítico para soja ({rainfall_mm_per_cycle} < {SOYBEAN_RAINFALL_THRESHOLDS['critical_deficit']} mm/ciclo) - requer irrigação"
        else:
            rain_score = rainfall_mm_per_cycle / SOYBEAN_RAINFALL_THRESHOLDS["ideal_min"]
            rain_message = f"Precipitação abaixo do ideal para soja ({rainfall_mm_per_cycle} < {SOYBEAN_RAINFALL_THRESHOLDS['ideal_min']} mm/ciclo)"
    else:  # > ideal_max
        excess = rainfall_mm_per_cycle - SOYBEAN_RAINFALL_THRESHOLDS["ideal_max"]
        rain_score = max(0.0, 1.0 - (excess / SOYBEAN_RAINFALL_THRESHOLDS["ideal_max"]))
        rain_message = f"Precipitação excessiva para soja ({rainfall_mm_per_cycle} > {SOYBEAN_RAINFALL_THRESHOLDS['ideal_max']} mm/ciclo) - aumenta risco de ferrugem asiática"
    
    result = {
        "rainfall_score": rain_score,
        "rainfall_message": rain_message,
        "rainfall_adequate": SOYBEAN_RAINFALL_THRESHOLDS["ideal_min"] <= rainfall_mm_per_cycle <= SOYBEAN_RAINFALL_THRESHOLDS["ideal_max"]
    }
    
    # Avalia umidade se fornecida
    if humidity_percent is not None:
        if SOYBEAN_RAINFALL_THRESHOLDS["humidity_ideal_min"] <= humidity_percent <= SOYBEAN_RAINFALL_THRESHOLDS["humidity_ideal_max"]:
            result["humidity_score"] = 1.0
            result["humidity_message"] = f"Umidade ideal para soja ({humidity_percent}%)"
        else:
            if humidity_percent < SOYBEAN_RAINFALL_THRESHOLDS["humidity_ideal_min"]:
                result["humidity_score"] = humidity_percent / SOYBEAN_RAINFALL_THRESHOLDS["humidity_ideal_min"]
                result["humidity_message"] = f"Umidade baixa para soja ({humidity_percent}%)"
            else:
                result["humidity_score"] = max(0.0, 1.0 - (humidity_percent - SOYBEAN_RAINFALL_THRESHOLDS["humidity_ideal_max"]) / 20.0)
                result["humidity_message"] = f"Umidade alta para soja ({humidity_percent}%) - favorece ferrugem asiática"
    
    return result


# ========================================
# 5. CALENDÁRIO DE PLANTIO
# Fonte: Épocas de Plantio e Métricas de Decisão para Cultivo de Soja no Brasil
# ========================================

SOYBEAN_PLANTING_CALENDAR = {
    "CENTER_WEST": {  # Mato Grosso, Mato Grosso do Sul, Goiás
        "months": [9, 10, 11, 12],  # Setembro a Dezembro (prioridade: Set-Out)
        "description": "Centro-Oeste (Set-Out ideal, até Dez conforme ZARC)",
        "harvest_months": [1, 2, 3, 4, 5]  # Janeiro a Maio
    },
    "SOUTH": {  # Paraná, Rio Grande do Sul, Santa Catarina
        "months": [9, 10],  # Setembro a Outubro (concentrado em Outubro)
        "description": "Sul (Set-Out, evitar plantio tardio)",
        "harvest_months": [1, 2, 3, 4, 5]  # Janeiro a Maio
    },
    "SOUTHEAST": {  # São Paulo, Minas Gerais, Espírito Santo
        "months": [9, 10, 11, 12],  # Setembro a Dezembro (concentrado: Out-Nov)
        "description": "Sudeste (Set-Dez, Out-Nov ideal)",
        "harvest_months": [1, 2, 3, 4, 5]  # Janeiro a Maio
    },
    "NORTHEAST": {  # Ceará, Pernambuco, Bahia, Piauí
        "months": [10, 11, 12],  # Outubro a Dezembro (concentrado: Out-Nov)
        "description": "Nordeste (Out-Dez, Out-Nov ideal)",
        "harvest_months": [2, 3, 4, 5]  # Fevereiro a Maio
    },
    "NORTH": {  # Pará, Amazonas, Rondônia, Mato Grosso
        "months": [1, 2, 3, 4, 5],  # Janeiro a Maio (concentrado: Jan-Fev)
        "description": "Norte (Jan-Mai, Jan-Fev ideal)",
        "harvest_months": [3, 4, 5, 6, 7]  # Março a Julho
    }
}

def is_soybean_planting_season(month: int, region: str) -> Tuple[bool, str]:
    """
    Verifica se um mês é adequado para plantio de soja em uma região.
    
    Args:
        month: Mês (1=Janeiro, 12=Dezembro)
        region: Código da região (CENTER_WEST, SOUTH, SOUTHEAST, NORTHEAST, NORTH)
    
    Returns:
        Tuple (is_adequate, message)
    """
    calendar = SOYBEAN_PLANTING_CALENDAR.get(region)
    if not calendar:
        return False, f"Região {region} não encontrada no calendário de soja"
    
    if month in calendar["months"]:
        return True, f"Mês adequado para plantio de soja em {calendar['description']}"
    else:
        return False, f"Mês fora da época ideal para {calendar['description']}"


# ========================================
# 6. RELAÇÕES MATEMÁTICAS ADICIONAIS
# Fonte: Clima e Produção de Soja
# ========================================

def calculate_soybean_temperature_by_altitude(base_temp: float, altitude_m: float) -> float:
    """
    Calcula temperatura ajustada por altitude para soja.
    
    Fórmula: Para cada 100m de elevação, temperatura diminui ~0.6°C
    
    Args:
        base_temp: Temperatura na altitude de referência
        altitude_m: Altitude em metros
    
    Returns:
        Temperatura ajustada
    """
    TEMP_DECREASE_PER_100M = 0.6  # °C por 100m (maior que tomate devido à sensibilidade)
    adjustment = (altitude_m / 100.0) * TEMP_DECREASE_PER_100M
    return base_temp - adjustment


def calculate_soybean_cycle_duration(cultivar_type: str = "medium") -> int:
    """
    Retorna duração do ciclo em dias baseado no tipo de cultivar.
    
    Args:
        cultivar_type: 'early' (90-110 dias), 'medium' (110-130 dias), 'late' (130-150+ dias)
    
    Returns:
        Duração do ciclo em dias
    """
    CYCLE_DURATIONS = {
        "early": 100,      # 90-110 dias (média)
        "medium": 120,     # 110-130 dias (média)
        "late": 140        # 130-150+ dias (média)
    }
    return CYCLE_DURATIONS.get(cultivar_type, 120)

