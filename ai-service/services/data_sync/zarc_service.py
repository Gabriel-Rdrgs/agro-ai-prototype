# ai-service/services/data_sync/zarc_service.py
# ============================================
# ✅ FASE 0 - Semana 4: Integração com ZARC (Zoneamento Agrícola de Risco Climático)
# ✅ MELHORADO: Cache persistente, múltiplas URLs, melhor normalização, fallback para calendar.py
# ============================================

import requests
import pandas as pd
import logging
import os
import tempfile
from typing import Dict, List, Optional
from io import StringIO
from functools import lru_cache
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

# ✅ NOVO: Importa calendário hardcoded como fallback
try:
    from config.calendar import get_planting_window
    HAS_CALENDAR_FALLBACK = True
except ImportError:
    HAS_CALENDAR_FALLBACK = False
    logger.warning("⚠️ config.calendar não disponível, fallback desabilitado")

# ✅ MELHORADO: Múltiplas URLs de fallback para o CSV do ZARC
ZARC_CSV_URLS = [
    "https://dados.agricultura.gov.br/dataset/siszarc-sistemas-de-zoneamento-agricola-e-risco-climatico/resource/siszarccsv",
    "https://dados.agricultura.gov.br/dataset/siszarc/resource/siszarccsv",
    # URL alternativa caso a primeira falhe
]

# ✅ NOVO: Mapeamento de normalização de nomes de produtos
PRODUCT_NORMALIZATION = {
    'tomate': ['tomate', 'tomate de mesa', 'tomate industrial', 'lycopersicon'],
    'soja': ['soja', 'glycine max'],
    'milho': ['milho', 'zea mays', 'milho safrinha', 'milho verão'],
    'feijão': ['feijão', 'feijão comum', 'phaseolus vulgaris'],
    'arroz': ['arroz', 'oryza sativa'],
    'café': ['café', 'coffea'],
    'algodão': ['algodão', 'gossypium'],
    'trigo': ['trigo', 'triticum'],
    'cana': ['cana-de-açúcar', 'cana', 'saccharum'],
}

