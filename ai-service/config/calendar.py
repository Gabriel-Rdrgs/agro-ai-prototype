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
    # SOJA (referência)
    # ========================================
    'Soja': {
        'MT': {
            'ideal': [9, 10, 11],             # Set-Nov (plantio safra)
            'risk': [6, 7, 8],                 # Jun-Ago (seca severa)
            'notes': 'Ciclo 120 dias. Colheita Jan-Mar.',
            'source': 'ZARC/Embrapa'
        },
        'RS': {
            'ideal': [10, 11, 12],            # Out-Dez
            'risk': [5, 6],
            'notes': 'Colheita Mar-Mai. Evitar plantio tardio.',
            'source': 'ZARC/Embrapa'
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
