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
        # Limpa cache ao iniciar (evita valores antigos de execuções anteriores)
        self._train_prophet_model.cache_clear()
        logger.info("✅ PriceForecastService iniciado (Prophet) - Cache limpo")
    
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
            
            # Configura Prophet com parâmetros mais conservadores
            # Para evitar extrapolações extremas com poucos dados
            try:
                model = Prophet(
                    yearly_seasonality=True,   # Sazonalidade anual (ex: preços altos no inverno)
                    weekly_seasonality=True,   # Sazonalidade semanal (ex: preços altos na sexta)
                    daily_seasonality=False,   # Desabilita diária (não faz sentido para preços agrícolas)
                    seasonality_mode='multiplicative',  # Sazonalidade multiplicativa (ex: +20% no inverno)
                    changepoint_prior_scale=0.01,  # Muito mais conservador (0.01 vs 0.05) - menos mudanças bruscas
                    changepoint_range=0.8,  # Limita onde podem ocorrer mudanças (80% dos dados)
                    growth='linear',  # Crescimento linear (mais estável que logístico)
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
    
    def _forecast_fallback(self, product: str, region: str = None, days_ahead: int = 30, df: pd.DataFrame = None) -> Dict:
        """
        Fallback: usa regressão polinomial quando Prophet falha.
        
        Args:
            product: Nome do produto
            region: Código UF ou None
            days_ahead: Quantos dias à frente prever
            df: DataFrame opcional (se já carregado, evita recarregar)
        """
        try:
            from services.market_intelligence import market_intelligence
            
            # Usa DataFrame fornecido ou carrega novo
            if df is None or df.empty:
                df = self._load_historical_data(product, region)
            
            if df.empty or len(df) < 5:
                return {
                    "status": "error",
                    "message": "Dados insuficientes para fallback",
                    "forecast": [],
                    "forecast_model": "none",
                    "metrics": {"data_points": 0, "forecast_days": days_ahead}
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
                "forecast_model": "polynomial_regression_fallback",
                "metrics": {
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
            - forecast_model: 'prophet' ou 'polynomial_regression_fallback'
            - metrics: {data_points, forecast_days}
            - status: 'success' ou 'error'
        """
        try:
            # Verifica dados antes de tentar Prophet
            logger.info(f"🔍 Iniciando previsão para {product}/{region or 'todas as regiões'} - {days_ahead} dias")
            df_check = self._load_historical_data(product, region)
            logger.info(f"📊 Dados carregados: {len(df_check)} registros")
            
            if df_check.empty or len(df_check) < 30:
                # Dados insuficientes para Prophet, usa fallback direto
                if len(df_check) < 5:
                    return {
                        "status": "error",
                        "message": f"Dados insuficientes para previsão. Necessário mínimo de 30 registros históricos para Prophet, ou 5 para fallback, para {product}/{region or 'todas as regiões'}. Execute o ETL ou o script populate_test_data.py para popular dados.",
                        "forecast": [],
                        "forecast_model": "none",
                        "metrics": {"data_points": len(df_check), "forecast_days": days_ahead},
                        "suggestion": "Execute: python scripts/populate_test_data.py --product Tomate --days 180"
                    }
                logger.info(f"ℹ️ Dados insuficientes para Prophet ({len(df_check)} < 30), usando fallback")
                return self._forecast_fallback(product, region, days_ahead, df_check)
            
            # Tem dados suficientes, tenta Prophet
            logger.info(f"✅ Dados suficientes ({len(df_check)} >= 30), tentando Prophet...")
            try:
                # Limpa cache antes de treinar (força retreinar)
                self._train_prophet_model.cache_clear()
                logger.info(f"🔄 Cache limpo, treinando Prophet para {product}/{region or 'todas'}...")
                model = self._train_prophet_model(product, region)
                logger.info(f"🔮 Modelo Prophet retornado: {type(model).__name__ if model else 'None'}")
            except Exception as prophet_error:
                # Se Prophet falhar na inicialização, usa fallback
                error_str = str(prophet_error)
                error_type = type(prophet_error).__name__
                logger.error(f"❌ Prophet falhou: {error_type}: {error_str}", exc_info=True)
                logger.warning(f"⚠️ Usando fallback devido ao erro do Prophet")
                return self._forecast_fallback(product, region, days_ahead, df_check)
            
            if model is None:
                # Prophet retornou None (dados insuficientes no treino), usa fallback
                logger.warning("⚠️ Prophet retornou None, usando regressão polinomial como fallback")
                return self._forecast_fallback(product, region, days_ahead, df_check)
            
            logger.info("✅ Prophet treinado com sucesso, gerando previsões...")
            
            # Cria dataframe futuro
            future = model.make_future_dataframe(periods=days_ahead)
            
            # Gera previsão
            forecast_df = model.predict(future)
            
            # Filtra apenas os dias futuros (últimos N dias)
            forecast_df = forecast_df.tail(days_ahead)
            
            # Calcula limites razoáveis baseados nos dados históricos
            historical_prices = df_check['y'].values
            price_mean = historical_prices.mean()
            price_std = historical_prices.std()
            price_min_hist = historical_prices.min()
            price_max_hist = historical_prices.max()
            
            # Limites mais realistas: baseados na distribuição dos dados
            # Mínimo: 50% do menor preço histórico (mais conservador)
            # Máximo: 1.5x o maior preço histórico (mais realista)
            min_price = max(0.1, price_min_hist * 0.5)
            max_price = price_max_hist * 1.5
            
            # Formata resposta com validação de preços mais inteligente
            forecast_list = []
            last_valid_price = price_mean  # Usa média como referência inicial
            
            for _, row in forecast_df.iterrows():
                price = float(row['yhat'])
                lower = float(row['yhat_lower'])
                upper = float(row['yhat_upper'])
                
                # Se o preço previsto está muito baixo, usa suavização exponencial
                # em vez de cortar bruscamente - mantém a tendência mas evita quedas extremas
                if price < min_price:
                    # Suavização: 70% do último preço válido + 30% do mínimo permitido
                    # Isso cria uma transição suave em vez de um corte brusco
                    price = last_valid_price * 0.7 + min_price * 0.3
                    # Se ainda estiver muito baixo, usa o mínimo
                    if price < min_price:
                        price = min_price
                
                # Se o preço está muito alto, também suaviza
                if price > max_price:
                    price = last_valid_price * 0.7 + max_price * 0.3
                    if price > max_price:
                        price = max_price
                
                # Atualiza referência para próximo ciclo (com suavização)
                last_valid_price = last_valid_price * 0.8 + price * 0.2
                
                # Ajusta intervalos de confiança proporcionalmente ao preço
                # Mantém a proporção original do Prophet quando possível
                price_range = upper - lower
                if price_range > 0:
                    # Mantém a proporção original, mas ajusta se necessário
                    lower = price - (price_range * 0.4)  # 40% abaixo
                    upper = price + (price_range * 0.6)  # 60% acima
                else:
                    # Se não há range, cria um padrão de ±10%
                    lower = price * 0.9
                    upper = price * 1.1
                
                # Garante limites finais
                lower = max(min_price, lower)
                upper = min(max_price, upper)
                
                # Garante que lower <= price <= upper
                if lower > price:
                    lower = price * 0.95
                if upper < price:
                    upper = price * 1.05
                
                forecast_list.append({
                    "date": row['ds'].strftime('%Y-%m-%d'),
                    "price": round(price, 2),
                    "lower": round(lower, 2),
                    "upper": round(upper, 2)
                })
            
            return {
                "status": "success",
                "forecast": forecast_list,
                "forecast_model": "prophet",
                "metrics": {
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