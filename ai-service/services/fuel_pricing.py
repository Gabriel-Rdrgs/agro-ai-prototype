# services/fuel_pricing.py
"""
Serviço de precificação de combustível em tempo real.
Integra API Petrobras com fallbacks robustos.

Correções aplicadas:
- Fallback dinâmico do banco (não hardcode)
- Validação de resposta API
- Logs estruturados
"""

import requests
from datetime import datetime, timedelta
from typing import Dict, Optional
import logging
from functools import lru_cache

from utils.cache import CacheManager
from utils.database import get_engine
from sqlalchemy import text

logger = logging.getLogger(__name__)


class FuelPricingService:
    """Cliente para API de preços de combustível"""
    
    def __init__(self):
        self.api_url = "https://combustivelapi.com.br/api/precos"
        self.cache = CacheManager(ttl_seconds=21600)  # 6 horas
        self.engine = get_engine()
        logger.info("✅ FuelPricingService iniciado")
    
    def _get_fallback_prices(self) -> Dict[str, str]:
        """
        Busca últimos preços válidos do banco como fallback.
        Mais robusto que valores hardcoded.
        """
        try:
            with self.engine.connect() as conn:
                query = text("""
                    SELECT state_code, price_per_liter
                    FROM fuel_prices
                    WHERE created_at > NOW() - INTERVAL '7 days'
                    ORDER BY created_at DESC
                    LIMIT 30
                """)
                results = conn.execute(query).fetchall()
                
                if results:
                    prices = {row.state_code.lower(): f"{row.price_per_liter:.2f}" 
                             for row in results}
                    logger.info(f"✅ Fallback carregado do banco ({len(prices)} estados)")
                    return prices
        except Exception as e:
            logger.warning(f"⚠️ Falha ao buscar fallback do banco: {e}")
        
        # Fallback final (valores conservadores 2025)
        logger.warning("⚠️ Usando fallback hardcoded (última opção)")
        return {
            'br': '6.20', 'sp': '6.25', 'mg': '6.05', 'rj': '6.30',
            'go': '6.15', 'ba': '6.00', 'rs': '6.28', 'pr': '6.18',
            'sc': '6.22', 'mt': '6.08', 'ms': '6.10', 'ce': '5.95',
            'pe': '6.00', 'es': '6.12', 'df': '6.18'
        }
    
    def fetch_current_prices(self) -> Dict:
        """
        Busca preços atuais de todos os estados.
        
        Returns:
            dict com estrutura:
            {
                'error': False,
                'data_coleta': '2025-11-29 17:00:00',
                'fonte': 'Petrobras',
                'precos': {'diesel': {'sp': '6.25', 'mg': '6.05', ...}}
            }
        """
        # Verifica cache
        cached = self.cache.get('fuel_prices_national')
        if cached:
            return cached
        
        try:
            logger.info("📡 Buscando preços da API Petrobras...")
            
            headers = {
                'Accept': 'application/json',
                'User-Agent': 'Agro-AI/6.0 (Fuel Intelligence Module)'
            }
            
            response = requests.get(self.api_url, headers=headers, timeout=8)
            response.raise_for_status()
            
            data = response.json()
            
            # Validação da resposta
            if data.get('error') is False and 'precos' in data:
                # Valida estrutura diesel
                diesel = data['precos'].get('diesel', {})
                if len(diesel) < 5:  # Mínimo de 5 estados
                    raise ValueError("Resposta incompleta da API")
                
                # Armazena no cache
                self.cache.set('fuel_prices_national', data)
                
                # Persiste no banco para fallback futuro
                self._save_to_database(data)
                
                logger.info(f"✅ Preços atualizados: {data.get('data_coleta', 'N/A')}")
                return data
            else:
                raise ValueError(f"API retornou erro: {data.get('message', 'Unknown')}")
        
        except Exception as e:
            logger.error(f"❌ Erro ao buscar preços: {e}")
            
            # Retorna fallback
            fallback_prices = self._get_fallback_prices()
            return {
                'error': False,
                'data_coleta': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                'fonte': 'Fallback (Banco/Default)',
                'precos': {'diesel': fallback_prices}
            }
    
    def _save_to_database(self, data: Dict) -> None:
        """Salva preços no banco para fallback futuro"""
        try:
            diesel_prices = data['precos']['diesel']
            data_coleta = data.get('data_coleta', datetime.now())
            
            with self.engine.begin() as conn:
                for state, price_str in diesel_prices.items():
                    price_float = float(price_str.replace(',', '.'))
                    
                    query = text("""
                        INSERT INTO fuel_prices (state_code, price_per_liter, data_coleta, fonte, created_at)
                        VALUES (:state, :price, :data_coleta, :fonte, NOW())
                    """)
                    
                    conn.execute(query, {
                        'state': state.upper(),
                        'price': price_float,
                        'data_coleta': data_coleta,
                        'fonte': data.get('fonte', 'Petrobras')
                    })
            
            logger.debug(f"💾 {len(diesel_prices)} preços salvos no banco")
        
        except Exception as e:
            logger.warning(f"⚠️ Erro ao salvar no banco: {e}")
    
    def get_diesel_price(self, state_code: str) -> Dict:
        """
        Retorna preço do diesel para um estado específico.
        
        Args:
            state_code: Código UF (ex: 'SP', 'MG')
        
        Returns:
            {
                'state': 'SP',
                'price_per_liter': 6.25,
                'data_coleta': '2025-11-29 17:00:00',
                'fonte': 'Petrobras',
                'confidence': 0.98
            }
        """
        data = self.fetch_current_prices()
        
        state_lower = state_code.lower()
        diesel_prices = data.get('precos', {}).get('diesel', {})
        
        # Busca preço do estado ou média BR
        price_str = diesel_prices.get(state_lower, diesel_prices.get('br', '6.20'))
        price_float = float(price_str.replace(',', '.'))
        
        # Confiança baseada na fonte
        confidence = 0.98 if data['fonte'] == 'Petrobras' else 0.85
        
        return {
            'state': state_code.upper(),
            'price_per_liter': round(price_float, 2),
            'data_coleta': data.get('data_coleta'),
            'fonte': data['fonte'],
            'confidence': confidence
        }
    
    def calculate_route_fuel_cost(
        self, 
        origin_state: str, 
        dest_state: str, 
        distance_km: float
    ) -> Dict:
        """
        Calcula custo de combustível para uma rota considerando preços regionais.
        
        Args:
            origin_state: Estado origem (ex: 'GO')
            dest_state: Estado destino (ex: 'SP')
            distance_km: Distância em km
        
        Returns:
            {
                'distance_km': 920.5,
                'fuel_liters': 263.0,
                'weighted_price_liter': 6.18,
                'total_fuel_cost': 1625.34,
                'origin_price': {...},
                'dest_price': {...},
                'data_coleta': '2025-11-29 17:00:00',
                'savings_vs_fixed': 15.20  # Economia vs preço fixo antigo
            }
        """
        # Busca preços
        price_origin = self.get_diesel_price(origin_state)
        price_dest = self.get_diesel_price(dest_state)
        
        # Média ponderada: 70% origem (maioria da rota), 30% destino
        weighted_price = (
            price_origin['price_per_liter'] * 0.7 +
            price_dest['price_per_liter'] * 0.3
        )
        
        # Consumo médio carreta: 3.5 km/L (ANTT 2024)
        km_per_liter = 3.5
        liters_needed = distance_km / km_per_liter
        total_cost = liters_needed * weighted_price
        
        # Comparação com preço fixo antigo (R$ 6,20)
        old_fixed_price = 6.20
        old_cost = liters_needed * old_fixed_price
        savings = old_cost - total_cost
        
        if abs(savings) > 5.0:  # Diferença significativa
            logger.info(
                f"💰 Rota {origin_state}→{dest_state}: "
                f"{'Economia' if savings > 0 else 'Aumento'} de R$ {abs(savings):.2f} "
                f"(Real: R$ {total_cost:.2f} vs Fixo: R$ {old_cost:.2f})"
            )
        
        return {
            'distance_km': round(distance_km, 1),
            'fuel_liters': round(liters_needed, 1),
            'weighted_price_liter': round(weighted_price, 2),
            'total_fuel_cost': round(total_cost, 2),
            'origin_price': price_origin,
            'dest_price': price_dest,
            'data_coleta': price_origin['data_coleta'],
            'savings_vs_fixed': round(savings, 2)
        }


# ========================================
# INSTÂNCIA GLOBAL (Singleton)
# ========================================
fuel_api = FuelPricingService()
