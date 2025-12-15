# ai-service/services/data_sync/soilgrids_service.py
# ============================================
# ✅ FASE 0 - Semana 4: Integração com SoilGrids API (ISRIC)
# ============================================

import requests
import logging
from typing import Dict, Optional
from functools import lru_cache

logger = logging.getLogger(__name__)

# URL base da API SoilGrids
SOILGRIDS_BASE_URL = "https://rest.isric.org/soilgrids/v2.0"

class SoilGridsService:
    """
    Serviço para buscar dados de solo do SoilGrids (ISRIC).
    """
    
    def __init__(self):
        self.base_url = SOILGRIDS_BASE_URL
        self.timeout = 15
    
    @lru_cache(maxsize=100)
    def get_soil_properties(self, lat: float, lng: float, depth: str = "0-5cm") -> Optional[Dict]:
        """
        Busca propriedades do solo para uma localização específica.
        
        Args:
            lat: Latitude
            lng: Longitude
            depth: Profundidade (padrão: "0-5cm", outras: "5-15cm", "15-30cm", etc.)
        
        Returns:
            Dicionário com propriedades do solo ou None se falhar
        """
        try:
            url = f"{self.base_url}/properties/query"
            params = {
                "lon": lng,
                "lat": lat,
                "depth": depth,
                "value": "mean"  # Média estatística
            }
            
            response = requests.get(url, params=params, timeout=self.timeout)
            
            if response.status_code != 200:
                logger.warning(f"⚠️ SoilGrids retornou {response.status_code} para {lat},{lng}")
                return None
            
            data = response.json()
            
            # Extrai propriedades principais
            properties = data.get('properties', [])
            
            if not properties:
                logger.warning(f"⚠️ Nenhuma propriedade retornada para {lat},{lng}")
                return None
            
            # Organiza dados em formato mais útil
            result = {}
            for prop in properties:
                prop_name = prop.get('name', '')
                value = prop.get('depths', [{}])[0].get('values', {}).get('mean')
                
                if value is not None:
                    result[prop_name] = float(value)
            
            # Validação básica
            if self._validate_soil_data(result, lat, lng):
                logger.debug(f"✅ Dados de solo obtidos para {lat},{lng}: {len(result)} propriedades")
                return result
            else:
                logger.warning(f"⚠️ Dados de solo inválidos para {lat},{lng}")
                return None
                
        except Exception as e:
            logger.error(f"❌ Erro ao buscar dados de solo para {lat},{lng}: {e}")
            return None
    
    def _validate_soil_data(self, data: Dict, lat: float, lng: float) -> bool:
        """
        Valida dados de solo antes de retornar.
        
        Args:
            data: Dicionário com propriedades do solo
            lat: Latitude
            lng: Longitude
        
        Returns:
            True se válido, False caso contrário
        """
        # Valida coordenadas
        if not (-90 <= lat <= 90) or not (-180 <= lng <= 180):
            return False
        
        # Valida se há pelo menos uma propriedade
        if not data:
            return False
        
        # Valida valores (devem ser números positivos ou zero)
        for key, value in data.items():
            if not isinstance(value, (int, float)):
                return False
            if value < 0:
                return False
        
        return True
    
    def get_soil_summary(self, lat: float, lng: float) -> Optional[Dict]:
        """
        Busca resumo das propriedades do solo (múltiplas profundidades).
        
        Args:
            lat: Latitude
            lng: Longitude
        
        Returns:
            Dicionário com resumo das propriedades ou None se falhar
        """
        try:
            # Busca propriedades principais em diferentes profundidades
            depths = ["0-5cm", "5-15cm", "15-30cm"]
            all_properties = {}
            
            for depth in depths:
                props = self.get_soil_properties(lat, lng, depth)
                if props:
                    all_properties[depth] = props
            
            if not all_properties:
                return None
            
            # Calcula médias para propriedades principais
            summary = {}
            main_props = ['clay', 'sand', 'silt', 'soc', 'phh2o', 'bdod']
            
            for prop in main_props:
                values = []
                for depth_data in all_properties.values():
                    if prop in depth_data:
                        values.append(depth_data[prop])
                
                if values:
                    summary[prop] = sum(values) / len(values)
            
            return summary
            
        except Exception as e:
            logger.error(f"❌ Erro ao buscar resumo de solo para {lat},{lng}: {e}")
            return None

# Instância singleton
soilgrids_service = SoilGridsService()

