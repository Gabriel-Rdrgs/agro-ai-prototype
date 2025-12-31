# ai-service/config/corn_formulas.py
"""
FÓRMULAS MATEMÁTICAS CENTRALIZADAS PARA MILHO
Fonte da Verdade baseada nos documentos:
1. Clima e Produção de Milho no Brasil
2. Épocas de Plantio e Métricas de Decisão para Cultivo de Milho no Brasil
3. Função Custo de Armazenagem de Milho

TODA A APLICAÇÃO DEVE USAR ESTAS FÓRMULAS E PARÂMETROS PARA MILHO.
"""

from typing import Dict, Tuple
import math

# ========================================
# 1. FUNÇÃO CUSTO DE ARMAZENAGEM
# Fonte: Função Custo de Armazenagem de Milho.pdf
# ========================================

def calculate_corn_storage_cost(
    quantity_kg: float,
    time_months: float,
    price_per_kg: float
) -> Dict[str, float]:
    """
    Calcula o custo total de armazenagem de milho usando a fórmula oficial.
    
    Fórmula: C(x,t) = Cf + Cv(x,t) + Cp(x,t)
    
    Onde:
    - C(x,t) = custo total para quantidade x (kg) por tempo t (meses)
    - Cf = custos fixos mensais (armazém, seguro, manutenção)
    - Cv(x,t) = custos variáveis (energia, embalagens)
    - Cp(x,t) = custos de perdas (deterioração, umidade, pragas)
    
    Args:
        quantity_kg: Quantidade de milho em kg
        time_months: Tempo de armazenagem em meses
        price_per_kg: Preço médio de venda por kg
    
    Returns:
        Dict com:
        - total_cost: Custo total
        - fixed_cost: Custos fixos
        - variable_cost: Custos variáveis
        - loss_cost: Custos de perdas
    """
    # Custos fixos mensais (armazém para grãos - similar a soja)
    # Valores baseados em armazéns graneleiros
    FIXED_COST_MONTHLY = 1100.0  # R$ 900 (aluguel) + R$ 200 (seguro)
    
    # Custos variáveis
    PACKAGING_COST_PER_KG = 0.025  # R$ 0,025/kg (embalagens/sacos - menor que soja)
    ENERGY_COST_PER_KG_DAY = 0.012  # R$ 0,012/kg/dia (energia - menor que soja, grãos secos)
    DAYS_PER_MONTH = 30.0
    
    # Perdas mensais (milho tem perda similar a soja - grão seco, mas pode ter pragas)
    MONTHLY_LOSS_RATE = 0.025  # 2.5% ao mês (intermediário entre soja 2% e tomate 6%)
    
    # Calcula componentes
    fixed_cost = FIXED_COST_MONTHLY * time_months
    
    packaging_cost = PACKAGING_COST_PER_KG * quantity_kg
    energy_cost = ENERGY_COST_PER_KG_DAY * quantity_kg * (time_months * DAYS_PER_MONTH)
    variable_cost = packaging_cost + energy_cost
    
    # Perdas: 2.5% do volume ao mês multiplicado pelo preço
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
CORN_MONTHLY_LOSS_RATE = 0.025  # 2.5% ao mês
CORN_DAILY_LOSS_RATE = CORN_MONTHLY_LOSS_RATE / 30.0  # 0.00083 (0.083%/dia)


# ========================================
# 2. PARÂMETROS CLIMÁTICOS
# Fonte: Clima e Produção de Milho no Brasil
# ========================================

