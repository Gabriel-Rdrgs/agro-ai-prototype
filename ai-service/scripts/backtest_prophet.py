# ai-service/scripts/backtest_prophet.py
"""
Script de Backtesting para validar a qualidade das previsões do Prophet.

Compara previsões passadas com valores reais e calcula métricas de acurácia:
- MAE (Mean Absolute Error)
- RMSE (Root Mean Squared Error)
- MAPE (Mean Absolute Percentage Error)
- Coverage (quantos valores reais caíram dentro do intervalo de confiança)

Uso:
    python scripts/backtest_prophet.py --product Tomate --region SP --cutoff-days 30 --forecast-days 7
"""

import os
import sys
import argparse
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Tuple
import pandas as pd
import numpy as np
from dotenv import load_dotenv

# Adiciona path para imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from utils.database import get_engine
from services.price_forecast import PriceForecastService
from sqlalchemy import text

# Configuração de Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# Carrega variáveis de ambiente
load_dotenv()


class ProphetBacktester:
    """
    Classe para realizar backtesting do modelo Prophet.
    """
    
    def __init__(self):
        self.engine = get_engine()
        self.forecast_service = PriceForecastService()
    
    def load_historical_data(
        self, 
        product: str, 
        region: str = None, 
        end_date: datetime = None,
        days_back: int = 180
    ) -> pd.DataFrame:
        """
        Carrega dados históricos até uma data específica.
        
        Args:
            product: Nome do produto
            region: Código UF ou None
            end_date: Data limite (não inclui dados após esta data)
            days_back: Quantos dias de histórico buscar antes de end_date
        
        Returns:
            DataFrame com colunas: ds (datetime), y (preço)
        """
        if end_date is None:
            end_date = datetime.now()
        
        start_date = end_date - timedelta(days=days_back)
        
        query = text("""
            SELECT 
                price_date as ds,
                price_avg as y
            FROM "CeasaPrice"
            WHERE product_name ILIKE :prod
              AND price_date >= :start_date
              AND price_date < :end_date
              AND is_projection = false
        """)
        
        params = {
            "prod": f"%{product}%",
            "start_date": start_date,
            "end_date": end_date
        }
        
        if region:
            query = text("""
                SELECT 
                    price_date as ds,
                    price_avg as y
                FROM "CeasaPrice"
                WHERE product_name ILIKE :prod
                  AND ceasa_region = :region
                  AND price_date >= :start_date
                  AND price_date < :end_date
                  AND is_projection = false
                ORDER BY price_date ASC
            """)
            params["region"] = region.upper()
        
        with self.engine.connect() as conn:
            df = pd.read_sql(query, conn, params=params)
        
        if not df.empty:
            df['ds'] = pd.to_datetime(df['ds'])
            df = df.sort_values('ds')
            
            # Normaliza preços (mesma lógica do PriceForecastService)
            prod_key = product.strip().capitalize()
            if prod_key == 'Tomate':
                df['y'] = df['y'].apply(lambda x: x / 20.0 if x > 15.0 else x)
            elif prod_key in ['Soja', 'Milho']:
                df['y'] = df['y'].apply(lambda x: x / 60.0 if x > 10.0 else x)
        
        return df
    
    def load_actual_values(
        self,
        product: str,
        start_date: datetime,
        end_date: datetime,
        region: str = None
    ) -> pd.DataFrame:
        """
        Carrega valores reais que aconteceram no período de teste.
        
        Args:
            product: Nome do produto
            region: Código UF ou None
            start_date: Data inicial do período de teste
            end_date: Data final do período de teste
        
        Returns:
            DataFrame com colunas: ds (datetime), y (preço real)
        """
        query = text("""
            SELECT 
                price_date as ds,
                price_avg as y
            FROM "CeasaPrice"
            WHERE product_name ILIKE :prod
              AND price_date >= :start_date
              AND price_date <= :end_date
              AND is_projection = false
        """)
        
        params = {
            "prod": f"%{product}%",
            "start_date": start_date,
            "end_date": end_date
        }
        
        if region:
            query = text("""
                SELECT 
                    price_date as ds,
                    price_avg as y
                FROM "CeasaPrice"
                WHERE product_name ILIKE :prod
                  AND ceasa_region = :region
                  AND price_date >= :start_date
                  AND price_date <= :end_date
                  AND is_projection = false
                ORDER BY price_date ASC
            """)
            params["region"] = region.upper()
        
        with self.engine.connect() as conn:
            df = pd.read_sql(query, conn, params=params)
        
        if not df.empty:
            df['ds'] = pd.to_datetime(df['ds'])
            df = df.sort_values('ds')
            
            # Normaliza preços (mesma lógica)
            prod_key = product.strip().capitalize()
            if prod_key == 'Tomate':
                df['y'] = df['y'].apply(lambda x: x / 20.0 if x > 15.0 else x)
            elif prod_key in ['Soja', 'Milho']:
                df['y'] = df['y'].apply(lambda x: x / 60.0 if x > 10.0 else x)
        
        return df
    
    def calculate_metrics(
        self,
        predictions: List[Dict],
        actuals: pd.DataFrame
    ) -> Dict:
        """
        Calcula métricas de acurácia comparando previsões com valores reais.
        
        Args:
            predictions: Lista de previsões [{date, price, lower, upper}, ...]
            actuals: DataFrame com valores reais (ds, y)
        
        Returns:
            Dict com métricas calculadas
        """
        if len(predictions) == 0 or actuals.empty:
            return {
                "mae": None,
                "rmse": None,
                "mape": None,
                "coverage": None,
                "data_points": 0
            }
        
        # Cria DataFrame de previsões
        pred_df = pd.DataFrame(predictions)
        pred_df['ds'] = pd.to_datetime(pred_df['date']).dt.date
        
        # Normaliza datas dos valores reais para comparação (apenas data, sem hora)
        actuals_normalized = actuals.copy()
        actuals_normalized['ds'] = pd.to_datetime(actuals_normalized['ds']).dt.date
        
        # Debug: mostra datas disponíveis
        logger.debug(f"   📅 Datas nas previsões: {sorted(pred_df['ds'].unique())[:5]}...")
        logger.debug(f"   📅 Datas nos valores reais: {sorted(actuals_normalized['ds'].unique())[:5]}...")
        
        # Merge com valores reais
        merged = pd.merge(
            pred_df,
            actuals_normalized[['ds', 'y']],
            on='ds',
            how='inner',
            suffixes=('_pred', '_actual')
        )
        
        if merged.empty:
            logger.warning("⚠️ Nenhum overlap entre previsões e valores reais")
            logger.warning(f"   Previsões têm {len(pred_df)} datas, valores reais têm {len(actuals_normalized)} datas")
            logger.warning(f"   Primeiras datas previstas: {pred_df['ds'].head(3).tolist()}")
            logger.warning(f"   Primeiras datas reais: {actuals_normalized['ds'].head(3).tolist()}")
            return {
                "mae": None,
                "rmse": None,
                "mape": None,
                "coverage": None,
                "data_points": 0,
                "min_error": None,
                "max_error": None,
                "mean_error": None
            }
        
        # Calcula erros
        merged['error'] = merged['price'] - merged['y']
        merged['abs_error'] = merged['error'].abs()
        merged['squared_error'] = merged['error'] ** 2
        merged['pct_error'] = (merged['abs_error'] / merged['y']) * 100
        
        # Verifica se valores reais estão dentro do intervalo de confiança
        merged['in_interval'] = (
            (merged['y'] >= merged['lower']) & 
            (merged['y'] <= merged['upper'])
        )
        
        # Métricas
        mae = merged['abs_error'].mean()
        rmse = np.sqrt(merged['squared_error'].mean())
        mape = merged['pct_error'].mean()
        coverage = merged['in_interval'].mean() * 100  # Percentual
        
        return {
            "mae": round(mae, 4),
            "rmse": round(rmse, 4),
            "mape": round(mape, 2),
            "coverage": round(coverage, 2),
            "data_points": len(merged),
            "min_error": round(merged['error'].min(), 4),
            "max_error": round(merged['error'].max(), 4),
            "mean_error": round(merged['error'].mean(), 4)  # Bias
        }
    
    def run_backtest(
        self,
        product: str,
        region: str = None,
        cutoff_days: int = 30,
        forecast_days: int = 7
    ) -> Dict:
        """
        Executa backtesting completo.
        
        Args:
            product: Nome do produto
            region: Código UF ou None
            cutoff_days: Quantos dias atrás fazer o "cutoff" (data de treinamento)
            forecast_days: Quantos dias à frente prever
        
        Returns:
            Dict com resultados do backtest
        """
        logger.info("=" * 60)
        logger.info(f"🔬 INICIANDO BACKTEST")
        logger.info(f"   Produto: {product}")
        logger.info(f"   Região: {region or 'Todas'}")
        logger.info(f"   Cutoff: {cutoff_days} dias atrás")
        logger.info(f"   Previsão: {forecast_days} dias à frente")
        logger.info("=" * 60)
        
        # Data de corte (quando o modelo "pararia" de ver dados)
        cutoff_date = datetime.now() - timedelta(days=cutoff_days)
        
        # Período de teste (valores reais que vamos comparar)
        test_start = cutoff_date
        test_end = cutoff_date + timedelta(days=forecast_days)
        
        logger.info(f"📅 Data de corte (treinamento até): {cutoff_date.strftime('%Y-%m-%d')}")
        logger.info(f"📅 Período de teste (valores reais): {test_start.strftime('%Y-%m-%d')} até {test_end.strftime('%Y-%m-%d')}")
        
        # 1. Carrega dados históricos até a data de corte
        logger.info("📊 Carregando dados históricos para treinamento...")
        historical_data = self.load_historical_data(
            product=product,
            region=region,
            end_date=cutoff_date,
            days_back=180
        )
        
        if historical_data.empty or len(historical_data) < 30:
            logger.error(f"❌ Dados insuficientes para treinamento: {len(historical_data)} registros")
            return {
                "success": False,
                "error": f"Dados insuficientes para treinamento: {len(historical_data)} registros (mínimo: 30)"
            }
        
        logger.info(f"   ✅ {len(historical_data)} registros históricos carregados")
        
        # 2. Carrega valores reais do período de teste
        logger.info("📊 Carregando valores reais do período de teste...")
        actual_values = self.load_actual_values(
            product=product,
            region=region,
            start_date=test_start,
            end_date=test_end
        )
        
        if actual_values.empty:
            logger.warning(f"⚠️ Nenhum valor real encontrado no período de teste")
            return {
                "success": False,
                "error": "Nenhum valor real encontrado no período de teste"
            }
        
        logger.info(f"   ✅ {len(actual_values)} valores reais encontrados")
        
        # 3. Treina modelo e gera previsões (simula o que aconteceria na data de corte)
        logger.info("🤖 Treinando modelo e gerando previsões...")
        
        # Temporariamente substitui o método _load_historical_data para usar apenas dados até cutoff
        original_load = self.forecast_service._load_historical_data
        
        def load_with_cutoff(p, r, d=180):
            """Wrapper que força o uso de dados até cutoff_date"""
            return self.load_historical_data(
                product=p,
                region=r,
                end_date=cutoff_date,
                days_back=d
            )
        
        self.forecast_service._load_historical_data = load_with_cutoff
        
        try:
            forecast_result = self.forecast_service.forecast(
                product=product,
                region=region,
                days_ahead=forecast_days
            )
        finally:
            # Restaura método original
            self.forecast_service._load_historical_data = original_load
        
        if forecast_result['status'] != 'success':
            logger.error(f"❌ Erro ao gerar previsão: {forecast_result.get('message', 'Erro desconhecido')}")
            return {
                "success": False,
                "error": forecast_result.get('message', 'Erro ao gerar previsão')
            }
        
        predictions = forecast_result['forecast']
        model_type = forecast_result.get('forecast_model', 'unknown')
        
        # ✅ CORREÇÃO: Ajusta datas das previsões para o período correto (a partir da data de corte)
        # O forecast gera previsões a partir da última data dos dados de treinamento ou de hoje
        # Precisamos ajustar para que comecem na data de corte
        
        if predictions:
            first_pred_date = datetime.strptime(predictions[0]['date'], '%Y-%m-%d').date()
            expected_start_date = test_start.date()
            
            logger.debug(f"   📅 Primeira data prevista (original): {first_pred_date}")
            logger.debug(f"   📅 Data esperada (início do teste): {expected_start_date}")
            
            # Calcula a diferença e ajusta todas as previsões
            date_diff = (expected_start_date - first_pred_date).days
            logger.info(f"   🔧 Ajustando datas das previsões: deslocando {date_diff} dias")
            
            for pred in predictions:
                pred_date = datetime.strptime(pred['date'], '%Y-%m-%d').date()
                adjusted_date = pred_date + timedelta(days=date_diff)
                pred['date'] = adjusted_date.strftime('%Y-%m-%d')
            
            # Verifica se o ajuste funcionou
            first_after_adjust = datetime.strptime(predictions[0]['date'], '%Y-%m-%d').date()
            if first_after_adjust == expected_start_date:
                logger.debug(f"   ✅ Datas ajustadas corretamente: {first_after_adjust}")
            else:
                logger.warning(f"   ⚠️ Ajuste não funcionou completamente. Prevista: {first_after_adjust}, Esperada: {expected_start_date}")
        
        logger.info(f"   ✅ {len(predictions)} previsões geradas (modelo: {model_type})")
        
        # 4. Calcula métricas
        logger.info("📈 Calculando métricas de acurácia...")
        metrics = self.calculate_metrics(predictions, actual_values)
        
        # 5. Gera relatório
        logger.info("=" * 60)
        logger.info("📊 RESULTADOS DO BACKTEST")
        logger.info("=" * 60)
        logger.info(f"   Modelo usado: {model_type}")
        logger.info(f"   Pontos de dados comparados: {metrics['data_points']}")
        logger.info("")
        logger.info("   Métricas de Erro:")
        logger.info(f"   - MAE (Mean Absolute Error): {metrics['mae'] or 'N/A'}")
        logger.info(f"   - RMSE (Root Mean Squared Error): {metrics['rmse'] or 'N/A'}")
        logger.info(f"   - MAPE (Mean Absolute Percentage Error): {metrics['mape'] or 'N/A'}%")
        logger.info("")
        logger.info("   Intervalo de Confiança:")
        logger.info(f"   - Coverage: {metrics['coverage'] or 'N/A'}% (valores reais dentro do intervalo)")
        logger.info("")
        logger.info("   Bias:")
        logger.info(f"   - Erro médio: {metrics['mean_error'] or 'N/A'}")
        logger.info(f"   - Erro mínimo: {metrics['min_error'] or 'N/A'}")
        logger.info(f"   - Erro máximo: {metrics['max_error'] or 'N/A'}")
        logger.info("=" * 60)
        
        return {
            "success": True,
            "product": product,
            "region": region or "Todas",
            "cutoff_date": cutoff_date.strftime('%Y-%m-%d'),
            "test_period": {
                "start": test_start.strftime('%Y-%m-%d'),
                "end": test_end.strftime('%Y-%m-%d')
            },
            "model_type": model_type,
            "training_data_points": len(historical_data),
            "actual_data_points": len(actual_values),
            "forecast_data_points": len(predictions),
            "metrics": metrics,
            "predictions": predictions[:10],  # Primeiras 10 para exemplo
            "actuals": actual_values[['ds', 'y']].head(10).to_dict('records')
        }


