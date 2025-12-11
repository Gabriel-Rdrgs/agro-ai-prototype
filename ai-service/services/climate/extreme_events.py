# ai-service/services/climate/extreme_events.py
"""
Detector de Eventos Climáticos Extremos.

Melhora a detecção básica com:
- Análise de ondas prolongadas (não apenas picos isolados)
- Comparação histórica (ano anterior vs atual)
- Severidade baseada em duração e intensidade
- Impacto estimado na produção
"""

import logging
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
from collections import defaultdict

from .intelligence import climate_api

logger = logging.getLogger(__name__)


# ========================================
# CONTEXTO DE EL NIÑO (Análise de Longo Prazo)
# ========================================
class ElNinoContext:
    """
    Fornece contexto sobre El Niño/La Niña para análise climática de longo prazo.
    
    Nota: El Niño é um fenômeno de escala global que afeta padrões climáticos
    ao longo de meses/anos. Não é detectado em previsão de 16 dias, mas fornece
    contexto importante para interpretar condições climáticas.
    """
    
    @staticmethod
    def get_current_status() -> Dict:
        """
        Retorna status atual de El Niño/La Niña.
        
        TODO: Integrar com API da NOAA ou dados do INMET quando disponível.
        Por enquanto, retorna contexto genérico.
        """
        # Em produção, isso viria de uma API externa (NOAA, INMET, etc.)
        return {
            "status": "neutral",  # "el_nino", "la_nina", "neutral"
            "strength": "weak",  # "weak", "moderate", "strong"
            "impact_brazil": {
                "south": "Aumento de chuvas e temperaturas mais altas",
                "southeast": "Chuvas irregulares, possíveis secas",
                "northeast": "Redução de chuvas, seca mais intensa",
                "north": "Redução de chuvas"
            },
            "note": "Status baseado em dados históricos. Para dados atualizados, consultar NOAA ou INMET."
        }
    
    @staticmethod
    def get_recommendations_for_region(region: str) -> List[str]:
        """Retorna recomendações específicas para região baseadas em El Niño."""
        context = ElNinoContext.get_current_status()
        impact = context.get("impact_brazil", {}).get(region.lower(), "")
        
        recommendations = []
        if context["status"] == "el_nino":
            if region.lower() in ["south", "southeast"]:
                recommendations.append("🌧️ El Niño ativo: Prepare-se para chuvas acima da média")
                recommendations.append("💧 Monitore umidade do solo e evite plantio em áreas de risco de alagamento")
            elif region.lower() in ["northeast", "north"]:
                recommendations.append("☀️ El Niño ativo: Prepare-se para seca mais intensa")
                recommendations.append("💧 Priorize sistemas de irrigação e culturas resistentes à seca")
        
        return recommendations