CORN_TEMPERATURE_THRESHOLDS = {
    "germination": {
        "min": 10.0,      # °C - mínimo absoluto
        "optimal_min": 25.0,  # °C - início da faixa ótima
        "optimal_max": 30.0,  # °C - fim da faixa ótima
        "max": 35.0      # °C - máximo absoluto
    },
    "vegetative_growth": {
        "min": 15.0,     # °C - mínimo ideal
        "optimal_min": 24.0,  # °C - início da faixa ótima
        "optimal_max": 30.0,  # °C - fim da faixa ótima
        "max": 35.0      # °C - máximo ideal
    },
    "flowering": {
        "min": 16.0,     # °C - mínimo noturno
        "optimal_min": 24.0,  # °C - início da faixa ótima
        "optimal_max": 30.0,  # °C - fim da faixa ótima
        "max": 35.0      # °C - máximo ideal
    },
    "grain_filling": {
        "min": 15.0,     # °C - abaixo disso reduz qualidade
        "optimal_min": 21.0,  # °C - início da faixa ótima
        "optimal_max": 25.0,  # °C - fim da faixa ótima
        "max": 30.0      # °C - máximo ideal
    },
    "maturation": {
        "min": 10.0,     # °C - abaixo disso paralisa
        "optimal_min": 15.0,  # °C - início da faixa ótima
        "optimal_max": 20.0,  # °C - fim da faixa ótima
        "max": 25.0      # °C - máximo ideal
    },
    "critical": {
        "min_critical": 10.0,   # °C - abaixo disso: dano severo
        "max_critical": 35.0,   # °C - acima disso: abortamento/queima
        "heat_damage": 30.0,     # °C - acima disso: perda de 3-5% por 1°C
        "cold_damage": 18.0      # °C - abaixo disso: compromete produção de matéria seca
    }
}

def evaluate_corn_temperature_risk(temp: float, phase: str = "vegetative_growth") -> Dict[str, any]:
    """
    Avalia risco climático baseado na temperatura para milho.
    
    Args:
        temp: Temperatura em °C
        phase: Fase do cultivo (germination, vegetative_growth, flowering, grain_filling, maturation)
    
    Returns:
        Dict com:
        - risk_level: 'low', 'moderate', 'high', 'critical'
        - score: 0.0 a 1.0 (1.0 = ideal, 0.0 = crítico)
        - message: Descrição do risco
        - productivity_loss: % de perda estimada (se aplicável)
    """
    thresholds = CORN_TEMPERATURE_THRESHOLDS.get(phase, CORN_TEMPERATURE_THRESHOLDS["vegetative_growth"])
    
    optimal_min = thresholds["optimal_min"]
    optimal_max = thresholds["optimal_max"]
    min_critical = thresholds.get("min", CORN_TEMPERATURE_THRESHOLDS["critical"]["min_critical"])
    max_critical = thresholds.get("max", CORN_TEMPERATURE_THRESHOLDS["critical"]["max_critical"])
    
    # Dentro da faixa ótima
    if optimal_min <= temp <= optimal_max:
        return {
            "risk_level": "low",
            "score": 1.0,
            "message": f"Temperatura ideal para {phase} do milho ({temp}°C)",
            "productivity_loss": 0.0
        }
    
    # Fora da faixa ótima mas dentro dos limites
    if min_critical <= temp <= max_critical:
        # Calcula score baseado na distância da faixa ótima
        if temp < optimal_min:
            distance = (optimal_min - temp) / (optimal_min - min_critical)
        else:
            distance = (temp - optimal_max) / (max_critical - optimal_max)
        
        score = max(0.3, 1.0 - distance * 0.7)
        
        # Calcula perda de produtividade se acima de 30°C durante floração/enchimento
        productivity_loss = 0.0
        if temp > 30.0 and phase in ["flowering", "grain_filling"]:
            # Perda de 3-5% para cada 1°C acima de 30°C
            excess = temp - 30.0
            productivity_loss = excess * 4.0  # Média de 4% por °C
        
        return {
            "risk_level": "moderate",
            "score": score,
            "message": f"Temperatura fora da faixa ótima para {phase} do milho ({temp}°C)",
            "productivity_loss": productivity_loss
        }
    
    # Crítico
    if temp < min_critical or temp > max_critical:
        productivity_loss = 0.0
        if temp > 30.0 and phase in ["flowering", "grain_filling"]:
            excess = temp - 30.0
            productivity_loss = excess * 4.0
        
        return {
            "risk_level": "critical",
            "score": 0.0,
            "message": f"Temperatura crítica para {phase} do milho ({temp}°C) - risco de dano severo",
            "productivity_loss": productivity_loss
        }
    
    return {
        "risk_level": "unknown",
        "score": 0.5,
        "message": "Temperatura não classificada",
        "productivity_loss": 0.0
    }


# ========================================
# 3. RADIAÇÃO SOLAR
# Fonte: Clima e Produção de Milho no Brasil
# ========================================

CORN_MIN_SOLAR_RADIATION = 7.5  # MJ/m²/dia - mínimo absoluto
CORN_OPTIMAL_SOLAR_RADIATION = 8.0  # MJ/m²/dia - ótimo

