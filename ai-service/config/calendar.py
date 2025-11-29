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

Última atualização: 2025-11-29
"""

PLANTING_CALENDAR = {
    'Tomate': {
        # ========================================
        # SUDESTE (70% da produção nacional)
        # ========================================
        'SP': {
            'ideal': [2, 3, 4, 5, 6],        # Fev-Jun (pós-chuvas de verão)
            'risk': [1, 12, 7],               # Jan/Dez (chuvas 100mm+), Jul (frio)
            'notes': (
                'Altitudes > 800m permitem plantio Ago-Jan. '
                'Oeste paulista: Fev-Jun mais seguro. '
                'Evitar janeiro (precipitação > 200mm/mês).'
            ),
            'source': 'document-2.pdf pág 2, Embrapa 2024'
        },
        
        'MG': {
            'ideal': [2, 3, 4, 5, 6, 7, 8, 9],  # Fev-Set (janela ampla)
            'risk': [1, 12],
            'notes': (
                'Maior flexibilidade pela altitude variada (500-1200m). '
                'Sul de Minas: similar a SP. '
                'Triângulo: similar a GO.'
            ),
            'source': 'document-2.pdf pág 2'
        },
        
        'RJ': {
            'ideal': [2, 3, 4, 5, 6],
            'risk': [1, 12, 7],
            'notes': 'Similar a SP. Região serrana tem janela mais ampla.',
            'source': 'document-2.pdf pág 2'
        },
        
        'ES': {
            'ideal': [2, 3, 4, 5, 6],
            'risk': [1, 11, 12],
            'notes': (
                'Venda Nova do Imigrante: frio invernal atrasa maturação. '
                'Redução de oferta de até 35% em anos frios (2025).'
            ),
            'source': 'document.pdf pág 5, G1 ES 2025'
        },
        
        # ========================================
        # SUL (12% da produção, uso intensivo de estufas)
        # ========================================
        'RS': {
            'ideal': [8, 9, 10, 11, 12, 1],   # Ago-Jan (Primavera-Verão)
            'risk': [5, 6, 7],                 # Mai-Jul (geadas críticas)
            'notes': (
                'Priorizar plantio Ago-Nov para colheita Nov-Fev. '
                'Geadas em Jun-Ago impedem cultivo ao ar livre. '
                'Estufas permitem produção anual.'
            ),
            'source': 'document-2.pdf pág 3, Tabela 1'
        },
        
        'SC': {
            'ideal': [8, 9, 10, 11, 12],
            'risk': [5, 6, 7],
            'notes': 'Similar a RS. Oeste catarinense tem frio menos intenso.',
            'source': 'document-2.pdf pág 3'
        },
        
        'PR': {
            'ideal': [8, 9, 10, 11, 12, 1],
            'risk': [5, 6, 7],
            'notes': 'Norte do PR (clima mais quente) permite Jan-Fev.',
            'source': 'document-2.pdf pág 3'
        },
        
        # ========================================
        # CENTRO-OESTE (15% da produção, irrigação obrigatória)
        # ========================================
        'GO': {
            'ideal': [3, 4, 5, 6, 7, 8],      # Mar-Ago ✅ CORRIGIDO (era 3-6)
            'risk': [11, 12, 1, 2],            # Nov-Fev (chuvas concentradas)
            'notes': (
                'Cristalina/Morrinhos: plantio Mar-Jun mais seguro. '
                'Jul-Ago: baixa umidade + insolação alta = ideal. '
                'Irrigação essencial (chuvas irregulares).'
            ),
            'source': 'document-2.pdf pág 3, Tabela 1 (corrigido)'
        },
        
        'MT': {
            'ideal': [3, 4, 5, 6, 7],
            'risk': [11, 12, 1, 2],
            'notes': (
                'Sudoeste de MT: baixa umidade favorece. '
                'Irrigação artificial obrigatória.'
            ),
            'source': 'document-2.pdf pág 3'
        },
        
        'MS': {
            'ideal': [3, 4, 5, 6],
            'risk': [11, 12, 1, 2],
            'notes': 'Manejo similar a GO. Evitar excesso hídrico.',
            'source': 'document-2.pdf pág 3'
        },
        
        'DF': {
            'ideal': [3, 4, 5, 6, 7],
            'risk': [11, 12, 1, 2],
            'notes': 'Altitude favorável (1000-1200m). Irrigação obrigatória.',
            'source': 'document-2.pdf pág 3'
        },
        
        # ========================================
        # NORDESTE (7% da produção, polos irrigados)
        # ========================================
        'BA': {
            'ideal': [3, 4, 5, 6, 7, 8],      # Mar-Ago ✅ CORRIGIDO (era 5-8)
            'risk': [1, 2, 12],
            'notes': (
                'Irecê/Petrolina: polos irrigados produzem o ano todo. '
                'Sertão não irrigado: apenas Mar-Abr (pós-chuvas). '
                'BA é maior produtor do Nordeste (2024).'
            ),
            'source': 'document-2.pdf pág 4, Tabela 1 (corrigido)'
        },
        
        'PE': {
            'ideal': [3, 4, 5, 6],
            'risk': [1, 2, 12],
            'notes': (
                'Serra Talhada/Pesqueira: irrigação obrigatória. '
                'Agreste: depende de chuvas (Mar-Abr).'
            ),
            'source': 'document-2.pdf pág 4'
        },
        
        'CE': {
            'ideal': [3, 4, 5, 6],
            'risk': [1, 2, 12],
            'notes': (
                'Ibiapaba: clima ideal (20-24°C dia, 14°C noite). '
                'Ciclo 40 dias mais curto que média nacional. '
                'CE ultrapassou BA como maior produtor NE (2024).'
            ),
            'source': 'document-2.pdf pág 4, document.pdf pág 6'
        },
        
        # ========================================
        # NORTE (1% da produção, alta pressão fitossanitária)
        # ========================================
        'AM': {
            'ideal': [3, 4, 5, 6, 7, 8, 9, 10],  # Mar-Out (menos chuva relativa)
            'risk': [11, 12, 1, 2],               # Chuvas torrenciais
            'notes': (
                'Cultivo protegido (estufas) obrigatório. '
                'Alta umidade (>80%) favorece doenças fúngicas. '
                'Produção local limitada.'
            ),
            'source': 'document-2.pdf pág 4, document.pdf pág 7'
        },
        
        'PA': {
            'ideal': [3, 4, 5, 6, 7, 8, 9, 10],
            'risk': [11, 12, 1, 2],
            'notes': 'Similar AM. Consumo local predominante.',
            'source': 'document-2.pdf pág 4'
        },
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
