# config/calendar.py

"""
Calendário regional de plantio baseado em análise climática.
✅ FONTE ÚNICA DA VERDADE: config.mathematical_formulas.PLANTING_CALENDAR

Este arquivo mapeia regiões científicas para estados brasileiros,
mas os dados vêm de mathematical_formulas.py.
"""

from .mathematical_formulas import PLANTING_CALENDAR

def _get_months_from_calendar(region_key: str) -> list:
    """Converte PLANTING_CALENDAR para lista de meses [1, 2, 3...]"""
    if region_key not in PLANTING_CALENDAR:
        return []
    return PLANTING_CALENDAR[region_key]["months"]

PLANTING_CALENDAR = {
'Tomate': {
        # ✅ MAPEAMENTO: Regiões Científicas → Estados Brasileiros
        # Dados vêm de mathematical_formulas.PLANTING_CALENDAR
        
        # SP: Usa dados do Oeste Paulista (SP_WEST)
        'SP': {
            'ideal': _get_months_from_calendar('SP_WEST'),
            'risk': [1, 12], # Janeiro/Dezembro (Chuvas excessivas)
            'notes': PLANTING_CALENDAR['SP_WEST']['description'],
            'source': 'mathematical_formulas.py (Épocas de Plantio PDF)'
        },
        
        # MG, RJ, ES: Usam dados de Baixa Altitude (SE_LOW_ALT)
        'MG': {
            'ideal': _get_months_from_calendar('SE_LOW_ALT'),
            'risk': [12, 1],
            'notes': PLANTING_CALENDAR['SE_LOW_ALT']['description'],
            'source': 'mathematical_formulas.py'
        },
        'RJ': {
            'ideal': _get_months_from_calendar('SE_LOW_ALT'),
            'risk': [12, 1],
            'notes': 'Região Serrana pode seguir calendário de Alta Altitude (SE_HIGH_ALT).'
        },
        'ES': {
            'ideal': _get_months_from_calendar('SE_LOW_ALT'),
            'risk': [12, 1],
            'notes': PLANTING_CALENDAR['SE_LOW_ALT']['description']
        },
        
        # Sul (RS, SC, PR): Usa dados SOUTH
        'PR': {
            'ideal': _get_months_from_calendar('SOUTH'),
            'risk': [6, 7], # Inverno rigoroso
            'notes': PLANTING_CALENDAR['SOUTH']['description'],
            'source': 'mathematical_formulas.py'
        },
        'RS': {
            'ideal': _get_months_from_calendar('SOUTH'),
            'risk': [6, 7],
            'notes': 'Evitar geadas severas (junho-setembro).'
        },
        'SC': {
            'ideal': _get_months_from_calendar('SOUTH'),
            'risk': [6, 7],
            'notes': PLANTING_CALENDAR['SOUTH']['description']
        },
        
        # Centro-Oeste: Usa dados CENTER_WEST
        'GO': {
            'ideal': _get_months_from_calendar('CENTER_WEST'),
            'risk': [1, 2], # Chuvas intensas
            'notes': PLANTING_CALENDAR['CENTER_WEST']['description']
        },
        'MT': {
            'ideal': _get_months_from_calendar('CENTER_WEST'),
            'risk': [1, 2],
            'notes': PLANTING_CALENDAR['CENTER_WEST']['description']
        },
        'MS': {
            'ideal': _get_months_from_calendar('CENTER_WEST'),
            'risk': [1, 2],
            'notes': PLANTING_CALENDAR['CENTER_WEST']['description']
        },
        
        # Nordeste: Usa dados NORTHEAST
        'BA': {
            'ideal': _get_months_from_calendar('NORTHEAST'),
            'risk': [],
            'notes': PLANTING_CALENDAR['NORTHEAST']['description']
        },
        'CE': {
            'ideal': _get_months_from_calendar('NORTHEAST'),
            'risk': [],
            'notes': 'Polos serranos (ex: Ibiapaba) com condições ideais.'
        },
        'PE': {
            'ideal': _get_months_from_calendar('NORTHEAST'),
            'risk': [],
            'notes': 'Semiárido requer irrigação.'
        },
        
        # Norte: Usa dados NORTH
        'PA': {
            'ideal': _get_months_from_calendar('NORTH'),
            'risk': [11, 12, 1, 2], # Estação chuvosa
            'notes': PLANTING_CALENDAR['NORTH']['description']
        },
        'AM': {
            'ideal': _get_months_from_calendar('NORTH'),
            'risk': [11, 12, 1, 2],
            'notes': 'Cultivo protegido recomendado fora da época seca.'
        },
        
        # Fallback para estados não mapeados
        'default': {
            'ideal': [4, 5, 6, 7, 8], # Meses secos genéricos
            'risk': [],
            'notes': 'Calendário genérico (Estação Seca). Consulte ZARC para região específica.'
        }
    },
    
    # ========================================
    # SOJA (Completo - baseado em Épocas de Plantio e Métricas de Decisão)
    # ========================================
    'Soja': {
        # Centro-Oeste (Mato Grosso, Mato Grosso do Sul, Goiás)
        'MT': {
            'ideal': [9, 10, 11, 12],  # Setembro a Dezembro (prioridade: Set-Out)
            'risk': [1, 2, 3, 4, 5, 6, 7, 8],  # Fora da janela ideal
            'notes': 'Melhor época: Set-Out. ZARC local pode estender até 20 dias após Out. Colheita Jan-Mai.',
            'source': 'Épocas de Plantio e Métricas de Decisão para Cultivo de Soja no Brasil'
        },
        'MS': {
            'ideal': [9, 10, 11, 12],
            'risk': [1, 2, 3, 4, 5, 6, 7, 8],
            'notes': 'Melhor época: Set-Out. Colheita Jan-Mai.',
            'source': 'Épocas de Plantio e Métricas de Decisão para Cultivo de Soja no Brasil'
        },
        'GO': {
            'ideal': [9, 10, 11, 12],
            'risk': [1, 2, 3, 4, 5, 6, 7, 8],
            'notes': 'Melhor época: Set-Out. Colheita Jan-Mai.',
            'source': 'Épocas de Plantio e Métricas de Decisão para Cultivo de Soja no Brasil'
        },
        
        # Sul (Paraná, Rio Grande do Sul, Santa Catarina)
        'PR': {
            'ideal': [9, 10],  # Setembro a Outubro (concentrado em Outubro)
            'risk': [1, 2, 3, 4, 5, 6, 7, 8, 11, 12],  # Evitar plantio tardio (Nov em diante)
            'notes': 'Set-Out ideal. Evitar plantio tardio (Nov+). Cultivares precoces (90-110 dias) preferidas. Colheita Jan-Mai.',
            'source': 'Épocas de Plantio e Métricas de Decisão para Cultivo de Soja no Brasil'
        },
        'RS': {
            'ideal': [9, 10],
            'risk': [1, 2, 3, 4, 5, 6, 7, 8, 11, 12],
            'notes': 'Set-Out ideal. Evitar geadas tardias (Jul-Ago). Colheita Jan-Mai.',
            'source': 'Épocas de Plantio e Métricas de Decisão para Cultivo de Soja no Brasil'
        },
        'SC': {
            'ideal': [9, 10],
            'risk': [1, 2, 3, 4, 5, 6, 7, 8, 11, 12],
            'notes': 'Set-Out ideal. Cultivares precoces preferidas. Colheita Jan-Mai.',
            'source': 'Épocas de Plantio e Métricas de Decisão para Cultivo de Soja no Brasil'
        },
        
        # Sudeste (São Paulo, Minas Gerais, Espírito Santo)
        'SP': {
            'ideal': [9, 10, 11, 12],  # Setembro a Dezembro (concentrado: Out-Nov)
            'risk': [1, 2, 3, 4, 5, 6, 7, 8],
            'notes': 'Set-Dez, Out-Nov ideal. Altitudes <500m podem plantar até Dez. Colheita Jan-Mai.',
            'source': 'Épocas de Plantio e Métricas de Decisão para Cultivo de Soja no Brasil'
        },
        'MG': {
            'ideal': [9, 10, 11, 12],
            'risk': [1, 2, 3, 4, 5, 6, 7, 8],
            'notes': 'Set-Dez, Out-Nov ideal. Altitudes >800m têm maior flexibilidade. Colheita Jan-Mai.',
            'source': 'Épocas de Plantio e Métricas de Decisão para Cultivo de Soja no Brasil'
        },
        'ES': {
            'ideal': [9, 10, 11, 12],
            'risk': [1, 2, 3, 4, 5, 6, 7, 8],
            'notes': 'Set-Dez, Out-Nov ideal. Colheita Jan-Mai.',
            'source': 'Épocas de Plantio e Métricas de Decisão para Cultivo de Soja no Brasil'
        },
        'RJ': {
            'ideal': [9, 10, 11, 12],
            'risk': [1, 2, 3, 4, 5, 6, 7, 8],
            'notes': 'Set-Dez, Out-Nov ideal. Colheita Jan-Mai.',
            'source': 'Épocas de Plantio e Métricas de Decisão para Cultivo de Soja no Brasil'
        },
        
        # Nordeste (Ceará, Pernambuco, Bahia, Piauí)
        'CE': {
            'ideal': [10, 11, 12],  # Outubro a Dezembro (concentrado: Out-Nov)
            'risk': [1, 2, 3, 4, 5, 6, 7, 8, 9],
            'notes': 'Out-Dez, Out-Nov ideal. Polos serranos (ex: Ibiapaba) com temperaturas moderadas. Colheita Fev-Mai.',
            'source': 'Épocas de Plantio e Métricas de Decisão para Cultivo de Soja no Brasil'
        },
        'PE': {
            'ideal': [10, 11, 12],
            'risk': [1, 2, 3, 4, 5, 6, 7, 8, 9],
            'notes': 'Out-Dez, Out-Nov ideal. Semiárido depende de irrigação. Colheita Fev-Mai.',
            'source': 'Épocas de Plantio e Métricas de Decisão para Cultivo de Soja no Brasil'
        },
        'BA': {
            'ideal': [10, 11, 12],
            'risk': [1, 2, 3, 4, 5, 6, 7, 8, 9],
            'notes': 'Out-Dez, Out-Nov ideal. Colheita Fev-Mai.',
            'source': 'Épocas de Plantio e Métricas de Decisão para Cultivo de Soja no Brasil'
        },
        'PI': {
            'ideal': [10, 11, 12],
            'risk': [1, 2, 3, 4, 5, 6, 7, 8, 9],
            'notes': 'Out-Dez, Out-Nov ideal. Colheita Fev-Mai.',
            'source': 'Épocas de Plantio e Métricas de Decisão para Cultivo de Soja no Brasil'
        },
        
        # Norte (Pará, Amazonas, Rondônia)
        'PA': {
            'ideal': [1, 2, 3, 4, 5],  # Janeiro a Maio (concentrado: Jan-Fev)
            'risk': [6, 7, 8, 9, 10, 11, 12],
            'notes': 'Jan-Mai, Jan-Fev ideal. Região em expansão. Ciclos curtos (95-105 dias) preferidos. Colheita Mar-Jul.',
            'source': 'Épocas de Plantio e Métricas de Decisão para Cultivo de Soja no Brasil'
        },
        'AM': {
            'ideal': [1, 2, 3, 4, 5],
            'risk': [6, 7, 8, 9, 10, 11, 12],
            'notes': 'Jan-Mai, Jan-Fev ideal. Alto risco de doenças fúngicas. Colheita Mar-Jul.',
            'source': 'Épocas de Plantio e Métricas de Decisão para Cultivo de Soja no Brasil'
        },
        'RO': {
            'ideal': [1, 2, 3, 4, 5],
            'risk': [6, 7, 8, 9, 10, 11, 12],
            'notes': 'Jan-Mai, Jan-Fev ideal. Colheita Mar-Jul.',
            'source': 'Épocas de Plantio e Métricas de Decisão para Cultivo de Soja no Brasil'
        },
        
        # Fallback para estados não mapeados
        'default': {
            'ideal': [9, 10, 11, 12],  # Safra padrão
            'risk': [],
            'notes': 'Calendário genérico (Safra Set-Dez). Consulte ZARC para região específica.',
            'source': 'Épocas de Plantio e Métricas de Decisão para Cultivo de Soja no Brasil'
        }
    },
    
    # ========================================
    # MILHO (Completo - baseado em Clima e Produção de Milho no Brasil)
    # ========================================
    'Milho': {
        # Centro-Oeste (Mato Grosso, Mato Grosso do Sul, Goiás)
        'MT': {
            'ideal': [9, 10, 11, 12],  # Setembro a Dezembro (safra)
            'risk': [1, 2, 3, 4, 5, 6, 7, 8],  # Fora da janela ideal
            'notes': 'Safra: Set-Dez. Safrinha: Jan-Mar (veranicos críticos). Colheita Jan-Mai.',
            'source': 'Clima e Produção de Milho no Brasil'
        },
        'MS': {
            'ideal': [9, 10, 11, 12],
            'risk': [1, 2, 3, 4, 5, 6, 7, 8],
            'notes': 'Safra: Set-Dez. Safrinha: Jan-Mar. Colheita Jan-Mai.',
            'source': 'Clima e Produção de Milho no Brasil'
        },
        'GO': {
            'ideal': [9, 10, 11, 12],
            'risk': [1, 2, 3, 4, 5, 6, 7, 8],
            'notes': 'Safra: Set-Dez. Safrinha: Jan-Mar. Colheita Jan-Mai.',
            'source': 'Clima e Produção de Milho no Brasil'
        },
        
        # Sul (Paraná, Rio Grande do Sul, Santa Catarina)
        'PR': {
            'ideal': [8, 9, 10, 11],  # Agosto a Novembro (safra)
            'risk': [1, 2, 3, 4, 5, 6, 7, 12],  # Safrinha limitada por geadas
            'notes': 'Safra: Ago-Nov. Safrinha limitada (geadas). Colheita Dez-Abr.',
            'source': 'Clima e Produção de Milho no Brasil'
        },
        'RS': {
            'ideal': [8, 9, 10, 11],
            'risk': [1, 2, 3, 4, 5, 6, 7, 12],
            'notes': 'Safra: Ago-Nov. Safrinha limitada por geadas. Colheita Dez-Abr.',
            'source': 'Clima e Produção de Milho no Brasil'
        },
        'SC': {
            'ideal': [8, 9, 10, 11],
            'risk': [1, 2, 3, 4, 5, 6, 7, 12],
            'notes': 'Safra: Ago-Nov. Safrinha limitada. Colheita Dez-Abr.',
            'source': 'Clima e Produção de Milho no Brasil'
        },
        
        # Sudeste (São Paulo, Minas Gerais, Espírito Santo)
        'SP': {
            'ideal': [9, 10, 11, 12],  # Setembro a Dezembro
            'risk': [1, 2, 3, 4, 5, 6, 7, 8],
            'notes': 'Safra: Set-Dez. Safrinha limitada (Jan-Fev). Colheita Jan-Mai.',
            'source': 'Clima e Produção de Milho no Brasil'
        },
        'MG': {
            'ideal': [9, 10, 11, 12],
            'risk': [1, 2, 3, 4, 5, 6, 7, 8],
            'notes': 'Safra: Set-Dez. Safrinha limitada. Colheita Jan-Mai.',
            'source': 'Clima e Produção de Milho no Brasil'
        },
        'ES': {
            'ideal': [9, 10, 11, 12],
            'risk': [1, 2, 3, 4, 5, 6, 7, 8],
            'notes': 'Safra: Set-Dez. Colheita Jan-Mai.',
            'source': 'Clima e Produção de Milho no Brasil'
        },
        'RJ': {
            'ideal': [9, 10, 11, 12],
            'risk': [1, 2, 3, 4, 5, 6, 7, 8],
            'notes': 'Safra: Set-Dez. Colheita Jan-Mai.',
            'source': 'Clima e Produção de Milho no Brasil'
        },
        
        # Nordeste (Ceará, Pernambuco, Bahia, Piauí)
        'CE': {
            'ideal': [1, 2, 3, 4],  # Janeiro a Abril (após estação chuvosa)
            'risk': [5, 6, 7, 8, 9, 10, 11, 12],
            'notes': 'Jan-Abr (após chuvas). Semiárido requer irrigação. Colheita Abr-Jul.',
            'source': 'Clima e Produção de Milho no Brasil'
        },
        'PE': {
            'ideal': [1, 2, 3, 4],
            'risk': [5, 6, 7, 8, 9, 10, 11, 12],
            'notes': 'Jan-Abr. Irrigação essencial. Colheita Abr-Jul.',
            'source': 'Clima e Produção de Milho no Brasil'
        },
        'BA': {
            'ideal': [1, 2, 3, 4],
            'risk': [5, 6, 7, 8, 9, 10, 11, 12],
            'notes': 'Jan-Abr. Colheita Abr-Jul.',
            'source': 'Clima e Produção de Milho no Brasil'
        },
        'PI': {
            'ideal': [1, 2, 3, 4],
            'risk': [5, 6, 7, 8, 9, 10, 11, 12],
            'notes': 'Jan-Abr. Colheita Abr-Jul.',
            'source': 'Clima e Produção de Milho no Brasil'
        },
        
        # Norte e Matopiba (Pará, Amazonas, Rondônia, Maranhão, Tocantins)
        'PA': {
            'ideal': [1, 2, 3, 4, 5],  # Janeiro a Maio (época seca)
            'risk': [6, 7, 8, 9, 10, 11, 12],
            'notes': 'Jan-Mai (época seca). Safrinha viável em Matopiba (Mai-Jun). Colheita Abr-Ago.',
            'source': 'Clima e Produção de Milho no Brasil'
        },
        'AM': {
            'ideal': [1, 2, 3, 4, 5],
            'risk': [6, 7, 8, 9, 10, 11, 12],
            'notes': 'Jan-Mai. Pressão fitossanitária elevada. Colheita Abr-Ago.',
            'source': 'Clima e Produção de Milho no Brasil'
        },
        'RO': {
            'ideal': [1, 2, 3, 4, 5],
            'risk': [6, 7, 8, 9, 10, 11, 12],
            'notes': 'Jan-Mai. Colheita Abr-Ago.',
            'source': 'Clima e Produção de Milho no Brasil'
        },
        'MA': {
            'ideal': [1, 2, 3, 4, 5],  # Matopiba
            'risk': [6, 7, 8, 9, 10, 11, 12],
            'notes': 'Jan-Mai. Safrinha viável (Mai-Jun). Colheita Abr-Ago.',
            'source': 'Clima e Produção de Milho no Brasil'
        },
        'TO': {
            'ideal': [1, 2, 3, 4, 5],  # Matopiba
            'risk': [6, 7, 8, 9, 10, 11, 12],
            'notes': 'Jan-Mai. Safrinha viável (Mai-Jun). Colheita Abr-Ago.',
            'source': 'Clima e Produção de Milho no Brasil'
        },
        
        # Fallback para estados não mapeados
        'default': {
            'ideal': [9, 10, 11, 12],  # Safra padrão
            'risk': [],
            'notes': 'Calendário genérico (Safra Set-Dez). Consulte ZARC para região específica.',
            'source': 'Clima e Produção de Milho no Brasil'
        }
    }
}


# ========================================
# FUNÇÕES AUXILIARES
# ========================================
def get_planting_window(product: str, state: str) -> dict:
    """
    Retorna janela de plantio para produto/estado.
    
    Returns:
        {'ideal': [meses], 'risk': [meses], 'notes': str}
    """
    calendar = PLANTING_CALENDAR.get(product, {})
    return calendar.get(state, {
        'ideal': list(range(1, 13)),  # Fallback: ano todo
        'risk': [],
        'notes': 'Dados não disponíveis para esta região.'
    })


def is_ideal_month(product: str, state: str, month: int) -> bool:
    """Verifica se mês está na janela ideal"""
    window = get_planting_window(product, state)
    return month in window.get('ideal', [])


def is_risk_month(product: str, state: str, month: int) -> bool:
    """Verifica se mês está na janela de risco"""
    window = get_planting_window(product, state)
    return month in window.get('risk', [])
