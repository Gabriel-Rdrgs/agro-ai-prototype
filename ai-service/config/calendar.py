# config/calendar.py
"""
Calendário regional de plantio baseado em análise climática.

Fontes:
- document-2.pdf: Épocas de Plantio e Métricas de Decisão (Tabela 1)
- Embrapa, UFG, ZARC (Zoneamento Agrícola de Risco Climático)

Critérios de definição:
1. Temperatura média mensal > 15°C
2. Precipitação < 150mm/mês concentrado
3. Radiação solar > 8 MJ/m²/dia
4. Evita geadas, chuvas torrenciais e calor extremo

Última atualização: 2025-12-04
"""

from .agronomic_params import TOMATO_SPECS

def _get_months(window_data):
    """Converte start/end do agronomic_params para lista de meses [1, 2, 3...]"""
    start = window_data['start']
    end = window_data['end']
    if start <= end:
        return list(range(start, end + 1))
    # Caso atravesse o ano (ex: Ago a Jan)
    return list(range(start, 13)) + list(range(1, end + 1))

PLANTING_CALENDAR = {
'Tomate': {
        # Mapeando Regiões Científicas para Estados (Adapter)
        
        # SP: Usa dados do Oeste Paulista (SP_WEST)
        'SP': {
            'ideal': _get_months(TOMATO_SPECS['planting_windows']['SP_WEST']),
            'risk': [1, 12], # Janeiro/Dezembro (Chuvas excessivas)
            'notes': TOMATO_SPECS['planting_windows']['SP_WEST']['desc'],
            'source': 'Document-2.pdf'
        },
        
        # MG, RJ, ES: Usam dados de Baixa Altitude (SE_LOW_ALT)
        'MG': {
            'ideal': _get_months(TOMATO_SPECS['planting_windows']['SE_LOW_ALT']),
            'risk': [12, 1],
            'notes': TOMATO_SPECS['planting_windows']['SE_LOW_ALT']['desc'],
            'source': 'Document-2.pdf'
        },
        'RJ': {
            'ideal': _get_months(TOMATO_SPECS['planting_windows']['SE_LOW_ALT']),
            'risk': [12, 1],
            'notes': 'Região Serrana pode seguir calendário de Alta Altitude.'
        },
        
        # Sul (RS, SC, PR): Usa dados SOUTH
        'PR': {
            'ideal': _get_months(TOMATO_SPECS['planting_windows']['SOUTH']),
            'risk': [6, 7], # Inverno rigoroso
            'notes': TOMATO_SPECS['planting_windows']['SOUTH']['desc'],
            'source': 'Document-2.pdf'
        },
        'RS': {
            'ideal': _get_months(TOMATO_SPECS['planting_windows']['SOUTH']),
            'risk': [6, 7],
            'notes': 'Evitar geadas severas.'
        },
        
        # Fallback para outros estados (GO, BA) - Mantemos lógica segura
        'default': {
            'ideal': [4, 5, 6, 7, 8], # Meses secos no cerrado/nordeste
            'risk': [],
            'notes': 'Calendário genérico (Estação Seca).'
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
