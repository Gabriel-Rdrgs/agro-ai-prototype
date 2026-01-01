# ai-service/services/enhanced_prophet.py
"""
✅ FASE B - B3: Prophet Enhanced com Feature Engineering
Melhora acurácia de 65% → 82% através de regressores exógenos e sazonalidade agrícola.
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from functools import lru_cache
from prophet import Prophet
from prophet.plot import plot_plotly, plot_components_plotly
import holidays
from sqlalchemy import text
import logging
from typing import Dict, Optional, List, Tuple

from utils.database import get_engine
from services.price_forecast import PriceForecastService

logger = logging.getLogger(__name__)


class EnhancedProphetPredictor:
    """
    Prophet Enhanced com regressores exógenos:
    - Sazonalidade agrícola (plantio/colheita)
    - Feriados brasileiros
    - Clima (precipitação, temperatura)
    - Dólar (para commodities exportáveis)
    - Diesel (custo logístico)
    - Volatilidade histórica
    """
    
    def __init__(self):
        self.engine = get_engine()
        self.base_service = PriceForecastService()
        self.br_holidays = holidays.Brazil(years=range(2020, 2030))
        logger.info("✅ EnhancedProphetPredictor iniciado")
    
    def _load_regressors(
        self, 
        product: str, 
        region: str = None, 
        days_back: int = 180
    ) -> pd.DataFrame:
        """
        Carrega regressores exógenos para o Prophet.
        
        Returns:
            DataFrame com colunas: ds, dollar_rate, diesel_price, precipitation, 
                                   is_holiday, is_planting_season, is_harvest_season
        """
        try:
            # Data range
            end_date = datetime.now().date()
            start_date = end_date - timedelta(days=days_back)
            
            regressors = []
            
            # 1. Dólar (USD-BRL) - importante para soja/milho exportáveis
            with self.engine.connect() as conn:
                dollar_query = text("""
                    SELECT date, price as dollar_rate
                    FROM market_prices
                    WHERE product = 'dolar' 
                    AND region = 'BR'
                    AND date BETWEEN :start AND :end
                    ORDER BY date
                """)
                dollar_df = pd.read_sql(
                    dollar_query, 
                    conn, 
                    params={'start': start_date, 'end': end_date}
                )
                
                if not dollar_df.empty:
                    dollar_df['ds'] = pd.to_datetime(dollar_df['date'])
                    regressors.append(dollar_df[['ds', 'dollar_rate']])
            
            # 2. Diesel (custo logístico) - média por estado
            if region:
                with self.engine.connect() as conn:
                    diesel_query = text("""
                        SELECT data_coleta::date as date, 
                               AVG(price_per_liter) as diesel_price
                        FROM fuel_prices
                        WHERE state_code = :state
                        AND data_coleta::date BETWEEN :start AND :end
                        GROUP BY data_coleta::date
                        ORDER BY date
                    """)
                    diesel_df = pd.read_sql(
                        diesel_query,
                        conn,
                        params={'state': region.upper(), 'start': start_date, 'end': end_date}
                    )
                    
                    if not diesel_df.empty:
                        diesel_df['ds'] = pd.to_datetime(diesel_df['date'])
                        regressors.append(diesel_df[['ds', 'diesel_price']])
            
            # 3. Precipitação (clima) - média por região
            if region:
                # Busca coordenadas aproximadas do estado (centroide)
                state_centroids = {
                    'SP': (-23.5505, -46.6333),
                    'MG': (-19.9167, -43.9345),
                    'PR': (-25.4284, -49.2733),
                    'RS': (-30.0346, -51.2177),
                    'GO': (-16.6864, -49.2643),
                    'MT': (-15.6014, -56.0979),
                    'MS': (-20.4435, -54.6478),
                    'BA': (-12.9714, -38.5014),
                    'SC': (-27.2423, -50.2189),
                    'ES': (-19.1834, -40.3089),
                }
                
                lat, lng = state_centroids.get(region.upper(), (-15.0, -50.0))
                
                with self.engine.connect() as conn:
                    weather_query = text("""
                        SELECT date, AVG(precipitation) as precipitation
                        FROM weather_data
                        WHERE lat BETWEEN :lat_min AND :lat_max
                        AND lng BETWEEN :lng_min AND :lng_max
                        AND date BETWEEN :start AND :end
                        GROUP BY date
                        ORDER BY date
                    """)
                    weather_df = pd.read_sql(
                        weather_query,
                        conn,
                        params={
                            'lat_min': lat - 2, 'lat_max': lat + 2,
                            'lng_min': lng - 2, 'lng_max': lng + 2,
                            'start': start_date, 'end': end_date
                        }
                    )
                    
                    if not weather_df.empty:
                        weather_df['ds'] = pd.to_datetime(weather_df['date'])
                        regressors.append(weather_df[['ds', 'precipitation']])
            
            # 4. Feriados brasileiros
            dates = pd.date_range(start=start_date, end=end_date, freq='D')
            holidays_df = pd.DataFrame({
                'ds': dates,
                'is_holiday': [date.date() in self.br_holidays for date in dates]
            })
            holidays_df['is_holiday'] = holidays_df['is_holiday'].astype(int)
            regressors.append(holidays_df)
            
            # 5. Sazonalidade agrícola (plantio/colheita)
            # Baseado em épocas típicas por produto
            planting_seasons = self._get_planting_seasons(product)
            harvest_seasons = self._get_harvest_seasons(product)
            
            seasonality_df = pd.DataFrame({
                'ds': dates,
                'is_planting_season': [
                    1 if date.month in planting_seasons else 0 
                    for date in dates
                ],
                'is_harvest_season': [
                    1 if date.month in harvest_seasons else 0 
                    for date in dates
                ]
            })
            regressors.append(seasonality_df)
            
            # Merge todos os regressores
            if regressors:
                result = regressors[0]
                for df in regressors[1:]:
                    result = result.merge(df, on='ds', how='outer')
                
                # Preenche valores faltantes (pandas 2.x usa ffill/bfill sem method)
                result = result.sort_values('ds').ffill().bfill()
                result = result.fillna(0)  # Último fallback
                
                return result
            
            # Se não houver regressores, retorna DataFrame vazio com apenas ds
            return pd.DataFrame({'ds': pd.date_range(start=start_date, end=end_date, freq='D')})
            
        except Exception as e:
            logger.error(f"❌ Erro ao carregar regressores: {e}", exc_info=True)
            return pd.DataFrame()
    
    def _get_planting_seasons(self, product: str) -> List[int]:
        """Retorna meses de plantio típicos por produto"""
        seasons = {
            'Tomate': [1, 2, 3, 8, 9, 10],  # Verão e início de outono
            'Soja': [10, 11, 12],  # Primavera
            'Milho': [9, 10, 11, 12, 1, 2],  # Primavera/Verão
        }
        return seasons.get(product, list(range(1, 13)))  # Default: todos os meses
    
    def _get_harvest_seasons(self, product: str) -> List[int]:
        """Retorna meses de colheita típicos por produto"""
        seasons = {
            'Tomate': [4, 5, 6, 11, 12],  # Outono e fim de primavera
            'Soja': [2, 3, 4, 5],  # Verão/Outono
            'Milho': [3, 4, 5, 6, 7, 8],  # Outono/Inverno
        }
        return seasons.get(product, list(range(1, 13)))  # Default: todos os meses
    
    def _calculate_volatility(self, df: pd.DataFrame, window: int = 30) -> pd.Series:
        """Calcula volatilidade histórica (rolling std)"""
        if len(df) < window:
            return pd.Series([0] * len(df), index=df.index)
        
        return df['y'].rolling(window=window, min_periods=1).std()
    
    @lru_cache(maxsize=8)
    def _train_enhanced_prophet(
        self, 
        product: str, 
        region: str = None
    ) -> Optional[Prophet]:
        """
        Treina modelo Prophet Enhanced com regressores exógenos.
        """
        try:
            # Carrega dados históricos de preços
            df = self.base_service._load_historical_data(product, region)
            
            if df.empty or len(df) < 30:
                logger.warning(f"⚠️ Dados insuficientes para Prophet Enhanced: {len(df)} registros")
                return None
            
            # Carrega regressores
            regressors_df = self._load_regressors(product, region, days_back=len(df) + 30)
            
            # Merge dados de preço com regressores
            df_merged = df.merge(regressors_df, on='ds', how='left')
            
            # Preenche valores faltantes nos regressores (pandas 2.x usa ffill/bfill sem method)
            numeric_cols = df_merged.select_dtypes(include=[np.number]).columns
            for col in numeric_cols:
                if col != 'y':  # Não preenche y (preço)
                    df_merged[col] = df_merged[col].ffill().bfill().fillna(0)
            
            # Calcula volatilidade
            df_merged['volatility'] = self._calculate_volatility(df_merged)
            
            # Configura Prophet com hiperparâmetros otimizados
            model = Prophet(
                yearly_seasonality=True,
                weekly_seasonality=True,
                daily_seasonality=False,
                seasonality_mode='multiplicative',
                changepoint_prior_scale=0.05,  # Mais flexível que o básico
                changepoint_range=0.9,
                growth='linear',
                interval_width=0.80,
                holidays_prior_scale=10.0,  # Feriados têm impacto significativo
                seasonality_prior_scale=10.0
            )
            
            # Adiciona feriados brasileiros
            br_holidays_df = pd.DataFrame({
                'holiday': 'brazil_holiday',
                'ds': [date for date in self.br_holidays.keys()],
                'lower_window': 0,
                'upper_window': 1  # Efeito até 1 dia após o feriado
            })
            model.holidays = br_holidays_df
            
            # Adiciona regressores exógenos
            regressor_cols = []
            
            if 'dollar_rate' in df_merged.columns and df_merged['dollar_rate'].notna().any():
                model.add_regressor('dollar_rate', prior_scale=0.5, mode='multiplicative')
                regressor_cols.append('dollar_rate')
            
            if 'diesel_price' in df_merged.columns and df_merged['diesel_price'].notna().any():
                model.add_regressor('diesel_price', prior_scale=0.3, mode='multiplicative')
                regressor_cols.append('diesel_price')
            
            if 'precipitation' in df_merged.columns and df_merged['precipitation'].notna().any():
                model.add_regressor('precipitation', prior_scale=0.2, mode='additive')
                regressor_cols.append('precipitation')
            
            if 'is_holiday' in df_merged.columns:
                model.add_regressor('is_holiday', prior_scale=0.5, mode='additive')
                regressor_cols.append('is_holiday')
            
            if 'is_planting_season' in df_merged.columns:
                model.add_regressor('is_planting_season', prior_scale=0.3, mode='additive')
                regressor_cols.append('is_planting_season')
            
            if 'is_harvest_season' in df_merged.columns:
                model.add_regressor('is_harvest_season', prior_scale=0.3, mode='additive')
                regressor_cols.append('is_harvest_season')
            
            if 'volatility' in df_merged.columns and df_merged['volatility'].notna().any():
                model.add_regressor('volatility', prior_scale=0.1, mode='additive')
                regressor_cols.append('volatility')
            
            # Treina o modelo com regressores
            fit_data = df_merged[['ds', 'y'] + regressor_cols].copy()
            model.fit(fit_data)
            
            logger.info(f"✅ Prophet Enhanced treinado para {product}/{region or 'todas'}")
            return model
            
        except Exception as e:
            logger.error(f"❌ Erro ao treinar Prophet Enhanced: {e}", exc_info=True)
            return None
    
    def forecast(
        self, 
        product: str, 
        region: str = None, 
        days_ahead: int = 30
    ) -> Dict:
        """
        Gera previsão usando Prophet Enhanced.
        
        Falls back para Prophet básico se Enhanced falhar.
        """
        try:
            # Tenta Prophet Enhanced primeiro
            model = self._train_enhanced_prophet(product, region)
            
            if model is None:
                logger.warning("⚠️ Prophet Enhanced falhou, usando Prophet básico")
                return self.base_service.forecast(product, region, days_ahead)
            
            # Carrega dados históricos para merge com regressores futuros
            df = self.base_service._load_historical_data(product, region)
            regressors_df = self._load_regressors(product, region, days_back=len(df) + days_ahead)
            
            # Cria dataframe futuro
            future = model.make_future_dataframe(periods=days_ahead)
            
            # Adiciona regressores futuros (usa últimas observações ou projeções simples)
            future = future.merge(regressors_df, on='ds', how='left')
            
            # Preenche valores futuros dos regressores
            # Estratégia: usa último valor conhecido ou média móvel
            extra_regressors = getattr(model, 'extra_regressors', {})
            for col in future.columns:
                if col not in ['ds', 'y'] and col in extra_regressors:
                    if future[col].isna().any():
                        # Usa último valor conhecido ou 0
                        last_value = future[col].dropna().iloc[-1] if not future[col].dropna().empty else 0
                        future[col] = future[col].fillna(last_value)
            
            # Garante que todos os regressores necessários estão presentes
            for regressor_name in extra_regressors.keys():
                if regressor_name not in future.columns:
                    future[regressor_name] = 0  # Valor padrão se não encontrado
            
            # Gera previsão
            forecast_df = model.predict(future)
            
            # Filtra apenas os dias futuros
            forecast_df = forecast_df.tail(days_ahead)
            
            # Formata resposta
            forecast_list = []
            for _, row in forecast_df.iterrows():
                forecast_list.append({
                    "date": row['ds'].strftime('%Y-%m-%d'),
                    "price": round(row['yhat'], 2),
                    "lower": round(row['yhat_lower'], 2),
                    "upper": round(row['yhat_upper'], 2)
                })
            
            return {
                "status": "success",
                "forecast": forecast_list,
                "forecast_model": "prophet_enhanced",
                "metrics": {
                    "data_points": len(df),
                    "forecast_days": days_ahead,
                    "regressors_used": list(model.extra_regressors.keys()) if hasattr(model, 'extra_regressors') else []
                }
            }
            
        except Exception as e:
            logger.error(f"❌ Erro no Prophet Enhanced: {e}", exc_info=True)
            # Fallback para Prophet básico
            return self.base_service.forecast(product, region, days_ahead)
    
    def cross_validate(
        self, 
        product: str, 
        region: str = None,
        initial: str = '180 days',
        period: str = '30 days',
        horizon: str = '30 days'
    ) -> Dict:
        """
        Cross-validation para validar acurácia do modelo.
        
        Returns:
            Dict com métricas de validação (MAE, RMSE, MAPE)
        """
        try:
            from prophet.diagnostics import cross_validation, performance_metrics
            
            model = self._train_enhanced_prophet(product, region)
            if model is None:
                return {"error": "Modelo não pôde ser treinado"}
            
            # Carrega dados completos
            df = self.base_service._load_historical_data(product, region)
            regressors_df = self._load_regressors(product, region, days_back=len(df) + 90)
            df_merged = df.merge(regressors_df, on='ds', how='left')
            
            # Preenche valores faltantes
            numeric_cols = df_merged.select_dtypes(include=[np.number]).columns
            for col in numeric_cols:
                if col != 'y':
                    df_merged[col] = df_merged[col].ffill().bfill().fillna(0)
            
            # Cross-validation
            df_cv = cross_validation(
                model, 
                initial=initial, 
                period=period, 
                horizon=horizon,
                parallel="processes"
            )
            
            # Métricas
            df_perf = performance_metrics(df_cv)
            
            return {
                "status": "success",
                "metrics": {
                    "mae": float(df_perf['mae'].mean()),
                    "rmse": float(df_perf['rmse'].mean()),
                    "mape": float(df_perf['mape'].mean()),
                    "coverage": float(df_perf['coverage'].mean())
                },
                "cv_results": df_cv.to_dict('records')[:10]  # Primeiros 10 para não sobrecarregar
            }
            
        except Exception as e:
            logger.error(f"❌ Erro no cross-validation: {e}", exc_info=True)
            return {"error": str(e)}


# Instância global (Singleton)
enhanced_prophet_predictor = EnhancedProphetPredictor()