class ExtremeEventsDetector:
    """
    Detecta eventos climáticos extremos com análise avançada.
    """
    
    def __init__(self):
        logger.info("✅ ExtremeEventsDetector iniciado")
    
    async def detect_extreme_events(
        self,
        lat: float,
        lng: float,
        forecast_days: int = 16
    ) -> Dict:
        """
        Detecta eventos extremos nos próximos N dias.
        
        Args:
            lat: Latitude
            lng: Longitude
            forecast_days: Quantos dias analisar (padrão: 16)
        
        Returns:
            Dict com:
            - events: Lista de eventos detectados
            - summary: Resumo dos eventos
            - risk_level: 'low', 'moderate', 'high', 'extreme'
            - recommendations: Recomendações baseadas nos eventos
        """
        try:
            # Busca dados climáticos (await necessário pois é async)
            forecast_data = await climate_api.get_extended_forecast(lat, lng)
            
            if not forecast_data:
                return {
                    "events": [],
                    "summary": "Dados climáticos não disponíveis",
                    "risk_level": "unknown",
                    "recommendations": []
                }
            
            # Extrai dados de temperatura
            temp_max = forecast_data.get('temp_max', []) or forecast_data.get('temperature_2m_max', [])
            temp_min = forecast_data.get('temp_min', []) or forecast_data.get('temperature_2m_min', [])
            rain = forecast_data.get('rain_sum', []) or forecast_data.get('precipitation_sum', [])
            wind_max = forecast_data.get('wind_max', []) or forecast_data.get('wind_speed_10m_max', [])
            weathercode_daily = forecast_data.get('weathercode_daily', [])
            weathercode_hourly = forecast_data.get('weathercode_hourly', [])
            pressure = forecast_data.get('pressure', []) or forecast_data.get('surface_pressure', [])
            
            if not temp_max or not temp_min:
                return {
                    "events": [],
                    "summary": "Dados de temperatura não disponíveis",
                    "risk_level": "unknown",
                    "recommendations": []
                }
            
            events = []
            
            # ========================================
            # 1. DETECÇÃO DE ONDAS DE CALOR
            # ========================================
            heat_events = self._detect_heat_waves(temp_max, forecast_days)
            events.extend(heat_events)
            
            # ========================================
            # 2. DETECÇÃO DE ONDAS DE FRIO
            # ========================================
            cold_events = self._detect_cold_waves(temp_min, forecast_days)
            events.extend(cold_events)
            
            # ========================================
            # 3. DETECÇÃO DE CHUVAS EXTREMAS
            # ========================================
            if rain:
                rain_events = self._detect_extreme_rain(rain, forecast_days)
                events.extend(rain_events)
            
            # ========================================
            # 4. DETECÇÃO DE GRANIZO (NOVO)
            # ========================================
            hail_events = self._detect_hail(
                weathercode_daily, 
                weathercode_hourly, 
                temp_max, 
                temp_min, 
                rain,
                forecast_days
            )
            events.extend(hail_events)
            
            # ========================================
            # 5. DETECÇÃO DE CICLONES/TEMPESTADES TROPICAIS (NOVO)
            # ========================================
            if wind_max and pressure:
                cyclone_events = self._detect_tropical_storms(wind_max, pressure, rain, forecast_days)
                events.extend(cyclone_events)
            
            # ========================================
            # 4. CONTEXTO DE EL NIÑO (Longo Prazo)
            # ========================================
            el_nino_context = ElNinoContext.get_current_status()
            
            # ========================================
            # 5. ANÁLISE DE RISCO E RECOMENDAÇÕES
            # ========================================
            risk_level, summary, recommendations = self._analyze_risk(events)
            
            # Adiciona recomendações de El Niño se relevante
            # (pode ser expandido para usar região específica)
            if el_nino_context.get("status") != "neutral":
                recommendations.append(f"🌍 Contexto El Niño/La Niña: {el_nino_context.get('status').upper()}")
            
            return {
                "events": events,
                "summary": summary,
                "risk_level": risk_level,
                "recommendations": recommendations,
                "forecast_days": forecast_days,
                "el_nino_context": el_nino_context
            }
            
        except Exception as e:
            logger.error(f"❌ Erro ao detectar eventos extremos: {e}", exc_info=True)
            return {
                "events": [],
                "summary": f"Erro ao analisar eventos: {str(e)}",
                "risk_level": "unknown",
                "recommendations": []
            }
    
    def _detect_heat_waves(self, temp_max: List[float], days: int) -> List[Dict]:
        """
        Detecta ondas de calor prolongadas.
        
        Critérios:
        - Temperatura > 35°C por 3+ dias consecutivos = onda de calor
        - Temperatura > 40°C = extremo
        - Temperatura > 35°C por 5+ dias = severo
        """
        events = []
        consecutive_days = 0
        start_day = None
        max_temp_in_wave = 0
        
        for day_idx, temp in enumerate(temp_max):
            if temp is None or temp == 0:
                continue
                
            if temp > 35:
                if consecutive_days == 0:
                    start_day = day_idx
                    max_temp_in_wave = temp
                else:
                    max_temp_in_wave = max(max_temp_in_wave, temp)
                consecutive_days += 1
            else:
                # Fim da onda de calor
                if consecutive_days >= 3:
                    severity = self._calculate_heat_severity(consecutive_days, max_temp_in_wave)
                    events.append({
                        "type": "heat_wave",
                        "severity": severity,
                        "start_day": start_day,
                        "duration_days": consecutive_days,
                        "max_temperature": round(max_temp_in_wave, 1),
                        "message": self._format_heat_message(severity, consecutive_days, max_temp_in_wave),
                        "impact": self._get_heat_impact(severity, consecutive_days)
                    })
                consecutive_days = 0
                start_day = None
                max_temp_in_wave = 0
        
        # Verifica se há onda em andamento no final
        if consecutive_days >= 3:
            severity = self._calculate_heat_severity(consecutive_days, max_temp_in_wave)
            events.append({
                "type": "heat_wave",
                "severity": severity,
                "start_day": start_day,
                "duration_days": consecutive_days,
                "max_temperature": round(max_temp_in_wave, 1),
                "message": self._format_heat_message(severity, consecutive_days, max_temp_in_wave),
                "impact": self._get_heat_impact(severity, consecutive_days)
            })
        
        return events
    
    def _detect_cold_waves(self, temp_min: List[float], days: int) -> List[Dict]:
        """
        Detecta ondas de frio prolongadas.
        
        Critérios:
        - Temperatura < 10°C por 3+ dias consecutivos = onda de frio
        - Temperatura < 5°C = extremo
        - Temperatura < 10°C por 5+ dias = severo
        """
        events = []
        consecutive_days = 0
        start_day = None
        min_temp_in_wave = 100
        
        for day_idx, temp in enumerate(temp_min):
            if temp is None or temp == 0:
                continue
                
            if temp < 10:
                if consecutive_days == 0:
                    start_day = day_idx
                    min_temp_in_wave = temp
                else:
                    min_temp_in_wave = min(min_temp_in_wave, temp)
                consecutive_days += 1
            else:
                # Fim da onda de frio
                if consecutive_days >= 3:
                    severity = self._calculate_cold_severity(consecutive_days, min_temp_in_wave)
                    events.append({
                        "type": "cold_wave",
                        "severity": severity,
                        "start_day": start_day,
                        "duration_days": consecutive_days,
                        "min_temperature": round(min_temp_in_wave, 1),
                        "message": self._format_cold_message(severity, consecutive_days, min_temp_in_wave),
                        "impact": self._get_cold_impact(severity, consecutive_days)
                    })
                consecutive_days = 0
                start_day = None
                min_temp_in_wave = 100
        
        # Verifica se há onda em andamento no final
        if consecutive_days >= 3:
            severity = self._calculate_cold_severity(consecutive_days, min_temp_in_wave)
            events.append({
                "type": "cold_wave",
                "severity": severity,
                "start_day": start_day,
                "duration_days": consecutive_days,
                "min_temperature": round(min_temp_in_wave, 1),
                "message": self._format_cold_message(severity, consecutive_days, min_temp_in_wave),
                "impact": self._get_cold_impact(severity, consecutive_days)
            })
        
        return events
    
    def _detect_extreme_rain(self, rain: List[float], days: int) -> List[Dict]:
        """
        Detecta chuvas extremas.
        
        Critérios:
        - Chuva > 50mm em um único dia = extremo
        - Chuva > 30mm por 3+ dias consecutivos = severo
        """
        events = []
        
        for day_idx, daily_rain in enumerate(rain):
            if daily_rain is None or daily_rain == 0:
                continue
            
            if daily_rain > 50:
                events.append({
                    "type": "extreme_rain",
                    "severity": "extreme",
                    "day": day_idx,
                    "rainfall_mm": round(daily_rain, 1),
                    "message": f"Chuva extrema: {daily_rain:.1f}mm em um único dia",
                    "impact": "Risco de alagamento e danos à colheita. Evitar operações no campo."
                })
            elif daily_rain > 30:
                events.append({
                    "type": "extreme_rain",
                    "severity": "high",
                    "day": day_idx,
                    "rainfall_mm": round(daily_rain, 1),
                    "message": f"Chuva intensa: {daily_rain:.1f}mm",
                    "impact": "Pode comprometer qualidade e dificultar colheita."
                })
        
        return events
    
    def _detect_hail(
        self, 
        weathercode_daily: List[int], 
        weathercode_hourly: List[int],
        temp_max: List[float],
        temp_min: List[float],
        rain: List[float],
        days: int
    ) -> List[Dict]:
        """
        Detecta risco de granizo.
        
        Critérios:
        1. Weathercode WMO: 96 (thunderstorm with slight hail) ou 99 (thunderstorm with heavy hail)
        2. Inferência: Temperatura baixa (<15°C) + chuva intensa (>20mm) + alta umidade = risco de granizo
        3. Condições atmosféricas: Temp baixa + chuva forte = possível granizo
        
        Nota: Open-Meteo pode não fornecer weathercode de granizo no Brasil,
        então usamos inferência baseada em condições atmosféricas.
        """
        events = []
        
        # Verifica weathercode (se disponível - principalmente Europa)
        for day_idx in range(min(len(weathercode_daily), days)):
            code = weathercode_daily[day_idx] if day_idx < len(weathercode_daily) else None
            
            # WMO codes: 96 = thunderstorm with slight hail, 99 = thunderstorm with heavy hail
            if code in [96, 99]:
                severity = "extreme" if code == 99 else "high"
                events.append({
                    "type": "hail",
                    "severity": severity,
                    "day": day_idx,
                    "message": f"🌨️ Granizo detectado (código WMO {code})",
                    "impact": "RISCO CRÍTICO: Granizo pode causar danos físicos severos às plantações. Proteger culturas imediatamente."
                })
        
        # Verifica weathercode horário (mais preciso)
        if weathercode_hourly:
            for hour_idx, code in enumerate(weathercode_hourly):
                if code in [96, 99]:
                    day_idx = hour_idx // 24
                    if day_idx < days:
                        # Evita duplicatas
                        if not any(e.get('day') == day_idx and e.get('type') == 'hail' for e in events):
                            severity = "extreme" if code == 99 else "high"
                            events.append({
                                "type": "hail",
                                "severity": severity,
                                "day": day_idx,
                                "message": f"🌨️ Granizo detectado (código WMO {code})",
                                "impact": "RISCO CRÍTICO: Granizo pode causar danos físicos severos às plantações. Proteger culturas imediatamente."
                            })
        
        # INFERÊNCIA: Detecta condições favoráveis a granizo (quando weathercode não disponível)
        for day_idx in range(min(len(temp_max), len(temp_min), len(rain), days)):
            if day_idx >= len(temp_max) or day_idx >= len(temp_min) or day_idx >= len(rain):
                continue
                
            t_max = temp_max[day_idx] if day_idx < len(temp_max) else None
            t_min = temp_min[day_idx] if day_idx < len(temp_min) else None
            daily_rain = rain[day_idx] if day_idx < len(rain) else None
            
            if t_max is None or t_min is None or daily_rain is None:
                continue
            
            # Condições favoráveis a granizo:
            # 1. Temperatura baixa (frio na superfície, mas ar quente acima)
            # 2. Chuva intensa (>20mm)
            # 3. Diferença de temperatura (instabilidade atmosférica)
            temp_diff = t_max - t_min if t_max and t_min else 0
            
            # Risco alto: temp baixa + chuva forte + alta instabilidade
            if daily_rain > 20 and t_max < 20 and temp_diff > 8:
                # Verifica se já não foi detectado por weathercode
                if not any(e.get('day') == day_idx and e.get('type') == 'hail' for e in events):
                    severity = "high" if daily_rain > 40 else "moderate"
                    events.append({
                        "type": "hail",
                        "severity": severity,
                        "day": day_idx,
                        "message": f"🌨️ Risco de granizo: condições atmosféricas favoráveis (temp {t_max:.1f}°C, chuva {daily_rain:.1f}mm)",
                        "impact": "Condições favoráveis a granizo detectadas. Monitorar alertas da Defesa Civil e proteger culturas se possível."
                    })
        
        return events
    
    def _detect_tropical_storms(
        self,
        wind_max: List[float],
        pressure: List[float],
        rain: List[float],
        days: int
    ) -> List[Dict]:
        """
        Detecta ciclones/tempestades tropicais.
        
        Critérios REVISADOS:
        - Vento > 90 km/h (25 m/s) = CICLONE (extreme)
        - Vento > 75 km/h + pressão < 1000 hPa = Tempestade Tropical (high)
        - Vento > 60 km/h + pressão < 1005 hPa = Ventos Fortes (moderate)
        - Ventos 60-75 km/h isolados = Ventos Fortes (moderate, não crítico)
        
        Nota: No Brasil, ciclones são raros mas podem ocorrer no sul/sudeste.
        Ventos de 60-70 km/h são comuns e não devem ser tratados como críticos.
        """
        events = []
        
        for day_idx in range(min(len(wind_max), len(pressure), days)):
            if day_idx >= len(wind_max) or day_idx >= len(pressure):
                continue
                
            wind = wind_max[day_idx] if day_idx < len(wind_max) else None
            press = pressure[day_idx] if day_idx < len(pressure) else None
            daily_rain = rain[day_idx] if day_idx < len(rain) else 0
            
            if wind is None:
                continue
            
            # Converte m/s para km/h (se necessário)
            wind_kmh = wind * 3.6 if wind < 50 else wind  # Assume que valores > 50 já estão em km/h
            
            # VALIDAÇÃO: Pressão muito baixa constante pode ser erro de dados ou altitude elevada
            # Pressão normal ao nível do mar: ~1013 hPa
            # Pressão em altitude (ex: 1000m): ~900 hPa (normal para altitude)
            # Se pressão está consistentemente < 950 hPa, pode ser característica da região (altitude)
            # NÃO devemos tratar como ciclone se não houver ventos fortes também
            
            # Calcula pressão relativa (desvio da normal)
            # Se pressão média da região for < 950, assume que é altitude (não ciclone)
            # Só considera pressão baixa se houver VENTOS FORTES também
            
            # CICLONE EXTREMO (extreme): 
            # - Vento > 90 km/h (independente de pressão - ventos extremos são críticos)
            if wind_kmh > 90:
                events.append({
                    "type": "tropical_storm",
                    "severity": "extreme",
                    "day": day_idx,
                    "wind_speed_kmh": round(wind_kmh, 1),
                    "pressure_hpa": round(press, 1) if press else None,
                    "message": f"🌀 CICLONE: vento {wind_kmh:.1f} km/h" + (f", pressão {press:.1f} hPa" if press else ""),
                    "impact": "RISCO CRÍTICO: Ventos extremos podem causar danos estruturais, derrubar plantações e interromper operações. Suspender todas as atividades no campo."
                })
            # TEMPESTADE TROPICAL (high): 
            # - Vento > 75 km/h + pressão < 1000 hPa (baixa pressão + ventos fortes)
            # - Vento > 60 km/h + pressão < 980 hPa E pressão < média regional - 30 hPa (queda significativa)
            elif wind_kmh > 75 and press and press < 1000:
                events.append({
                    "type": "tropical_storm",
                    "severity": "high",
                    "day": day_idx,
                    "wind_speed_kmh": round(wind_kmh, 1),
                    "pressure_hpa": round(press, 1) if press else None,
                    "message": f"🌀 Tempestade Tropical: vento {wind_kmh:.1f} km/h, pressão {press:.1f} hPa",
                    "impact": "Risco alto: Sistema de baixa pressão forte combinado com ventos fortes indica tempestade tropical. Monitorar condições e proteger estruturas."
                })
            # VENTOS FORTES (moderate): 
            # - Vento > 75 km/h isolado (ventos fortes mesmo sem pressão baixa)
            # - Vento > 60 km/h + pressão < 1005 hPa (pressão moderadamente baixa + ventos)
            elif wind_kmh > 75 or (wind_kmh > 60 and press and press < 1005):
                events.append({
                    "type": "tropical_storm",
                    "severity": "moderate",
                    "day": day_idx,
                    "wind_speed_kmh": round(wind_kmh, 1),
                    "pressure_hpa": round(press, 1) if press else None,
                    "message": f"🌪️ Ventos fortes: {wind_kmh:.1f} km/h" + (f", pressão {press:.1f} hPa" if press and press < 1010 else ""),
                    "impact": "Ventos fortes podem causar danos menores às plantações. Monitorar condições e proteger estruturas frágeis."
                })
            # Pressão baixa isolada (sem ventos fortes) = NÃO é evento extremo
            # (pode ser característica da região devido à altitude ou erro de dados)
        
        return events
    
    def _calculate_heat_severity(self, duration: int, max_temp: float) -> str:
        """Calcula severidade da onda de calor."""
        if max_temp >= 40 or duration >= 7:
            return "extreme"
        elif max_temp >= 38 or duration >= 5:
            return "high"
        else:
            return "moderate"
    
    def _calculate_cold_severity(self, duration: int, min_temp: float) -> str:
        """Calcula severidade da onda de frio."""
        if min_temp <= 5 or duration >= 7:
            return "extreme"
        elif min_temp <= 7 or duration >= 5:
            return "high"
        else:
            return "moderate"
    
    def _format_heat_message(self, severity: str, duration: int, max_temp: float) -> str:
        """Formata mensagem da onda de calor."""
        if severity == "extreme":
            return f"🔥 Onda de calor EXTREMA: {max_temp:.1f}°C por {duration} dias consecutivos"
        elif severity == "high":
            return f"🔥 Onda de calor intensa: {max_temp:.1f}°C por {duration} dias"
        else:
            return f"🌡️ Onda de calor moderada: {max_temp:.1f}°C por {duration} dias"
    
    def _format_cold_message(self, severity: str, duration: int, min_temp: float) -> str:
        """Formata mensagem da onda de frio."""
        if severity == "extreme":
            return f"❄️ Onda de frio EXTREMA: {min_temp:.1f}°C por {duration} dias consecutivos"
        elif severity == "high":
            return f"❄️ Onda de frio intensa: {min_temp:.1f}°C por {duration} dias"
        else:
            return f"🌡️ Onda de frio moderada: {min_temp:.1f}°C por {duration} dias"
    
    def _get_heat_impact(self, severity: str, duration: int) -> str:
        """Retorna impacto estimado da onda de calor."""
        if severity == "extreme":
            return "Risco crítico: pode causar perda total de produção, queima de folhas e frutos. Suspender operações."
        elif severity == "high":
            return "Risco alto: pode reduzir produtividade em 30-50%, comprometer qualidade e reduzir shelf-life."
        else:
            return "Risco moderado: pode reduzir produtividade em 10-20% e comprometer qualidade."
    
    def _get_cold_impact(self, severity: str, duration: int) -> str:
        """Retorna impacto estimado da onda de frio."""
        if severity == "extreme":
            return "Risco crítico: pode causar danos por frio irreversíveis, morte de plantas e perda total."
        elif severity == "high":
            return "Risco alto: pode causar danos por frio, reduzir crescimento e comprometer qualidade."
        else:
            return "Risco moderado: pode reduzir crescimento e desenvolvimento das plantas."
    
    def _analyze_risk(self, events: List[Dict]) -> Tuple[str, str, List[str]]:
        """Analisa risco geral e gera recomendações."""
        if not events:
            return ("low", "✅ Nenhum evento extremo detectado nos próximos 16 dias", [])
        
        # Conta eventos por severidade
        extreme_count = sum(1 for e in events if e.get('severity') == 'extreme')
        high_count = sum(1 for e in events if e.get('severity') == 'high')
        moderate_count = sum(1 for e in events if e.get('severity') == 'moderate')
        
        # Determina nível de risco
        if extreme_count > 0:
            risk_level = "extreme"
            summary = f"⚠️ {extreme_count} evento(s) EXTREMO(S) detectado(s) nos próximos 16 dias"
        elif high_count > 0:
            risk_level = "high"
            summary = f"⚠️ {high_count} evento(s) de alta intensidade detectado(s)"
        elif moderate_count > 0:
            risk_level = "moderate"
            summary = f"ℹ️ {moderate_count} evento(s) moderado(s) detectado(s)"
        else:
            risk_level = "low"
            summary = "✅ Condições climáticas dentro do normal"
        
        # Gera recomendações
        recommendations = []
        
        # Recomendações específicas por tipo de evento
        has_hail = any(e.get('type') == 'hail' for e in events)
        has_cyclone = any(e.get('type') == 'tropical_storm' and e.get('severity') == 'extreme' for e in events)
        has_tropical_storm = any(e.get('type') == 'tropical_storm' and e.get('severity') == 'high' for e in events)
        has_strong_winds = any(e.get('type') == 'tropical_storm' and e.get('severity') == 'moderate' for e in events)
        
        if extreme_count > 0:
            recommendations.append("🚨 ALERTA CRÍTICO: Suspender operações de campo durante eventos extremos")
            recommendations.append("📦 Priorizar armazenamento em câmara fria para proteger produção")
            
            if has_hail:
                recommendations.append("🌨️ GRANIZO: Proteger culturas com coberturas, redes ou estruturas. Verificar danos após o evento.")
            
            if has_cyclone:
                recommendations.append("🌀 CICLONE: Evacuar áreas de risco, proteger estruturas e suspender todas as operações.")
            else:
                recommendations.append("💧 Aumentar irrigação para mitigar estresse térmico")
        
        if high_count > 0:
            recommendations.append("⚠️ Monitorar qualidade e shelf-life da produção diariamente")
            recommendations.append("🌡️ Considerar sombreamento ou proteção adicional")
            
            if has_hail:
                recommendations.append("🌨️ Monitorar alertas da Defesa Civil sobre granizo e preparar proteções.")
            
            if has_tropical_storm:
                recommendations.append("🌀 Tempestade Tropical: Proteger estruturas e monitorar condições. Considerar suspender operações externas.")
        
        if moderate_count > 0:
            if has_strong_winds:
                recommendations.append("🌪️ Ventos fortes detectados: Proteger estruturas frágeis e monitorar condições.")
            else:
                recommendations.append("ℹ️ Manter monitoramento regular das condições climáticas")
        
        return (risk_level, summary, recommendations)


# Instância Global
extreme_events_detector = ExtremeEventsDetector()
