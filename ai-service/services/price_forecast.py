# ai-service/services/price_forecast.py
"""
Serviço de previsão de preços usando Prophet (Facebook).
Substitui regressão polinomial por séries temporais com sazonalidade.
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from functools import lru_cache
from prophet import Prophet
from sqlalchemy import text
import logging
from typing import Dict, Optional, List

from utils.database import get_engine

logger = logging.getLogger(__name__)


class PriceForecastService:
    """
    Serviço de previsão de preços usando Prophet.
    
    Prophet é ideal para séries temporais com:
    - Sazonalidade múltipla (diária, semanal, mensal, anual)
    - Regressores externos (chuva, dólar, etc.)
    - Intervalos de confiança
    """
    
    def __init__(self):
        self.engine = get_engine()
        logger.info("✅ PriceForecastService iniciado (Prophet)")
    
    def _load_historical_data(self, product: str, region: str = None, days_back: int = 180) -> pd.DataFrame:
        """
        Carrega dados históricos de preços do banco.
        
        Args:
            product: Nome do produto (ex: 'Tomate')
            region: Código UF (ex: 'SP') ou None para todos
            days_back: Quantos dias de histórico buscar
        
        Returns:
            DataFrame com colunas: ds (datetime), y (preço), rainfall_7d, usd_brl
        """
        try:
            # Query base
            query = text("""
                SELECT 
                    price_date as ds,
                    price_avg as y
                FROM "CeasaPrice"
                WHERE product_name ILIKE :prod
                  AND price_date >= :min_date
            """)
            
            params = {
                "prod": f"%{product}%",
                "min_date": datetime.now() - timedelta(days=days_back)
            }
            
            # Adiciona filtro de região se fornecido
            if region:
                query = text("""
                    SELECT 
                        price_date as ds,
                        price_avg as y
                    FROM "CeasaPrice"
                    WHERE product_name ILIKE :prod
                      AND ceasa_region = :region
                      AND price_date >= :min_date
                    ORDER BY price_date ASC
                """)
                params["region"] = region.upper()
            
            with self.engine.connect() as conn:
                df = pd.read_sql(query, conn, params=params)
            
            if df.empty or len(df) < 30:
                logger.warning(f"⚠️ Poucos dados para {product}/{region}: {len(df)} registros")
                return pd.DataFrame()
            
            # Normaliza datas e preços
            df['ds'] = pd.to_datetime(df['ds'])
            df = df.sort_values('ds')
            
            # Normaliza preços (caixa → kg) se necessário
            prod_key = product.strip().capitalize()
            if prod_key == 'Tomate':
                df['y'] = df['y'].apply(lambda x: x / 20.0 if x > 15.0 else x)
            elif prod_key in ['Soja', 'Milho']:
                df['y'] = df['y'].apply(lambda x: x / 60.0 if x > 10.0 else x)
            
            # Remove outliers (preços > 3x desvio padrão)
            mean_price = df['y'].mean()
            std_price = df['y'].std()
            df = df[df['y'] <= mean_price + 3 * std_price]
            df = df[df['y'] >= mean_price - 3 * std_price]
            
            logger.info(f"✅ Dados carregados: {len(df)} registros para {product}/{region}")
            return df[['ds', 'y']]
        
        except Exception as e:
            logger.error(f"❌ Erro ao carregar dados históricos: {e}")
            return pd.DataFrame()
    
    @lru_cache(maxsize=8)
    def _train_prophet_model(self, product: str, region: str = None) -> Optional[Prophet]:
        """
        Treina modelo Prophet com dados históricos.
        
        Usa cache (LRU) para evitar retreinar a cada request.
        Cache invalida após 8 modelos diferentes.
        
        Args:
            product: Nome do produto
            region: Código UF ou None
        
        Returns:
            Modelo Prophet treinado ou None se falhar
        """
        try:
            df = self._load_historical_data(product, region)
            
            if df.empty or len(df) < 30:
                logger.warning(f"⚠️ Dados insuficientes para treinar Prophet: {len(df)} registros")
                return None
            
            # Configura Prophet
            # Tenta inicializar com tratamento de erro do stan_backend
            try:
                model = Prophet(
                    yearly_seasonality=True,   # Sazonalidade anual (ex: preços altos no inverno)
                    weekly_seasonality=True,   # Sazonalidade semanal (ex: preços altos na sexta)
                    daily_seasonality=False,   # Desabilita diária (não faz sentido para preços agrícolas)
                    seasonality_mode='multiplicative',  # Sazonalidade multiplicativa (ex: +20% no inverno)
                    changepoint_prior_scale=0.05,  # Menos mudanças bruscas (mais suave)
                    interval_width=0.80  # Intervalo de confiança de 80%
                )
            except AttributeError as e:
                if 'stan_backend' in str(e):
                    logger.error("❌ Erro conhecido do Prophet: stan_backend não inicializado. Tente reinstalar: pip install --upgrade prophet cmdstanpy")
                    raise Exception("Prophet não configurado corretamente. Execute: pip install --upgrade prophet cmdstanpy")
                raise
            
            # Treina o modelo
            model.fit(df)
            
            logger.info(f"✅ Modelo Prophet treinado para {product}/{region}")
            return model
        
        except Exception as e:
            error_msg = str(e)
            if 'stan_backend' in error_msg:
                logger.error(
                    f"❌ Erro do Prophet (stan_backend): {e}\n"
                    "💡 Solução: Execute no terminal:\n"
                    "   pip install --upgrade prophet cmdstanpy\n"
                    "   python -c 'from cmdstanpy import install_cmdstan; install_cmdstan()'"
                )
            else:
                logger.error(f"❌ Erro ao treinar Prophet: {e}", exc_info=True)
            return None
    
    def _forecast_fallback(self, product: str, region: str = None, days_ahead: int = 30) -> Dict:
        """
        Fallback: usa regressão polinomial quando Prophet falha.
        """
        try:
            from services.market_intelligence import market_intelligence
            
            df = self._load_historical_data(product, region, days_back=180)
            if df.empty or len(df) < 5:
                return {
                    "status": "error",
                    "message": "Dados insuficientes",
                    "forecast": []
                }
            
            # Usa o método existente de market_intelligence
            from datetime import datetime
            today = datetime.now()
            forecast_list = []
            
            for i in range(1, days_ahead + 1):
                future_date = today + timedelta(days=i)
                month = future_date.month
                
                # Usa get_predicted_market_price que já funciona
                price = market_intelligence.get_predicted_market_price(
                    product, region or 'SP', month
                )
                
                # Simula intervalo de confiança (±10%)
                forecast_list.append({
                    "date": future_date.strftime('%Y-%m-%d'),
                    "price": round(price, 2),
                    "lower": round(price * 0.90, 2),
                    "upper": round(price * 1.10, 2)
                })
            
            return {
                "status": "success",
                "forecast": forecast_list,
                "model_type": "polynomial_regression_fallback",
                "model_metrics": {
                    "data_points": len(df),
                    "forecast_days": days_ahead
                }
            }
        except Exception as e:
            logger.error(f"❌ Erro no fallback: {e}")
            return {
                "status": "error",
                "message": str(e),
                "forecast": []
            }
    
    def forecast(self, product: str, region: str = None, days_ahead: int = 30) -> Dict:
        """
        Gera previsão de preços para os próximos N dias.
        
        Tenta usar Prophet primeiro, se falhar usa regressão polinomial como fallback.
        
        Args:
            product: Nome do produto
            region: Código UF ou None
            days_ahead: Quantos dias à frente prever (padrão: 30)
        
        Returns:
            Dict com:
            - forecast: Lista de previsões [{date, price, lower, upper}, ...]
            - model_metrics: {mae, rmse} (se dados de validação disponíveis)
            - status: 'success' ou 'error'
        """
        try:
            # Treina ou recupera modelo do cache
            try:
                model = self._train_prophet_model(product, region)
            except (AttributeError, Exception) as prophet_error:
                # Se Prophet falhar na inicialização, usa fallback
                if 'stan_backend' in str(prophet_error) or 'Prophet' in str(type(prophet_error).__name__):
                    logger.warning(f"⚠️ Prophet falhou na inicialização: {prophet_error}. Usando fallback.")
                    df = self._load_historical_data(product, region)
                    if df.empty or len(df) < 5:
                        return {
                            "status": "error",
                            "message": f"Dados insuficientes. Prophet também falhou: {str(prophet_error)}",
                            "forecast": [],
                            "suggestion": "Execute: python scripts/fix_prophet.sh ou use dados reais"
                        }
                    return self._forecast_fallback(product, region, days_ahead)
                raise
            
            if model is None:
                # Tenta fallback se dados insuficientes
                df = self._load_historical_data(product, region)
                if df.empty or len(df) < 5:
                    return {
                        "status": "error",
                        "message": f"Dados insuficientes para previsão. Necessário mínimo de 30 registros históricos para {product}/{region or 'todas as regiões'}. Execute o ETL ou o script backfill_history.py para popular dados.",
                        "forecast": [],
                        "suggestion": "Execute: python scripts/backfill_history.py --product Tomate --days 180"
                    }
                else:
                    # Tem dados mas Prophet falhou, usa fallback
                    logger.warning("⚠️ Prophet falhou, usando regressão polinomial como fallback")
                    return self._forecast_fallback(product, region, days_ahead)
            
            # Cria dataframe futuro
            future = model.make_future_dataframe(periods=days_ahead)
            
            # Gera previsão
            forecast_df = model.predict(future)
            
            # Filtra apenas os dias futuros (últimos N dias)
            forecast_df = forecast_df.tail(days_ahead)
            
            # Formata resposta
            forecast_list = []
            for _, row in forecast_df.iterrows():
                forecast_list.append({
                    "date": row['ds'].strftime('%Y-%m-%d'),
                    "price": round(float(row['yhat']), 2),
                    "lower": round(float(row['yhat_lower']), 2),
                    "upper": round(float(row['yhat_upper']), 2)
                })
            
            return {
                "status": "success",
                "forecast": forecast_list,
                "model_metrics": {
                    "data_points": len(self._load_historical_data(product, region)),
                    "forecast_days": days_ahead
                }
            }
        
        except Exception as e:
            logger.error(f"❌ Erro ao gerar previsão Prophet: {e}", exc_info=True)
            return {
                "status": "error",
                "message": str(e),
                "forecast": []
            }


# Instância global (Singleton)
price_forecast_service = PriceForecastService()