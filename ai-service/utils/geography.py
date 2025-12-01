# utils/geography.py
"""
Utilitários geográficos e cálculos de distância.
"""

import math
from typing import Tuple
from config.constants import STATE_COORDS


def calculate_distance(state_a: str, state_b: str) -> float:
    """
    Calcula distância rodoviária entre estados usando Haversine + sinuosidade.
    
    Args:
        state_a: Código UF origem (ex: 'SP')
        state_b: Código UF destino (ex: 'RJ')
    
    Returns:
        Distância em km (com fator de sinuosidade 1.35)
    """
    # Mesma localidade
    if state_a == state_b:
        return 50.0  # Distância interna estimada
    
    # Busca coordenadas
    coord_a = STATE_COORDS.get(state_a, (-15.0, -47.0))  # Fallback Brasil central
    coord_b = STATE_COORDS.get(state_b, (-15.0, -47.0))
    
    # Fórmula de Haversine
    R = 6371  # Raio da Terra em km
    
    lat1, lon1 = coord_a
    lat2, lon2 = coord_b
    
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * 
         math.cos(math.radians(lat2)) * 
         math.sin(dlon / 2) ** 2)
    
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    distance_km = R * c
    
    # Fator de sinuosidade (rodovias não são retas)
    # Baseado em estudos DNIT: média 1.35 para BRs
    return distance_km * 1.35


def validate_coordinates(lat: float, lng: float) -> bool:
    """
    Valida se coordenadas estão dentro dos limites terrestres.
    
    Args:
        lat: Latitude (-90 a +90)
        lng: Longitude (-180 a +180)
    
    Returns:
        True se válidas
    """
    try:
        lat_f = float(lat)
        lng_f = float(lng)
        return -90 <= lat_f <= 90 and -180 <= lng_f <= 180
    except (TypeError, ValueError):
        return False


def get_state_coordinates(state_code: str) -> Tuple[float, float]:
    """
    Retorna coordenadas da capital do estado.
    
    Args:
        state_code: Código UF (ex: 'SP')
    
    Returns:
        Tupla (latitude, longitude)
    """
    return STATE_COORDS.get(state_code.upper(), (-15.78, -47.93))  # Default: Brasília

def calculate_distance_coords(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calcula distância entre duas coordenadas (Haversine + Sinuosidade).
    """
    try:
        R = 6371  # Raio da Terra em km
        
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        
        a = (math.sin(dlat / 2) ** 2 +
             math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2)
        
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        
        # Fator 1.35 de sinuosidade (estradas não são retas)
        return R * c * 1.35
    except Exception:
        return 0.0