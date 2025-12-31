# ai-service/services/distance_matrix.py
"""
Serviço para calcular distâncias reais de rota usando Google Maps Distance Matrix API.
Substitui o cálculo Haversine por distâncias reais de rota, melhorando a precisão
do cálculo de frete e combustível.
"""

import os
import logging
import requests
from typing import Dict, Optional, Tuple
import time
from collections import deque
import random
import math

logger = logging.getLogger(__name__)


class RateLimiter:
    """Limita requisições a N por segundo"""
    def __init__(self, max_per_second=10):
        self.max_per_second = max_per_second
        self.requests = deque()
    
    def wait_if_needed(self):
        now = time.time()
        # Remove requisições antigas (> 1 segundo)
        while self.requests and self.requests[0] < now - 1:
            self.requests.popleft()
        
        # Se exceder limite, espera
        if len(self.requests) >= self.max_per_second:
            sleep_time = 1 - (now - self.requests[0])
            if sleep_time > 0:
                time.sleep(sleep_time)
        
        self.requests.append(time.time())


def retry_with_backoff(func, max_retries=3):
    """Retry com backoff exponencial"""
    for attempt in range(max_retries):
        try:
            return func()
        except Exception as e:
            if attempt == max_retries - 1:
                raise
            # Backoff exponencial: 2^attempt segundos
            wait_time = (2 ** attempt) + random.uniform(0, 1)
            time.sleep(wait_time)
            logger.warning(f"⚠️ Retry {attempt + 1}/{max_retries} após {wait_time:.2f}s: {e}")