def evaluate_corn_solar_radiation(radiation_mj_per_day: float) -> Dict[str, any]:
    """
    Avalia adequação da radiação solar para milho.
    
    Args:
        radiation_mj_per_day: Radiação solar em MJ/m²/dia
    
    Returns:
        Dict com:
        - adequate: bool
        - score: 0.0 a 1.0
        - message: Descrição
        - productivity_impact: % de impacto na produtividade
    """
    if radiation_mj_per_day >= CORN_OPTIMAL_SOLAR_RADIATION:
        return {
            "adequate": True,
            "score": min(1.0, radiation_mj_per_day / CORN_OPTIMAL_SOLAR_RADIATION),
            "message": f"Radiação adequada para milho ({radiation_mj_per_day} MJ/m²/dia)",
            "productivity_impact": 0.0
        }
    elif radiation_mj_per_day >= CORN_MIN_SOLAR_RADIATION:
        deficit = (CORN_OPTIMAL_SOLAR_RADIATION - radiation_mj_per_day) / CORN_OPTIMAL_SOLAR_RADIATION
        return {
            "adequate": True,
            "score": max(0.5, 1.0 - deficit),
            "message": f"Radiação abaixo do ótimo para milho ({radiation_mj_per_day} < {CORN_OPTIMAL_SOLAR_RADIATION} MJ/m²/dia)",
            "productivity_impact": deficit * 10.0  # Até 10% de impacto
        }
    else:
        deficit = (CORN_MIN_SOLAR_RADIATION - radiation_mj_per_day) / CORN_MIN_SOLAR_RADIATION
        return {
            "adequate": False,
            "score": max(0.0, 1.0 - deficit),
            "message": f"Radiação crítica para milho ({radiation_mj_per_day} < {CORN_MIN_SOLAR_RADIATION} MJ/m²/dia) - compromete significativamente produtividade",
            "productivity_impact": 10.0 + (deficit * 20.0)  # 10-30% de impacto
        }


# ========================================
# 4. PRECIPITAÇÃO
# Fonte: Clima e Produção de Milho no Brasil
# ========================================

CORN_RAINFALL_THRESHOLDS = {
    "ideal_min": 500.0,  # mm por ciclo
    "ideal_max": 800.0,  # mm por ciclo
    "excess_threshold": 700.0,  # mm - acima disso aumenta doenças
    "humidity_ideal_min": 50.0,  # % umidade relativa
    "humidity_ideal_max": 70.0,   # % umidade relativa
    "critical_deficit": 400.0,  # mm - abaixo disso: déficit crítico
    "flowering_critical": True  # Floração é período crítico
}

