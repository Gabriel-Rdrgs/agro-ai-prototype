# ai-service/config/agronomic_params.py
"""
PARÂMETROS AGRONÔMICOS CIENTÍFICOS
Fonte da Verdade baseada em:
- document (1).pdf: Custo de Armazenagem
- document.pdf: Clima e Produção
- document (2).pdf: Épocas de Plantio
"""

TOMATO_SPECS = {
    # ========================================
    # 📦 ARMAZENAGEM & CUSTOS (Fonte: document-1.pdf)
    # ========================================
    "storage": {
        # Custos Fixos Mensais (Aluguel R$ 1500 + Seguro R$ 200)
        "fixed_cost_monthly": 1700.00,  #
        
        # Custos Variáveis
        "energy_cost_per_kg_day": 0.025, # R$ 0,025 por kg ao dia
        "packaging_cost_per_kg": 0.10,   # R$ 0,10 por kg (Embalagem)
        
        # Perdas Biológicas (Taxa de deterioração diária)
        # Estimado em 0.2% ao dia para cálculo do Cp (Custo de Perda)
        "daily_loss_rate": 0.002 #
    },

    # ========================================
    # 🌡️ GATILHOS CLIMÁTICOS (Fonte: document.pdf)
    # ========================================
    "climate_thresholds": {
        "min_maturation_temp": 10.0,     # < 10°C: Maturação paralisa (Perda de valor)
        "risk_germination_temp": 11.0,   # < 11°C: Risco para mudas
        "ideal_min": 18.0,               # Início da faixa ideal
        "ideal_max": 27.0,               # Fim da faixa ideal
        "critical_heat": 34.0            # > 34°C: Dano severo (Abortamento/Queima)
    },

    # ========================================
    # 🗓️ CALENDÁRIO DE PLANTIO (Fonte: document-2.pdf)
    # ========================================
    # Mês 1 = Janeiro, Mês 12 = Dezembro
    "planting_windows": {
        # Sudeste Alta Altitude (>800m): Agosto(8) a Janeiro(1)
        "SE_HIGH_ALT": {"start": 8, "end": 1, "desc": "Sudeste (Serra/Frio)"}, #
        
        # Sudeste Baixa Altitude: Fevereiro(2) a Julho(7)
        "SE_LOW_ALT":  {"start": 2, "end": 7, "desc": "Sudeste (Baixada/Quente)"}, #
        
        # Oeste Paulista: Fevereiro(2) a Junho(6) - Fugir da chuva de Jan
        "SP_WEST":     {"start": 2, "end": 6, "desc": "Oeste Paulista"}, #
        
        # Sul: Agosto(8) a Janeiro(1) - Fugir da geada de Julho
        "SOUTH":       {"start": 8, "end": 1, "desc": "Sul (Primavera/Verão)"} #
    },
    
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