def main():
    parser = argparse.ArgumentParser(
        description='Backtesting do modelo Prophet para validação de qualidade.'
    )
    
    parser.add_argument(
        '--product',
        type=str,
        default='Tomate',
        help='Nome do produto (ex: Tomate, Soja, Milho)'
    )
    
    parser.add_argument(
        '--region',
        type=str,
        default=None,
        help='Código UF (ex: SP, MG, GO). Opcional, usa todos se não informado'
    )
    
    parser.add_argument(
        '--cutoff-days',
        type=int,
        default=30,
        help='Quantos dias atrás fazer o "cutoff" (data de treinamento). Padrão: 30'
    )
    
    parser.add_argument(
        '--forecast-days',
        type=int,
        default=7,
        help='Quantos dias à frente prever. Padrão: 7'
    )
    
    args = parser.parse_args()
    
    backtester = ProphetBacktester()
    result = backtester.run_backtest(
        product=args.product,
        region=args.region,
        cutoff_days=args.cutoff_days,
        forecast_days=args.forecast_days
    )
    
    if not result['success']:
        logger.error(f"❌ Backtest falhou: {result.get('error', 'Erro desconhecido')}")
        sys.exit(1)
    
    logger.info("✅ Backtest concluído com sucesso!")
    sys.exit(0)


if __name__ == "__main__":
    main()