class DistanceMatrixService:
    """
    Serviço para calcular distâncias reais de rota usando Google Maps Distance Matrix API.
    
    Características:
    - Cache em memória (TTL: 30 dias para rotas principais)
    - Rate limiting (máximo 10 requisições/segundo)
    - Retry com backoff exponencial
    - Fallback para Haversine se API falhar ou não estiver configurada
    """
    
    def __init__(self):
        self.api_key = os.getenv('GOOGLE_MAPS_API_KEY')
        self.base_url = 'https://maps.googleapis.com/maps/api/distancematrix/json'
        self.cache = {}  # Cache simples em memória
        # TTL: 30 dias para rotas principais (rotas não mudam)
        self.cache_ttl = 30 * 24 * 60 * 60  # 30 dias
        self.rate_limiter = RateLimiter(max_per_second=10)  # Limite seguro
        
    def get_distance_matrix(
        self,
        origin: Tuple[float, float],  # (lat, lng)
        destination: Tuple[float, float],  # (lat, lng)
        mode: str = 'driving',
        avoid: Optional[str] = None,  # 'tolls', 'highways', 'ferries', 'indoor'
        traffic_model: Optional[str] = None  # 'best_guess', 'pessimistic', 'optimistic'
    ) -> Dict:
        """
        Calcula distância e tempo de viagem entre dois pontos usando Google Maps Distance Matrix API.
        
        Args:
            origin: Tupla (latitude, longitude) do ponto de origem
            destination: Tupla (latitude, longitude) do ponto de destino
            mode: Modo de transporte ('driving', 'walking', 'bicycling', 'transit')
            avoid: Evitar ('tolls', 'highways', 'ferries', 'indoor')
            traffic_model: Modelo de tráfego ('best_guess', 'pessimistic', 'optimistic')
        
        Returns:
            {
                'distance_km': float,
                'duration_seconds': int,
                'duration_text': str,
                'status': str,
                'cached': bool,
                'source': str  # 'GOOGLE_MAPS' ou 'HAVERSINE_FALLBACK'
            }
        """
        # Verifica cache
        cache_key = f"{origin[0]:.6f},{origin[1]:.6f}_{destination[0]:.6f},{destination[1]:.6f}_{mode}"
        if cache_key in self.cache:
            cached_data = self.cache[cache_key]
            if time.time() - cached_data['timestamp'] < self.cache_ttl:
                logger.debug(f"💾 Cache HIT: {cache_key}")
                return {**cached_data['data'], 'cached': True}
        
        if not self.api_key:
            logger.warning("⚠️ GOOGLE_MAPS_API_KEY não configurada, usando Haversine")
            return self._haversine_fallback(origin, destination)
        
        # Rate limiting
        self.rate_limiter.wait_if_needed()
        
        try:
            params = {
                'origins': f"{origin[0]},{origin[1]}",
                'destinations': f"{destination[0]},{destination[1]}",
                'mode': mode,
                'key': self.api_key,
                'language': 'pt-BR',
                'units': 'metric'
            }
            
            if avoid:
                params['avoid'] = avoid
            if traffic_model:
                params['traffic_model'] = traffic_model
                params['departure_time'] = 'now'  # Requerido para traffic_model
            
            # Retry com backoff exponencial
            response = retry_with_backoff(
                lambda: requests.get(self.base_url, params=params, timeout=10),
                max_retries=3
            )
            response.raise_for_status()
            data = response.json()
            
            # Tratamento de erros da API
            if data['status'] == 'OVER_QUERY_LIMIT':
                logger.error("❌ Quota diária excedida, usando fallback Haversine")
                return self._haversine_fallback(origin, destination)
            elif data['status'] != 'OK':
                logger.error(f"❌ Distance Matrix API error: {data['status']}")
                return self._haversine_fallback(origin, destination)
            
            element = data['rows'][0]['elements'][0]
            
            if element['status'] != 'OK':
                logger.warning(f"⚠️ Rota não encontrada: {element['status']}, usando Haversine")
                return self._haversine_fallback(origin, destination)
            
            result = {
                'distance_km': element['distance']['value'] / 1000,  # metros para km
                'duration_seconds': element['duration']['value'],
                'duration_text': element['duration']['text'],
                'status': 'OK',
                'cached': False,
                'source': 'GOOGLE_MAPS'
            }
            
            # Salva no cache
            self.cache[cache_key] = {
                'data': result,
                'timestamp': time.time()
            }
            
            logger.debug(f"✅ Distance Matrix: {result['distance_km']:.2f} km, {result['duration_text']}")
            return result
            
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Erro na requisição Distance Matrix API: {e}")
            return self._haversine_fallback(origin, destination)
        except Exception as e:
            logger.error(f"❌ Erro inesperado no Distance Matrix: {e}")
            return self._haversine_fallback(origin, destination)
    
    def _haversine_fallback(self, origin: Tuple[float, float], destination: Tuple[float, float]) -> Dict:
        """
        Fallback para Haversine se API falhar ou não estiver configurada.
        Usa fator de sinuosidade 1.35 (baseado em estudos DNIT).
        """
        R = 6371  # Raio da Terra em km
        
        lat1, lon1 = origin
        lat2, lon2 = destination
        
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        
        a = (math.sin(dlat / 2) ** 2 +
             math.cos(math.radians(lat1)) * 
             math.cos(math.radians(lat2)) * 
             math.sin(dlon / 2) ** 2)
        
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        
        distance_km = R * c * 1.35  # Fator de sinuosidade
        
        # Estimativa de tempo (média de 60 km/h)
        duration_seconds = int((distance_km / 60) * 3600)
        hours = duration_seconds // 3600
        minutes = (duration_seconds % 3600) // 60
        
        return {
            'distance_km': distance_km,
            'duration_seconds': duration_seconds,
            'duration_text': f"{hours} horas {minutes} minutos" if hours > 0 else f"{minutes} minutos",
            'status': 'OK',
            'cached': False,
            'source': 'HAVERSINE_FALLBACK'
        }
    
    def get_distance_km(
        self,
        origin: Tuple[float, float],
        destination: Tuple[float, float],
        mode: str = 'driving'
    ) -> float:
        """
        Método simplificado que retorna apenas a distância em km.
        Útil para integração com código existente.
        """
        result = self.get_distance_matrix(origin, destination, mode)
        return result['distance_km']


# Instância global
distance_matrix_service = DistanceMatrixService()


