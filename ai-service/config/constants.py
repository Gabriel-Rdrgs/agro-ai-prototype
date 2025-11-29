# config/constants.py
"""
Constantes geográficas e logísticas.
Valores de mercado atualizados em 2025.
"""

# ========================================
# COORDENADAS ESTADUAIS (Capitais)
# ========================================
STATE_COORDS = {
    'SP': (-23.55, -46.63),  # São Paulo
    'MG': (-19.91, -43.93),  # Belo Horizonte
    'GO': (-16.68, -49.26),  # Goiânia
    'BA': (-12.97, -38.50),  # Salvador
    'RS': (-30.03, -51.22),  # Porto Alegre
    'PR': (-25.42, -49.27),  # Curitiba
    'SC': (-27.59, -48.54),  # Florianópolis
    'MT': (-15.60, -56.09),  # Cuiabá
    'MS': (-20.44, -54.64),  # Campo Grande
    'CE': (-3.71, -38.54),   # Fortaleza
    'PE': (-8.04, -34.87),   # Recife
    'RJ': (-22.90, -43.17),  # Rio de Janeiro
    'ES': (-20.31, -40.31),  # Vitória
    'DF': (-15.78, -47.93),  # Brasília
    'AM': (-3.11, -60.02),   # Manaus
    'PA': (-1.45, -48.48),   # Belém
}

# ========================================
# DADOS LOGÍSTICOS (Custos 2025)
# ========================================
LOGISTICS_DATA = {
    'avg_diesel_price': 6.20,        # R$/L - Média ANP (fallback)
    'truck_km_per_liter': 3.5,       # Consumo médio carreta
    'maintenance_per_km': 1.50,      # R$/km - Pneus, óleo, desgaste
    'driver_cost_per_km': 1.20,      # R$/km - Mão de obra
    'toll_cost_per_100km': 15.00,    # R$/100km - Pedágios (média)
    'insurance_per_trip': 250.00,    # R$/viagem - Seguro carga
}

# ========================================
# MULTIPLICADORES REGIONAIS DE PREÇO
# ========================================
# Baseado em custo de vida e demanda local
PRICE_MULTIPLIERS = {
    # Centros consumidores (alta demanda)
    'SP': 1.20,  # Grande SP (50% pop. estadual)
    'RJ': 1.25,  # Rio de Janeiro
    'DF': 1.15,  # Brasília (servidores públicos)
    
    # Produtores (oferta local alta)
    'BA': 0.90,  # Nordeste produtor
    'GO': 0.95,  # Centro-Oeste produtor
    'PR': 0.98,  # Sul produtor
    
    # Neutros
    'MG': 1.00,
    'RS': 1.00,
    'PE': 1.05,
    'CE': 1.03,
    'ES': 1.08,
    'SC': 0.97,
    'MT': 0.92,
    'MS': 0.93,
}

# ========================================
# CLIMATOLOGIA HISTÓRICA (mm/mês)
# ========================================
# Médias INMET 1991-2020
BRAZIL_CLIMATE_NORMS = {
    'SP': {
        1: 230, 2: 210, 3: 160, 4: 70, 5: 70, 6: 45,
        7: 35, 8: 40, 9: 80, 10: 125, 11: 144, 12: 200
    },
    'MG': {
        1: 270, 2: 200, 3: 160, 4: 60, 5: 30, 6: 20,
        7: 15, 8: 20, 9: 50, 10: 130, 11: 210, 12: 250
    },
    'GO': {
        1: 270, 2: 220, 3: 200, 4: 130, 5: 40, 6: 10,
        7: 5, 8: 15, 9: 60, 10: 150, 11: 220, 12: 260
    },
    'BA': {
        1: 60, 2: 50, 3: 80, 4: 120, 5: 180, 6: 180,
        7: 150, 8: 120, 9: 90, 10: 80, 11: 100, 12: 80
    },
    'RS': {
        1: 120, 2: 110, 3: 120, 4: 100, 5: 100, 6: 140,
        7: 150, 8: 140, 9: 140, 10: 140, 11: 130, 12: 110
    },
    'CE': {
        1: 100, 2: 150, 3: 230, 4: 300, 5: 180, 6: 40,
        7: 20, 8: 10, 9: 10, 10: 10, 11: 10, 12: 30
    }
}

# ========================================
# CAPACIDADES DE TRANSPORTE
# ========================================
TRUCK_CAPACITIES = {
    'Tomate': 1200,      # caixas (24 toneladas)
    'Soja': 550,         # sacas (33 toneladas)
    'Milho': 550,        # sacas (33 toneladas)
    'Default': 1000      # unidades genéricas
}

# ========================================
# PESOS UNITÁRIOS (kg)
# ========================================
UNIT_WEIGHTS = {
    'Tomate': 20.0,   # Caixa K (Embrapa)
    'Soja': 60.0,     # Saca padrão
    'Milho': 60.0,    # Saca padrão
    'Default': 1.0
}

# ========================================
# MARGENS PRODUTOR/MERCADO
# ========================================
# Baseado em dados Cepea/Embrapa 2024
PRODUCER_MARGINS = {
    'Tomate': 0.68,  # Produtor recebe 68% do preço Ceasa
    'Soja': 0.92,    # Produtor recebe 92% (mercado exportação)
    'Milho': 0.90,   # Produtor recebe 90%
    'Default': 0.70
}
