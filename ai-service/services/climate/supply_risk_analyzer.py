# services/climate/supply_risk_analyzer.py
"""
Analisador de risco de abastecimento por região.

Identifica regiões que podem ficar comprometidas no abastecimento
devido a eventos climáticos extremos, problemas de produção, etc.
"""

import logging
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from .intelligence import climate_api
from .extreme_events import extreme_events_detector
from utils.cache import CacheManager

logger = logging.getLogger(__name__)


class SupplyRiskAnalyzer:
    """
    Analisa risco de abastecimento por região baseado em:
    - Eventos climáticos extremos
    - Histórico de produção
    - Padrões sazonais
    - Impacto em culturas específicas
    """
    
    def __init__(self):
        self.cache = CacheManager(ttl_seconds=43200)  # 12 horas (dados climáticos mudam muito lentamente - cache agressivo)
        logger.info("✅ SupplyRiskAnalyzer iniciado (com cache de 12h - otimizado para velocidade)")
    
    async def analyze_supply_risk(
        self,
        lat: float,
        lng: float,
        product: str = "Tomate",
        forecast_days: int = 16
    ) -> Dict:
        """
        Analisa risco de abastecimento para uma região específica.
        
        Args:
            lat: Latitude
            lng: Longitude
            product: Produto agrícola (ex: "Tomate", "Soja", "Milho")
            forecast_days: Dias à frente para analisar (padrão: 16)
        
        Returns:
            {
                "risk_level": "low" | "moderate" | "high" | "extreme",
                "risk_score": 0.0-100.0,
                "factors": [
                    {
                        "type": "extreme_weather",
                        "severity": "high",
                        "description": "Onda de calor prevista",
                        "impact_days": 5
                    }
                ],
                "recommendations": [
                    "Evitar compras nesta região nos próximos 7 dias"
                ],
                "affected_period": {
                    "start": "2025-12-15",
                    "end": "2025-12-20",
                    "duration_days": 5
                }
            }
        """
        try:
            # ✅ OTIMIZADO: Arredonda coordenadas para melhorar hit rate do cache
            # Arredonda para 2 casas decimais (~1.1km de precisão) - suficiente para análise regional
            lat_rounded = round(lat, 2)
            lng_rounded = round(lng, 2)
            cache_key = f"supply_risk_{lat_rounded}_{lng_rounded}_{product}_{forecast_days}"
            
            cached_result = self.cache.get(cache_key)
            if cached_result:
                logger.debug(f"✅ Cache HIT para supply risk: {lat_rounded},{lng_rounded}")
                return cached_result
            
            # ✅ OTIMIZADO: Busca dados em paralelo para reduzir tempo de resposta
            import asyncio
            forecast_task = climate_api.get_extended_forecast(lat, lng)
            events_task = extreme_events_detector.detect_extreme_events(lat, lng, forecast_days)
            
            # ✅ MELHORADO: Timeout aumentado para 35s (APIs externas podem demorar até 25s)
            # Com cache, geralmente retorna em <1s, mas na primeira vez precisa de mais tempo
            try:
                forecast_data, extreme_events = await asyncio.wait_for(
                    asyncio.gather(forecast_task, events_task, return_exceptions=True),
                    timeout=35.0  # ✅ AUMENTADO: 35s para dar tempo às APIs externas (25s + margem)
                )
            except asyncio.TimeoutError:
                logger.warning(f"⚠️ Timeout ao buscar dados climáticos para {lat},{lng} (35s excedido)")
                forecast_data = None
                extreme_events = None
            
            # Trata exceções retornadas por gather
            if isinstance(forecast_data, Exception):
                logger.warning(f"⚠️ Erro ao buscar forecast: {forecast_data}")
                forecast_data = None
            if isinstance(extreme_events, Exception):
                logger.warning(f"⚠️ Erro ao buscar eventos: {extreme_events}")
                extreme_events = None
            
            # ✅ CORRIGIDO: Permite análise mesmo com dados parciais
            if not forecast_data:
                logger.warning(f"⚠️ Dados climáticos indisponíveis para {lat},{lng}")
                return {
                    "risk_level": "low",
                    "risk_score": 0.0,
                    "factors": [],
                    "recommendations": ["Dados climáticos indisponíveis - assumindo risco baixo"],
                    "affected_period": None,
                    "product": product,
                    "location": {"lat": lat, "lng": lng}
                }
            
            # ✅ CORRIGIDO: Garante que extreme_events seja um dict válido
            if not extreme_events or not isinstance(extreme_events, dict):
                logger.warning(f"⚠️ Extreme events inválido para {lat},{lng}: {type(extreme_events)}")
                extreme_events = {"events": []}
            
            # ✅ DEBUG: Log inicial dos dados recebidos
            logger.info(f"📥 Dados recebidos para {lat},{lng}: forecast={forecast_data is not None}, events={extreme_events is not None}")
            
            # 3. Analisa fatores de risco
            risk_factors = []
            risk_score = 0.0
            
            # 3.1. Eventos extremos
            # ✅ DEBUG: Log da estrutura de extreme_events
            logger.info(f"🔍 Extreme events recebido para {lat},{lng}: {type(extreme_events)}, keys={extreme_events.keys() if isinstance(extreme_events, dict) else 'N/A'}")
            
            events = extreme_events.get('events', []) if isinstance(extreme_events, dict) else []
            
            # ✅ DEBUG: Log dos eventos encontrados
            logger.info(f"📋 Eventos encontrados: {len(events)} eventos")
            if events:
                for idx, event in enumerate(events):
                    logger.info(f"   Evento {idx+1}: {event}")
            
            if events:
                for event in events:
                    event_type = event.get('type', '')
                    severity = event.get('severity', 'low')
                    
                    # ✅ DEBUG: Log do cálculo de score por evento
                    logger.info(f"   Processando evento: type={event_type}, severity={severity}")
                    
                    # Calcula impacto no score
                    score_before = risk_score
                    if severity == 'extreme':
                        risk_score += 30.0
                    elif severity == 'high':
                        risk_score += 20.0
                    elif severity == 'moderate':
                        risk_score += 10.0
                    else:
                        risk_score += 5.0  # ✅ NOVO: Eventos 'low' também adicionam pontos
                    
                    logger.info(f"   Score: {score_before:.1f} -> {risk_score:.1f} (+{risk_score - score_before:.1f})")
                    
                    risk_factors.append({
                        "type": "extreme_weather",
                        "severity": severity,
                        "description": event.get('message', f"Evento {event_type} detectado"),
                        "impact_days": event.get('duration_days', 1),
                        "event_type": event_type
                    })
            else:
                logger.warning(f"⚠️ Nenhum evento extremo encontrado para {lat},{lng}")
            
            # 3.2. Chuva extrema (pode afetar colheita/transporte)
            rain_sum = forecast_data.get('rain_sum', [])
            if rain_sum:
                total_rain = sum(rain_sum)
                max_daily_rain = max(rain_sum) if rain_sum else 0
                
                # ✅ AJUSTADO: Thresholds mais baixos para detectar mais chuvas problemáticas
                # Chuva extrema (>80mm acumulado ou >40mm em um dia)
                if total_rain > 80 or max_daily_rain > 40:
                    risk_score += 15.0
                    risk_factors.append({
                        "type": "extreme_rain",
                        "severity": "high" if max_daily_rain > 40 else "moderate",
                        "description": f"Chuva extrema prevista: {total_rain:.1f}mm acumulado (máx diária: {max_daily_rain:.1f}mm)",
                        "impact_days": len([r for r in rain_sum if r > 20])
                    })
                # Chuva moderada (>50mm acumulado ou >25mm em um dia)
                elif total_rain > 50 or max_daily_rain > 25:
                    risk_score += 8.0
                    risk_factors.append({
                        "type": "moderate_rain",
                        "severity": "moderate",
                        "description": f"Chuva moderada prevista: {total_rain:.1f}mm acumulado",
                        "impact_days": len([r for r in rain_sum if r > 15])
                    })
            
            # 3.3. Temperaturas extremas (afeta produção)
            temp_max = forecast_data.get('temp_max', [])
            temp_min = forecast_data.get('temp_min', [])
            
            if temp_max and temp_min:
                max_temp = max(temp_max) if temp_max else 0
                min_temp = min(temp_min) if temp_min else 0
                avg_max = sum(temp_max) / len(temp_max) if temp_max else 0
                avg_min = sum(temp_min) / len(temp_min) if temp_min else 0
                
                # ✅ AJUSTADO: Thresholds mais baixos e considera média também
                # Calor extremo (>33°C máximo ou média >30°C) ou frio extremo (<7°C mínimo ou média <10°C)
                if max_temp > 33 or avg_max > 30:
                    risk_score += 12.0 if max_temp > 35 else 8.0
                    risk_factors.append({
                        "type": "extreme_heat",
                        "severity": "high" if max_temp > 35 else "moderate",
                        "description": f"Temperatura máxima prevista: {max_temp:.1f}°C (média: {avg_max:.1f}°C)",
                        "impact_days": len([t for t in temp_max if t > 30])
                    })
                
                if min_temp < 7 or avg_min < 10:
                    risk_score += 12.0 if min_temp < 5 else 8.0
                    risk_factors.append({
                        "type": "extreme_cold",
                        "severity": "high" if min_temp < 5 else "moderate",
                        "description": f"Temperatura mínima prevista: {min_temp:.1f}°C (média: {avg_min:.1f}°C)",
                        "impact_days": len([t for t in temp_min if t < 10])
                    })
            
            # 3.4. Ventos fortes (afeta transporte)
            wind_max = forecast_data.get('wind_max', [])
            if wind_max:
                max_wind = max(wind_max) if wind_max else 0
                if max_wind > 60:  # >60 km/h
                    risk_score += 8.0
                    risk_factors.append({
                        "type": "strong_winds",
                        "severity": "moderate",
                        "description": f"Ventos fortes previstos: {max_wind:.1f} km/h",
                        "impact_days": len([w for w in wind_max if w > 60])
                    })
            
            # 4. Determina nível de risco baseado no score
            # ✅ AJUSTADO: Thresholds mais sensíveis para detectar mais riscos
            if risk_score >= 40:
                risk_level = "extreme"
            elif risk_score >= 25:
                risk_level = "high"
            elif risk_score >= 10:
                risk_level = "moderate"
            else:
                risk_level = "low"
            
            # ✅ DEBUG: Log do cálculo de risco
            logger.info(f"📊 Risco calculado para {lat},{lng}: score={risk_score:.1f}, level={risk_level}, factors={len(risk_factors)}")
            
            # 5. Gera recomendações
            recommendations = self._generate_recommendations(risk_level, risk_factors, product)
            
            # 6. Calcula período afetado
            affected_period = self._calculate_affected_period(risk_factors, forecast_days)
            
            result = {
                "risk_level": risk_level,
                "risk_score": round(risk_score, 1),
                "factors": risk_factors,
                "recommendations": recommendations,
                "affected_period": affected_period,
                "product": product,
                "location": {
                    "lat": lat,
                    "lng": lng
                }
            }
            
            # ✅ REABILITADO: Salva no cache para próximas requisições
            self.cache.set(cache_key, result)
            logger.debug(f"✅ Risco calculado e cacheado: {lat},{lng}, score={risk_score:.1f}, level={risk_level}")
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Erro ao analisar risco de abastecimento: {e}", exc_info=True)
            return {
                "risk_level": "unknown",
                "risk_score": 0.0,
                "factors": [],
                "recommendations": [f"Erro ao analisar: {str(e)}"],
                "affected_period": None
            }
    
    def _generate_recommendations(
        self,
        risk_level: str,
        risk_factors: List[Dict],
        product: str
    ) -> List[str]:
        """Gera recomendações baseadas no nível de risco"""
        recommendations = []
        
        if risk_level == "extreme":
            recommendations.append(f"⚠️ RISCO EXTREMO: Evitar compras de {product} nesta região")
            recommendations.append("Aguardar estabilização climática antes de negociar")
        elif risk_level == "high":
            recommendations.append(f"⚠️ RISCO ALTO: Cautela ao comprar {product} nesta região")
            recommendations.append("Considerar alternativas em outras regiões")
        elif risk_level == "moderate":
            recommendations.append(f"⚠️ RISCO MODERADO: Monitorar condições climáticas para {product}")
        else:
            recommendations.append(f"✅ RISCO BAIXO: Região adequada para compra de {product}")
        
        # Recomendações específicas por tipo de evento
        event_types = [f.get('event_type', '') for f in risk_factors]
        if 'heat_wave' in event_types or 'extreme_heat' in event_types:
            recommendations.append("Onda de calor pode afetar qualidade do produto")
        if 'cold_wave' in event_types or 'extreme_cold' in event_types:
            recommendations.append("Frio extremo pode danificar plantações")
        if 'extreme_rain' in event_types:
            recommendations.append("Chuva extrema pode atrasar colheita e transporte")
        if 'tropical_storm' in event_types or 'hail' in event_types:
            recommendations.append("Eventos extremos podem causar danos físicos às plantações")
        
        return recommendations
    
    def _calculate_affected_period(
        self,
        risk_factors: List[Dict],
        forecast_days: int
    ) -> Optional[Dict]:
        """Calcula período mais afetado pelos eventos"""
        if not risk_factors:
            return None
        
        # Encontra o período com mais fatores de risco
        impact_days = [f.get('impact_days', 1) for f in risk_factors]
        if not impact_days:
            return None
        
        max_impact_days = max(impact_days)
        start_date = datetime.now()
        end_date = start_date + timedelta(days=min(max_impact_days, forecast_days))
        
        return {
            "start": start_date.strftime("%Y-%m-%d"),
            "end": end_date.strftime("%Y-%m-%d"),
            "duration_days": max_impact_days
        }
    
    async def analyze_multiple_regions(
        self,
        regions: List[Dict],
        product: str = "Tomate"
    ) -> Dict:
        """
        Analisa risco de abastecimento para múltiplas regiões.
        
        Args:
            regions: [
                {"lat": -16.51, "lng": -49.02, "name": "Goiânia"},
                ...
            ]
            product: Produto agrícola
        
        Returns:
            {
                "regions": [
                    {
                        "location": {"lat": -16.51, "lng": -49.02, "name": "Goiânia"},
                        "risk_level": "high",
                        "risk_score": 35.0,
                        ...
                    }
                ],
                "summary": {
                    "total_regions": 10,
                    "high_risk_count": 3,
                    "moderate_risk_count": 2,
                    "low_risk_count": 5
                }
            }
        """
        results = []
        risk_counts = {"extreme": 0, "high": 0, "moderate": 0, "low": 0, "unknown": 0}
        
        for region in regions:
            lat = region.get('lat')
            lng = region.get('lng')
            name = region.get('name', '')
            
            if not lat or not lng:
                continue
            
            risk_analysis = await self.analyze_supply_risk(lat, lng, product)
            risk_analysis['location']['name'] = name
            
            results.append(risk_analysis)
            risk_level = risk_analysis.get('risk_level', 'unknown')
            risk_counts[risk_level] = risk_counts.get(risk_level, 0) + 1
        
        return {
            "regions": results,
            "summary": {
                "total_regions": len(results),
                "extreme_risk_count": risk_counts.get('extreme', 0),
                "high_risk_count": risk_counts.get('high', 0),
                "moderate_risk_count": risk_counts.get('moderate', 0),
                "low_risk_count": risk_counts.get('low', 0),
                "unknown_risk_count": risk_counts.get('unknown', 0)
            }
        }


# Instância global
supply_risk_analyzer = SupplyRiskAnalyzer()