class ZARCService:
    """
    Serviço para buscar dados do ZARC (Zoneamento Agrícola de Risco Climático).
    
    ✅ MELHORADO:
    - Cache persistente do CSV (arquivo temporário com TTL de 24h)
    - Múltiplas URLs de fallback
    - Normalização melhorada de nomes de produtos
    - Cache mais agressivo (100 consultas)
    
    Fonte: Dados Abertos do MAPA (CSV)
    """
    
    def __init__(self):
        self.csv_urls = ZARC_CSV_URLS
        self.timeout = 30
        self._cache = {}
        self._csv_cache_file = os.path.join(tempfile.gettempdir(), 'zarc_csv_cache.pkl')
        self._csv_cache_ttl = timedelta(hours=24)  # Cache válido por 24 horas
        self._csv_df = None
        self._csv_last_download = None
    
    def _load_cached_csv(self) -> Optional[pd.DataFrame]:
        """
        Carrega CSV do cache persistente se ainda válido.
        
        Returns:
            DataFrame ou None se cache inválido/inexistente
        """
        try:
            if os.path.exists(self._csv_cache_file):
                import pickle
                with open(self._csv_cache_file, 'rb') as f:
                    cache_data = pickle.load(f)
                    cache_time = cache_data.get('timestamp')
                    df = cache_data.get('data')
                    
                    if cache_time and df is not None:
                        age = datetime.now() - cache_time
                        if age < self._csv_cache_ttl:
                            logger.debug(f"✅ CSV do ZARC carregado do cache (idade: {age})")
                            return df
                        else:
                            logger.debug(f"⚠️ Cache do CSV expirado (idade: {age})")
        except Exception as e:
            logger.debug(f"Erro ao carregar cache: {e}")
        return None
    
    def _save_csv_cache(self, df: pd.DataFrame):
        """
        Salva CSV no cache persistente.
        """
        try:
            import pickle
            cache_data = {
                'timestamp': datetime.now(),
                'data': df
            }
            with open(self._csv_cache_file, 'wb') as f:
                pickle.dump(cache_data, f)
            logger.debug("✅ CSV do ZARC salvo no cache")
        except Exception as e:
            logger.warning(f"⚠️ Erro ao salvar cache: {e}")
    
    def _download_zarc_csv(self) -> Optional[pd.DataFrame]:
        """
        Baixa o CSV do ZARC do portal de Dados Abertos do MAPA.
        ✅ MELHORADO: Usa cache persistente e múltiplas URLs de fallback.
        
        Returns:
            DataFrame com dados do ZARC ou None se falhar
        """
        # ✅ NOVO: Tenta carregar do cache primeiro
        cached_df = self._load_cached_csv()
        if cached_df is not None:
            self._csv_df = cached_df
            return cached_df
        
        # Se não tem cache válido, tenta baixar
        for url in self.csv_urls:
            try:
                logger.info(f"📥 Baixando CSV do ZARC de {url}...")
                response = requests.get(url, timeout=self.timeout)
                
                if response.status_code == 200:
                    # Tenta diferentes encodings
                    encodings = ['utf-8', 'latin-1', 'iso-8859-1']
                    df = None
                    
                    for encoding in encodings:
                        try:
                            csv_data = StringIO(response.text)
                            df = pd.read_csv(csv_data, encoding=encoding, low_memory=False, sep=',')
                            break
                        except UnicodeDecodeError:
                            continue
                    
                    if df is None or df.empty:
                        logger.warning("⚠️ CSV do ZARC vazio ou não pôde ser lido")
                        continue
                    
                    # ✅ NOVO: Salva no cache persistente
                    self._save_csv_cache(df)
                    self._csv_df = df
                    self._csv_last_download = datetime.now()
                    
                    logger.info(f"✅ CSV do ZARC baixado: {len(df)} registros")
                    return df
                else:
                    logger.warning(f"⚠️ ZARC CSV retornou {response.status_code} de {url}")
                    
            except Exception as e:
                logger.warning(f"⚠️ Erro ao baixar CSV do ZARC de {url}: {e}")
                continue
        
        logger.error("❌ Falha ao baixar CSV do ZARC de todas as URLs")
        return None
    
    def _normalize_product_name(self, product: str) -> List[str]:
        """
        ✅ NOVO: Normaliza nome do produto para melhor matching.
        
        Returns:
            Lista de variações possíveis do nome do produto
        """
        product_lower = product.lower().strip()
        variations = [product_lower]
        
        # Busca no mapeamento de normalização
        for key, values in PRODUCT_NORMALIZATION.items():
            if product_lower in values or any(v in product_lower for v in values):
                variations.extend(values)
                break
        
        return list(set(variations))  # Remove duplicatas
    
    @lru_cache(maxsize=100)  # ✅ MELHORADO: Cache aumentado de 10 para 100
    def get_planting_windows(
        self,
        product: str,
        state: str,
        cultivar: Optional[str] = None
    ) -> Optional[List[Dict]]:
        """
        Busca janelas de plantio do ZARC para um produto e estado.
        ✅ MELHORADO: Normalização melhorada de produtos e cache persistente.
        
        Args:
            product: Nome do produto (ex: 'Tomate', 'Soja', 'Milho')
            state: Código do estado (ex: 'SP', 'MG', 'GO')
            cultivar: Nome da cultivar (opcional)
        
        Returns:
            Lista de dicionários com janelas de plantio ou None se falhar
        """
        try:
            # ✅ MELHORADO: Usa CSV em cache se disponível
            if self._csv_df is None:
                df = self._download_zarc_csv()
            else:
                df = self._csv_df
            
            if df is None or df.empty:
                logger.warning("⚠️ CSV do ZARC não disponível")
                # ✅ NOVO: Tenta fallback quando CSV não está disponível
                if HAS_CALENDAR_FALLBACK:
                    logger.info(f"🔄 Tentando fallback para calendar.py (CSV indisponível) para {product}/{state}")
                    try:
                        fallback_data = get_planting_window(product, state)
                        if fallback_data and fallback_data.get('ideal'):
                            logger.info(f"✅ Fallback calendar.py encontrou dados para {product}/{state}")
                            return [{
                                "product": product,
                                "state": state,
                                "data": {
                                    "ideal_months": fallback_data.get('ideal', []),
                                    "risk_months": fallback_data.get('risk', []),
                                    "notes": fallback_data.get('notes', ''),
                                    "source": "calendar.py (fallback)"
                                },
                                "source": "calendar.py (fallback - CSV ZARC indisponível)"
                            }]
                    except Exception as fallback_error:
                        logger.debug(f"Fallback calendar.py falhou: {fallback_error}")
                return None
            
            # ✅ MELHORADO: Normalização melhorada de produtos
            product_variations = self._normalize_product_name(product)
            state_upper = state.upper().strip()
            
            # Filtra por produto e estado
            filtered = df.copy()
            
            # ✅ MELHORADO: Busca mais robusta por colunas
            product_col = None
            state_col = None
            
            for col in df.columns:
                col_lower = col.lower()
                if not product_col and ('cultura' in col_lower or 'produto' in col_lower or 'cultivar' in col_lower or 'nome' in col_lower):
                    product_col = col
                if not state_col and ('uf' in col_lower or 'estado' in col_lower or 'unidade' in col_lower or 'sigla' in col_lower):
                    state_col = col
            
            if not product_col or not state_col:
                logger.warning(f"⚠️ Estrutura do CSV do ZARC não reconhecida. Colunas: {list(df.columns)[:10]}")
                return None
            
            # ✅ MELHORADO: Busca por qualquer variação do nome do produto
            if product_variations:
                product_filter = filtered[product_col].str.lower().str.contains('|'.join(product_variations), na=False, regex=True)
                filtered = filtered[product_filter]
            
            if state_upper:
                # Tenta match exato primeiro, depois contém
                state_filter = (filtered[state_col].str.upper() == state_upper) | \
                              (filtered[state_col].str.upper().str.contains(state_upper, na=False))
                filtered = filtered[state_filter]
            
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
                logger.debug(f"⚠️ Nenhuma janela de plantio encontrada no CSV para {product}/{state}")
                # ✅ NOVO: Tenta fallback para calendar.py
                if HAS_CALENDAR_FALLBACK:
                    logger.info(f"🔄 Tentando fallback para calendar.py para {product}/{state}")
                    fallback_data = get_planting_window(product, state)
                    if fallback_data and fallback_data.get('ideal'):
                        return [{
                            "product": product,
                            "state": state,
                            "data": {
                                "ideal_months": fallback_data.get('ideal', []),
                                "risk_months": fallback_data.get('risk', []),
                                "notes": fallback_data.get('notes', ''),
                                "source": "calendar.py (fallback)"
                            },
                            "source": "calendar.py (fallback - CSV ZARC indisponível)"
                        }]
                return None
            
            # ✅ MELHORADO: Formatação mais estruturada dos resultados
            results = []
            for _, row in filtered.iterrows():
                result = {
                    "product": row.get(product_col, product),
                    "state": row.get(state_col, state),
                    "data": row.to_dict(),
                    "source": "ZARC CSV (MAPA)"
                }
                results.append(result)
            
            logger.info(f"✅ Encontradas {len(results)} janelas de plantio para {product}/{state}")
            return results
            
        except Exception as e:
            logger.error(f"❌ Erro ao buscar janelas de plantio ZARC: {e}", exc_info=True)
            # ✅ NOVO: Tenta fallback mesmo em caso de erro
            if HAS_CALENDAR_FALLBACK:
                try:
                    logger.info(f"🔄 Tentando fallback para calendar.py após erro para {product}/{state}")
                    fallback_data = get_planting_window(product, state)
                    if fallback_data and fallback_data.get('ideal'):
                        return [{
                            "product": product,
                            "state": state,
                            "data": {
                                "ideal_months": fallback_data.get('ideal', []),
                                "risk_months": fallback_data.get('risk', []),
                                "notes": fallback_data.get('notes', ''),
                                "source": "calendar.py (fallback)"
                            },
                            "source": "calendar.py (fallback - erro ao acessar CSV ZARC)"
                        }]
                except Exception as fallback_error:
                    logger.debug(f"Fallback também falhou: {fallback_error}")
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

