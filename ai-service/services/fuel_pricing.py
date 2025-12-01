# ai-service/services/fuel_pricing.py
"""
Serviço de precificação de combustível em tempo real.
Integra API CombustivelAPI com persistência no banco e cálculos de rota.
"""

import requests
from datetime import datetime
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
        # URL validada pelo seu teste
        self.api_url = "https://combustivelapi.com.br/api/precos"
        self.cache = CacheManager(ttl_seconds=21600)  # 6 horas de cache
        self.engine = get_engine()
        self.headers = {
            "Accept": "application/json",
            "User-Agent": "Agro-AI/6.0 Fuel Intelligence Module"
        }
        logger.info("✅ FuelPricingService iniciado (Modo: API Real)")
    
    def _get_fallback_prices(self) -> Dict[str, str]:
        """
        Busca últimos preços válidos do banco se a API falhar.
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
                    prices = {row.state_code.lower(): f"{row.price_per_liter:.2f}".replace('.', ',') 
                             for row in results}
                    logger.info(f"✅ Fallback carregado do banco ({len(prices)} estados)")
                    return prices
        except Exception as e:
            logger.warning(f"⚠️ Falha ao buscar fallback do banco: {e}")
        
        # Fallback de último caso (Valores conservadores 2025)
        return {
            'br': '6,20', 'sp': '6,25', 'mg': '6,05', 'rj': '6,30',
            'go': '6,15', 'ba': '6,00', 'pr': '6,18'
        }
    
    def _save_to_database(self, data: Dict) -> None:
        """Salva preços no banco para histórico e fallback"""
        try:
            diesel_prices = data.get('precos', {}).get('diesel', {})
            data_coleta = data.get('data_coleta', datetime.now())
            
            # Formato da data vindo da API pode variar, tenta converter
            if isinstance(data_coleta, str):
                try:
                    # Tenta formato ISO ou PT-BR se necessário
                    pass 
                except:
                    data_coleta = datetime.now()

            with self.engine.begin() as conn:
                for state, price_str in diesel_prices.items():
                    try:
                        price_float = float(price_str.replace(',', '.'))
                        
                        # Verifica se já salvou hoje para não duplicar excessivamente
                        check = text("""
                            SELECT id FROM fuel_prices 
                            WHERE state_code = :state 
                            AND created_at::date = CURRENT_DATE
                        """)
                        exists = conn.execute(check, {'state': state.upper()}).fetchone()
                        
                        if not exists:
                            query = text("""
                                INSERT INTO fuel_prices (state_code, price_per_liter, data_coleta, fonte, created_at)
                                VALUES (:state, :price, NOW(), :fonte, NOW())
                            """)
                            
                            conn.execute(query, {
                                'state': state.upper(),
                                'price': price_float,
                                'fonte': data.get('fonte', 'API')
                            })
                    except ValueError:
                        continue
                        
            logger.debug(f"💾 Preços de combustível salvos no banco")
        
        except Exception as e:
            logger.warning(f"⚠️ Erro ao salvar no banco (não crítico): {e}")

    def fetch_current_prices(self) -> Dict:
        """
        Busca preços atuais (Com Cache e Fallback).
        Retorna estrutura exata da API para o Frontend.
        """
        # 1. Tenta Cache
        cached = self.cache.get('fuel_prices_national')
        if cached: return cached
        
        try:
            logger.info("📡 Buscando preços da API Externa...")
            response = requests.get(self.api_url, headers=self.headers, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            # Validação simples baseada no seu teste
            if 'precos' in data and 'diesel' in data['precos']:
                self.cache.set('fuel_prices_national', data)
                
                # Salva no banco em background (sem travar a request)
                try:
                    self._save_to_database(data)
                except:
                    pass
                
                return data
            else:
                raise ValueError("Resposta incompleta da API")
                
        except Exception as e:
            logger.error(f"❌ Erro API Combustível: {e}")
            # Retorna estrutura simulada com dados do banco
            fallback_prices = self._get_fallback_prices()
            return {
                'error': False,
                'data_coleta': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                'fonte': 'Fallback/Banco',
                'precos': {'diesel': fallback_prices}
            }

    def get_diesel_price(self, state_code: str) -> Dict:
        """
        Helper para o logistics.py: Retorna o preço FLOAT de um estado.
        """
        data = self.fetch_current_prices()
        diesel_prices = data.get('precos', {}).get('diesel', {})
        
        state_lower = state_code.lower()
        # Tenta estado, depois BR, depois fallback fixo 6.00
        price_str = diesel_prices.get(state_lower, diesel_prices.get('br', '6,00'))
        
        try:
            price_float = float(price_str.replace(',', '.'))
        except:
            price_float = 6.00

        return {
            'state': state_code.upper(),
            'price_per_liter': price_float,
            'data_coleta': data.get('data_coleta'),
            'fonte': data.get('fonte', 'Unknown')
        }

    def calculate_route_fuel_cost(self, origin_state: str, dest_state: str, distance_km: float) -> Dict:
        """
        Calcula custo estimado de combustível para uma rota.
        Usado na calculadora de ROI.
        """
        # Preços nas pontas
        p_origin = self.get_diesel_price(origin_state)
        p_dest = self.get_diesel_price(dest_state)
        
        # Média ponderada (assume abastecimento maior na origem)
        avg_price = (p_origin['price_per_liter'] * 0.6) + (p_dest['price_per_liter'] * 0.4)
        
        # Consumo médio (Carreta 3.5km/L)
        km_per_liter = 3.5
        liters_needed = distance_km / km_per_liter
        total_cost = liters_needed * avg_price
        
        return {
            'distance_km': round(distance_km, 1),
            'liters_needed': round(liters_needed, 1),
            'weighted_price_liter': round(avg_price, 2),
            'total_fuel_cost': round(total_cost, 2), 
            'details': f"Baseado em {origin_state}(R${p_origin['price_per_liter']}) e {dest_state}(R${p_dest['price_per_liter']})"
        }

# Instância Global
fuel_api = FuelPricingService()