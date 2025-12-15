# ai-service/services/data_sync/zarc_service.py
# ============================================
# ✅ FASE 0 - Semana 4: Integração com ZARC (Zoneamento Agrícola de Risco Climático)
# ============================================

import requests
import pandas as pd
import logging
from typing import Dict, List, Optional
from io import StringIO
from functools import lru_cache

logger = logging.getLogger(__name__)

# URL do CSV do ZARC (Dados Abertos MAPA)
# Fonte: https://dados.agricultura.gov.br/pt_PT/dataset/siszarc-sistemas-de-zoneamento-agricola-e-risco-climatico
ZARC_CSV_URL = "https://dados.agricultura.gov.br/dataset/siszarc-sistemas-de-zoneamento-agricola-e-risco-climatico/resource/siszarccsv"

class ZARCService:
    """
    Serviço para buscar dados do ZARC (Zoneamento Agrícola de Risco Climático).
    
    Fonte: Dados Abertos do MAPA (CSV)
    """
    
    def __init__(self):
        self.csv_url = ZARC_CSV_URL
        self.timeout = 30
        self._cache = {}
    
    def _download_zarc_csv(self) -> Optional[pd.DataFrame]:
        """
        Baixa o CSV do ZARC do portal de Dados Abertos do MAPA.
        
        Returns:
            DataFrame com dados do ZARC ou None se falhar
        """
        try:
            logger.info("📥 Baixando CSV do ZARC...")
            response = requests.get(self.csv_url, timeout=self.timeout)
            
            if response.status_code != 200:
                logger.warning(f"⚠️ ZARC CSV retornou {response.status_code}")
                return None
            
            # Lê CSV diretamente da resposta
            csv_data = StringIO(response.text)
            df = pd.read_csv(csv_data, encoding='utf-8', low_memory=False)
            
            logger.info(f"✅ CSV do ZARC baixado: {len(df)} registros")
            return df
            
        except Exception as e:
            logger.error(f"❌ Erro ao baixar CSV do ZARC: {e}")
            return None
    
    @lru_cache(maxsize=10)
    def get_planting_windows(
        self,
        product: str,
        state: str,
        cultivar: Optional[str] = None
    ) -> Optional[List[Dict]]:
        """
        Busca janelas de plantio do ZARC para um produto e estado.
        
        Args:
            product: Nome do produto (ex: 'Tomate', 'Soja', 'Milho')
            state: Código do estado (ex: 'SP', 'MG', 'GO')
            cultivar: Nome da cultivar (opcional)
        
        Returns:
            Lista de dicionários com janelas de plantio ou None se falhar
        """
        try:
            df = self._download_zarc_csv()
            
            if df is None or df.empty:
                return None
            
            # Normaliza nomes para busca
            product_lower = product.lower().strip()
            state_upper = state.upper().strip()
            
            # Filtra por produto e estado
            # Ajusta nomes das colunas conforme estrutura do CSV do MAPA
            # (pode variar, então tenta diferentes possibilidades)
            filtered = df.copy()
            
            # Tenta diferentes nomes de colunas possíveis
            product_col = None
            state_col = None
            
            for col in df.columns:
                col_lower = col.lower()
                if 'cultura' in col_lower or 'produto' in col_lower or 'cultivar' in col_lower:
                    product_col = col
                if 'uf' in col_lower or 'estado' in col_lower or 'unidade' in col_lower:
                    state_col = col
            
            if not product_col or not state_col:
                logger.warning("⚠️ Estrutura do CSV do ZARC não reconhecida")
                return None
            
            # Filtra dados
            if product_lower:
                filtered = filtered[
                    filtered[product_col].str.lower().str.contains(product_lower, na=False)
                ]
            
            if state_upper:
                filtered = filtered[
                    filtered[state_col].str.upper() == state_upper
                ]
            
            if cultivar:
                cultivar_lower = cultivar.lower()
                # Procura coluna de cultivar
                cultivar_col = None
                for col in df.columns:
                    if 'cultivar' in col.lower() or 'variedade' in col.lower():
                        cultivar_col = col
                        break
                
                if cultivar_col:
                    filtered = filtered[
                        filtered[cultivar_col].str.lower().str.contains(cultivar_lower, na=False)
                    ]
            
            if filtered.empty:
                logger.debug(f"⚠️ Nenhuma janela de plantio encontrada para {product}/{state}")
                return None
            
            # Converte para lista de dicionários
            results = []
            for _, row in filtered.iterrows():
                result = {
                    "product": row.get(product_col, product),
                    "state": row.get(state_col, state),
                    "data": row.to_dict()
                }
                results.append(result)
            
            logger.debug(f"✅ Encontradas {len(results)} janelas de plantio para {product}/{state}")
            return results
            
        except Exception as e:
            logger.error(f"❌ Erro ao buscar janelas de plantio ZARC: {e}")
            return None
    
    def get_ideal_planting_period(
        self,
        product: str,
        state: str,
        cultivar: Optional[str] = None
    ) -> Optional[Dict]:
        """
        Retorna período ideal de plantio baseado no ZARC.
        
        Args:
            product: Nome do produto
            state: Código do estado
            cultivar: Nome da cultivar (opcional)
        
        Returns:
            Dicionário com período ideal ou None se falhar
        """
        windows = self.get_planting_windows(product, state, cultivar)
        
        if not windows:
            return None
        
        # Retorna primeira janela encontrada (pode ser expandido para múltiplas)
        # Em produção, pode agregar todas as janelas
        return {
            "product": product,
            "state": state,
            "windows": windows,
            "source": "ZARC (MAPA)"
        }

# Instância singleton
zarc_service = ZARCService()