def evaluate_corn_rainfall(rainfall_mm_per_cycle: float, humidity_percent: float = None, is_flowering: bool = False) -> Dict[str, any]:
    """
    Avalia adequação da precipitação para milho.
    
    Args:
        rainfall_mm_per_cycle: Precipitação total em mm por ciclo
        humidity_percent: Umidade relativa em % (opcional)
        is_flowering: Se está em período de floração (período crítico)
    
    Returns:
        Dict com avaliação de risco
    """
    # Avalia precipitação
    if CORN_RAINFALL_THRESHOLDS["ideal_min"] <= rainfall_mm_per_cycle <= CORN_RAINFALL_THRESHOLDS["ideal_max"]:
        rain_score = 1.0
        rain_message = f"Precipitação ideal para milho ({rainfall_mm_per_cycle} mm/ciclo)"
        productivity_loss = 0.0
    elif rainfall_mm_per_cycle < CORN_RAINFALL_THRESHOLDS["ideal_min"]:
        if rainfall_mm_per_cycle < CORN_RAINFALL_THRESHOLDS["critical_deficit"]:
            rain_score = 0.0
            rain_message = f"Déficit hídrico crítico para milho ({rainfall_mm_per_cycle} < {CORN_RAINFALL_THRESHOLDS['critical_deficit']} mm/ciclo) - perdas de 20-30%"
            productivity_loss = 25.0 if is_flowering else 15.0
        else:
            rain_score = rainfall_mm_per_cycle / CORN_RAINFALL_THRESHOLDS["ideal_min"]
            rain_message = f"Precipitação abaixo do ideal para milho ({rainfall_mm_per_cycle} < {CORN_RAINFALL_THRESHOLDS['ideal_min']} mm/ciclo)"
            productivity_loss = 10.0 if is_flowering else 5.0
    else:  # > ideal_max
        excess = rainfall_mm_per_cycle - CORN_RAINFALL_THRESHOLDS["ideal_max"]
        rain_score = max(0.0, 1.0 - (excess / CORN_RAINFALL_THRESHOLDS["ideal_max"]))
        rain_message = f"Precipitação excessiva para milho ({rainfall_mm_per_cycle} > {CORN_RAINFALL_THRESHOLDS['ideal_max']} mm/ciclo) - aumenta doenças fúngicas"
        productivity_loss = 5.0
    
    result = {
        "rainfall_score": rain_score,
        "rainfall_message": rain_message,
        "rainfall_adequate": CORN_RAINFALL_THRESHOLDS["ideal_min"] <= rainfall_mm_per_cycle <= CORN_RAINFALL_THRESHOLDS["ideal_max"],
        "productivity_loss": productivity_loss
    }
    
    # Avalia umidade se fornecida
    if humidity_percent is not None:
        if CORN_RAINFALL_THRESHOLDS["humidity_ideal_min"] <= humidity_percent <= CORN_RAINFALL_THRESHOLDS["humidity_ideal_max"]:
            result["humidity_score"] = 1.0
            result["humidity_message"] = f"Umidade ideal para milho ({humidity_percent}%)"
        else:
            if humidity_percent < CORN_RAINFALL_THRESHOLDS["humidity_ideal_min"]:
                result["humidity_score"] = humidity_percent / CORN_RAINFALL_THRESHOLDS["humidity_ideal_min"]
                result["humidity_message"] = f"Umidade baixa para milho ({humidity_percent}%) - reduz viabilidade do pólen"
                if is_flowering:
                    result["productivity_loss"] = result.get("productivity_loss", 0.0) + 5.0
            else:
                result["humidity_score"] = max(0.0, 1.0 - (humidity_percent - CORN_RAINFALL_THRESHOLDS["humidity_ideal_max"]) / 30.0)
                result["humidity_message"] = f"Umidade alta para milho ({humidity_percent}%) - favorece doenças fúngicas"
    
    return result


# ========================================
# 5. CALENDÁRIO DE PLANTIO
# Fonte: Épocas de Plantio e Métricas de Decisão para Cultivo de Milho no Brasil
# ========================================

CORN_PLANTING_CALENDAR = {
    "CENTER_WEST": {  # Mato Grosso, Mato Grosso do Sul, Goiás
        "months": [9, 10, 11, 12],  # Setembro a Dezembro (safra)
        "description": "Centro-Oeste (Safra Set-Dez, Safrinha Jan-Mar)",
        "harvest_months": [1, 2, 3, 4, 5],  # Janeiro a Maio
        "second_crop_months": [1, 2, 3]  # Safrinha: Jan-Mar
    },
    "SOUTH": {  # Paraná, Rio Grande do Sul, Santa Catarina
        "months": [8, 9, 10, 11],  # Agosto a Novembro (safra)
        "description": "Sul (Safra Ago-Nov, Safrinha limitada)",
        "harvest_months": [12, 1, 2, 3, 4],  # Dezembro a Abril
        "second_crop_months": []  # Safrinha limitada por geadas
    },
    "SOUTHEAST": {  # São Paulo, Minas Gerais, Espírito Santo
        "months": [9, 10, 11, 12],  # Setembro a Dezembro
        "description": "Sudeste (Safra Set-Dez)",
        "harvest_months": [1, 2, 3, 4, 5],  # Janeiro a Maio
        "second_crop_months": [1, 2]  # Safrinha limitada
    },
    "NORTHEAST": {  # Ceará, Pernambuco, Bahia, Piauí
        "months": [1, 2, 3, 4],  # Janeiro a Abril (após chuvas)
        "description": "Nordeste (Jan-Abr, após estação chuvosa)",
        "harvest_months": [4, 5, 6, 7],  # Abril a Julho
        "second_crop_months": []
    },
    "NORTH": {  # Pará, Amazonas, Rondônia, Maranhão, Tocantins
        "months": [1, 2, 3, 4, 5],  # Janeiro a Maio (época seca)
        "description": "Norte/Matopiba (Jan-Mai, época seca)",
        "harvest_months": [4, 5, 6, 7, 8],  # Abril a Agosto
        "second_crop_months": [5, 6]  # Safrinha em Matopiba
    }
}

