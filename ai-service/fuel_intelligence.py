import requests
from functools import lru_cache
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

class PetrobrasFuelAPI:
    """Cliente para API de preços Petrobras"""
    
    def __init__(self):
        self.base_url = "https://combustivelapi.com.br/api/precos"  
        self.cache_ttl = timedelta(hours=6)
        self._cached_data = None
        self._cache_time = None
    
    def fetch_current_prices(self):
        """Busca preços de todos os estados"""
        # Verifica cache
        if self._cached_data and self._cache_time:
            if datetime.now() - self._cache_time < self.cache_ttl:
                logger.info("Usando preços em cache")
                return self._cached_data
        
        try:
            logger.info("Buscando preços da Petrobras...")
            headers = {
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
            response = requests.get(self.base_url, headers=headers, timeout=5)

            response.raise_for_status()
            
            data = response.json()
            
            if data.get('error') is False:
                self._cached_data = data
                self._cache_time = datetime.now()
                logger.info(f"Preços atualizados: {data['data_coleta']}")
                return data
            else:
                raise Exception(f"API retornou erro: {data.get('message')}")
                
        except Exception as e:
            logger.error(f"Erro ao buscar preços: {e}")
            
            # Usa valores de segurança
            return {
                'error': False,
                'data_coleta': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                'fonte': 'Fallback',
                'precos': {
                    'diesel': {
                        'br': '6.06', 'sp': '6.12', 'mg': '5.95', 
                        'go': '6.06', 'ba': '5.93', 'rs': '6.14'
                    }
                }
            }
    
    def get_diesel_price(self, state_code):
        """Retorna preço do diesel para um estado"""
        data = self.fetch_current_prices()
        
        state_lower = state_code.lower()
        diesel_prices = data.get('precos', {}).get('diesel', {})
        
        price_str = diesel_prices.get(state_lower, diesel_prices.get('br', '6.06'))
        price_float = float(price_str.replace(',', '.'))
        
        return {
            'state': state_code.upper(),
            'price_per_liter': price_float,
            'data_coleta': data.get('data_coleta'),
            'fonte': 'Petrobras',
            'confidence': 0.98
        }
    
    def calculate_route_fuel_cost(self, origin_state, dest_state, distance_km):
        """Calcula custo de combustível para uma rota"""
        price_origin = self.get_diesel_price(origin_state)
        price_dest = self.get_diesel_price(dest_state)
        
        # Média ponderada: 70% origem, 30% destino
        weighted_price = (price_origin['price_per_liter'] * 0.7 + 
                         price_dest['price_per_liter'] * 0.3)
        
        km_per_liter = 3.5  # Consumo médio carreta
        liters_needed = distance_km / km_per_liter
        total_cost = liters_needed * weighted_price
        
        old_fixed_price = 6.20  # Preço fixo antigo
        old_cost = liters_needed * old_fixed_price
        economy = old_cost - total_cost
        
        logger.info(f"💰 Rota {origin_state}->{dest_state}: "
                   f"Economia de R$ {economy:.2f} vs preço fixo "
                   f"(Real: R$ {total_cost:.2f} | Fixo: R$ {old_cost:.2f})")
        
        return {
            'distance_km': round(distance_km, 1),
            'fuel_liters': round(liters_needed, 1),
            'weighted_price_liter': round(weighted_price, 2),
            'total_fuel_cost': round(total_cost, 2),
            'origin_price': price_origin,
            'dest_price': price_dest,
            'data_coleta': price_origin['data_coleta']
        }

# Instância global
fuel_api = PetrobrasFuelAPI()
