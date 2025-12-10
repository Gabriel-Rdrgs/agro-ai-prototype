# ai-service/services/projection_validator.py
"""
Serviço de validação cruzada: compara projeções CONAB com previsões Prophet.
Sistema de alertas para divergências significativas.
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from sqlalchemy import text
import logging
from typing import Dict, List, Optional
from utils.database import get_engine
from services.price_forecast import PriceForecastService

logger = logging.getLogger(__name__)


class ProjectionValidator:
    """
    Valida projeções CONAB comparando com previsões Prophet.
    Gera alertas quando há divergências significativas.
    """
    
    def __init__(self):
        self.engine = get_engine()
        self.forecast_service = PriceForecastService()
        self.ALERT_THRESHOLD = 15.0  # 15% de divergência gera alerta
    
    def compare_projections(self, product: str, region: str = None, days_ahead: int = 30) -> Dict:
        """
        Compara projeções CONAB com previsões Prophet.
        
        Args:
            product: Nome do produto
            region: Código UF ou None
            days_ahead: Quantos dias à frente comparar
            
        Returns:
            Dict com comparação e alertas
        """
        try:
            # 1. Busca projeções CONAB
            conab_projections = self._get_conab_projections(product, region, days_ahead)
            
            # 2. Gera previsões Prophet
            prophet_forecast = self.forecast_service.forecast(
                product=product,
                region=region,
                days_ahead=days_ahead
            )
            
            if not conab_projections or not prophet_forecast:
                return {
                    "success": False,
                    "error": "Dados insuficientes para comparação"
                }
            
            # 3. Compara datas e preços
            comparison = self._compare_data(conab_projections, prophet_forecast)
            
            # 4. Gera alertas se necessário
            alerts = self._generate_alerts(comparison)
            
            return {
                "success": True,
                "product": product,
                "region": region or "ALL",
                "comparison": comparison,
                "alerts": alerts,
                "conab_count": len(conab_projections),
                "prophet_count": len(prophet_forecast.get("forecast", []))
            }
            
        except Exception as e:
            logger.error(f"❌ Erro ao comparar projeções: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def _get_conab_projections(self, product: str, region: str = None, days_ahead: int = 30) -> List[Dict]:
        """Busca projeções CONAB do banco."""
        try:
            query = text("""
                SELECT 
                    price_date,
                    price_avg,
                    price_min,
                    price_max,
                    ceasa_region
                FROM "CeasaPrice"
                WHERE product_name ILIKE :prod
                  AND is_projection = true
                  AND price_date <= :max_date
                ORDER BY price_date ASC
            """)
            
            params = {
                "prod": f"%{product}%",
                "max_date": datetime.now() + timedelta(days=days_ahead)
            }
            
            if region:
                query = text("""
                    SELECT 
                        price_date,
                        price_avg,
                        price_min,
                        price_max,
                        ceasa_region
                    FROM "CeasaPrice"
                    WHERE product_name ILIKE :prod
                      AND ceasa_region = :region
                      AND is_projection = true
                      AND price_date <= :max_date
                    ORDER BY price_date ASC
                """)
                params["region"] = region.upper()
            
            with self.engine.connect() as conn:
                result = conn.execute(query, params)
                rows = result.fetchall()
                
                return [
                    {
                        "date": row[0],
                        "price_avg": float(row[1]),
                        "price_min": float(row[2]),
                        "price_max": float(row[3]),
                        "region": row[4]
                    }
                    for row in rows
                ]
                
        except Exception as e:
            logger.error(f"❌ Erro ao buscar projeções CONAB: {e}")
            return []
    
    def _compare_data(self, conab_data: List[Dict], prophet_data: Dict) -> Dict:
        """Compara dados CONAB com Prophet."""
        if not conab_data or not prophet_data.get("forecast"):
            return {}
        
        prophet_df = pd.DataFrame(prophet_data["forecast"])
        prophet_df['ds'] = pd.to_datetime(prophet_df['ds'])
        
        comparisons = []
        total_diff = 0
        count = 0
        
        for conab in conab_data:
            conab_date = pd.to_datetime(conab['date'])
            
            # Encontra previsão Prophet mais próxima
            prophet_match = prophet_df.iloc[(prophet_df['ds'] - conab_date).abs().argsort()[:1]]
            
            if not prophet_match.empty:
                prophet_price = float(prophet_match.iloc[0]['yhat'])
                conab_price = conab['price_avg']
                
                diff_percent = ((prophet_price - conab_price) / conab_price * 100) if conab_price > 0 else 0
                total_diff += abs(diff_percent)
                count += 1
                
                comparisons.append({
                    "date": conab_date.strftime('%Y-%m-%d'),
                    "conab_price": round(conab_price, 2),
                    "prophet_price": round(prophet_price, 2),
                    "difference_percent": round(diff_percent, 2),
                    "difference_abs": round(abs(prophet_price - conab_price), 2)
                })
        
        avg_diff = (total_diff / count) if count > 0 else 0
        
        return {
            "comparisons": comparisons,
            "average_difference_percent": round(avg_diff, 2),
            "total_comparisons": count
        }
    
    def _generate_alerts(self, comparison: Dict) -> List[Dict]:
        """Gera alertas para divergências significativas."""
        alerts = []
        
        if not comparison or not comparison.get("comparisons"):
            return alerts
        
        # Alerta 1: Diferença média alta
        avg_diff = comparison.get("average_difference_percent", 0)
        if avg_diff > self.ALERT_THRESHOLD:
            alerts.append({
                "type": "high_average_divergence",
                "severity": "warning",
                "message": f"Diferença média entre CONAB e Prophet: {avg_diff:.2f}%",
                "threshold": self.ALERT_THRESHOLD,
                "value": avg_diff
            })
        
        # Alerta 2: Divergências individuais extremas
        for comp in comparison.get("comparisons", []):
            diff = abs(comp.get("difference_percent", 0))
            if diff > self.ALERT_THRESHOLD * 2:  # 30% de divergência
                alerts.append({
                    "type": "extreme_divergence",
                    "severity": "critical",
                    "date": comp.get("date"),
                    "message": f"Divergência extrema em {comp.get('date')}: {diff:.2f}%",
                    "conab_price": comp.get("conab_price"),
                    "prophet_price": comp.get("prophet_price"),
                    "difference": diff
                })
        
        return alerts
    
    def validate_all_products(self, days_ahead: int = 30) -> Dict:
        """
        Valida projeções para todos os produtos disponíveis.
        
        Returns:
            Dict com resultados por produto
        """
        try:
            # Busca produtos com projeções
            query = text("""
                SELECT DISTINCT product_name
                FROM "CeasaPrice"
                WHERE is_projection = true
            """)
            
            with self.engine.connect() as conn:
                result = conn.execute(query)
                products = [row[0] for row in result.fetchall()]
            
            results = {}
            all_alerts = []
            
            for product in products:
                comparison = self.compare_projections(product, days_ahead=days_ahead)
                results[product] = comparison
                
                if comparison.get("success") and comparison.get("alerts"):
                    all_alerts.extend(comparison["alerts"])
            
            return {
                "success": True,
                "products_validated": len(products),
                "results": results,
                "all_alerts": all_alerts,
                "total_alerts": len(all_alerts)
            }
            
        except Exception as e:
            logger.error(f"❌ Erro ao validar todos os produtos: {e}")
            return {
                "success": False,
                "error": str(e)
            }