def is_corn_planting_season(month: int, region: str, is_second_crop: bool = False) -> Tuple[bool, str]:
    """
    Verifica se um mês é adequado para plantio de milho em uma região.
    
    Args:
        month: Mês (1=Janeiro, 12=Dezembro)
        region: Código da região (CENTER_WEST, SOUTH, SOUTHEAST, NORTHEAST, NORTH)
        is_second_crop: Se é safrinha (segunda safra)
    
    Returns:
        Tuple (is_adequate, message)
    """
    calendar = CORN_PLANTING_CALENDAR.get(region)
    if not calendar:
        return False, f"Região {region} não encontrada no calendário de milho"
    
    if is_second_crop:
        months = calendar.get("second_crop_months", [])
        crop_type = "safrinha"
    else:
        months = calendar.get("months", [])
        crop_type = "safra"
    
    if month in months:
        return True, f"Mês adequado para plantio de milho ({crop_type}) em {calendar['description']}"
    else:
        return False, f"Mês fora da época ideal para {crop_type} em {calendar['description']}"


# ========================================
# 6. RELAÇÕES MATEMÁTICAS ADICIONAIS
# Fonte: Clima e Produção de Milho no Brasil
# ========================================

def calculate_corn_temperature_by_altitude(base_temp: float, altitude_m: float) -> float:
    """
    Calcula temperatura ajustada por altitude para milho.
    
    Fórmula: Para cada 100m de elevação, temperatura diminui ~0.6°C
    
    Args:
        base_temp: Temperatura na altitude de referência
        altitude_m: Altitude em metros
    
    Returns:
        Temperatura ajustada
    """
    TEMP_DECREASE_PER_100M = 0.6  # °C por 100m
    adjustment = (altitude_m / 100.0) * TEMP_DECREASE_PER_100M
    return base_temp - adjustment


def calculate_corn_thermal_amplitude_impact(day_temp: float, night_temp: float) -> Dict[str, any]:
    """
    Avalia variação térmica diária para milho.
    
    Fórmula: Variação ideal de 6-9°C entre dia e noite
    
    Args:
        day_temp: Temperatura diurna
        night_temp: Temperatura noturna
    
    Returns:
        Dict com avaliação
    """
    variation = day_temp - night_temp
    IDEAL_MIN = 6.0
    IDEAL_MAX = 9.0
    
    if IDEAL_MIN <= variation <= IDEAL_MAX:
        return {
            "adequate": True,
            "score": 1.0,
            "variation": variation,
            "message": f"Variação térmica ideal para milho ({variation}°C)",
            "productivity_impact": 0.0
        }
    else:
        if variation < IDEAL_MIN:
            score = variation / IDEAL_MIN
            message = f"Variação térmica baixa para milho ({variation} < {IDEAL_MIN}°C)"
            impact = (IDEAL_MIN - variation) * 2.0  # ~2% por °C abaixo
        else:
            score = max(0.0, 1.0 - (variation - IDEAL_MAX) / IDEAL_MAX)
            message = f"Variação térmica alta para milho ({variation} > {IDEAL_MAX}°C)"
            impact = (variation - IDEAL_MAX) * 1.5  # ~1.5% por °C acima
        
        return {
            "adequate": False,
            "score": score,
            "variation": variation,
            "message": message,
            "productivity_impact": impact
        }


def calculate_corn_cycle_duration(cultivar_type: str = "medium", region: str = "CENTER_WEST") -> int:
    """
    Retorna duração do ciclo em dias baseado no tipo de cultivar e região.
    
    Args:
        cultivar_type: 'early' (90-110 dias), 'medium' (110-130 dias), 'late' (130-150+ dias)
        region: Região (afeta ciclo - Sul tem ciclos mais longos)
    
    Returns:
        Duração do ciclo em dias
    """
    CYCLE_DURATIONS = {
        "early": 100,      # 90-110 dias (média)
        "medium": 120,     # 110-130 dias (média)
        "late": 140        # 130-150+ dias (média)
    }
    
    base_duration = CYCLE_DURATIONS.get(cultivar_type, 120)
    
    # Ajuste por região (Sul tem ciclos mais longos)
    if region == "SOUTH":
        base_duration += 10  # +10 dias no Sul
    
    return base_duration

