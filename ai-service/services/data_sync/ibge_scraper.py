# ai-service/services/data_sync/ibge_scraper.py
"""
ETL para dados de produção agrícola do IBGE SIDRA.

Fonte: API REST do IBGE SIDRA
URL: https://apisidra.ibge.gov.br/

Dados coletados:
- Produção (quantidade produzida)
- Área plantada
- Área colhida
- Rendimento médio
- Valor da produção

Tabela principal: 1612 (Lavouras Temporárias)
"""

import requests
import pandas as pd
import math
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import logging
import time

from utils.database import get_engine
from sqlalchemy import text

# Tenta importar sidrapy (biblioteca oficial para IBGE SIDRA)
try:
    import sidrapy
    SIDRAPY_AVAILABLE = True
except ImportError:
    SIDRAPY_AVAILABLE = False
    logger.warning("⚠️ sidrapy não instalado. Instale com: pip install sidrapy")

logger = logging.getLogger(__name__)


class IBGEScraper:
    """
    Scraper de dados de produção agrícola do IBGE SIDRA.
    """
    
    def __init__(self):
        self.engine = get_engine()
        self.base_url = "https://apisidra.ibge.gov.br/values"
        
        # Tabela 1612: Levantamento Sistemático da Produção Agrícola (Lavouras Temporárias)
        # Tabela 5457: Área plantada, área colhida, quantidade produzida (alternativa)
        self.table_id = "1612"  # Tabela principal
        self.table_alt = "5457"  # Tabela alternativa
        
        # Mapeamento de produtos IBGE (códigos corretos conforme documentação oficial)
        # Fonte: Lista de Produtos e Serviços da Agropecuária e Pesca (PRODLIST-Agro/Pesca)
        # URL: https://cnae.ibge.gov.br/classificacoes/por-tema/produtos/lista-de-produtos/prodlist-agro-pesca.html
        # Explorador de Metadados: https://fish.dkko.me/classificacoes/81
        self.product_codes = {
            'Tomate': '2715',  # Tomate - Classificação 81 (verificado via API)
            'Soja': '2701',    # Soja (em grão) - Classificação 81
            'Milho': '2713'    # Milho (em grão) - Classificação 81
        }
        
        # Variáveis disponíveis na tabela 1612
        # Usa 'all' para buscar todas as variáveis de uma vez
        self.variables = {
            'all': 'all'  # Busca todas as variáveis de uma vez
        }
        
        logger.info("✅ IBGEScraper iniciado")
    
    def fetch_production_data(
        self, 
        product: str, 
        year: Optional[int] = None,
        state_code: Optional[str] = None
    ) -> List[Dict]:
        """
        Busca dados de produção do IBGE SIDRA.
        
        Args:
            product: Nome do produto ('Tomate', 'Soja', 'Milho')
            year: Ano (padrão: ano atual - 1, pois dados do ano atual podem não estar disponíveis)
            state_code: Código UF (padrão: busca por estados principais)
            
        Returns:
            Lista de dicionários com dados de produção
        """
        if product not in self.product_codes:
            logger.warning(f"⚠️ Produto {product} não mapeado para IBGE")
            return []
        
        if year is None:
            # Usa ano anterior, pois dados do ano atual podem não estar disponíveis
            year = datetime.now().year - 1
        
        product_code = self.product_codes[product]
        
        all_data = []
        
        # Tenta usar sidrapy primeiro (mais confiável)
        if SIDRAPY_AVAILABLE:
            try:
                logger.debug(f"📥 Usando sidrapy para buscar {product} ({year})...")
                data_df = sidrapy.get_table(
                    table_code=self.table_id,
                    territorial_level='1',  # Brasil
                    ibge_territorial_code='all',
                    variable='all',
                    period=str(year),
                    classifications={'c81': product_code}
                )
                
                if not data_df.empty:
                    # Processa DataFrame do sidrapy
                    processed = self._process_sidrapy_data(data_df, product, year)
                    if processed:
                        all_data.extend(processed)
                        logger.info(f"✅ IBGE (sidrapy): {len(processed)} registros coletados para {product}")
                        return all_data
                
            except Exception as e:
                logger.debug(f"⚠️ sidrapy falhou, tentando API direta: {e}")
        
        # Fallback: API direta
        # Se não especificou estado, busca pelos principais produtores
        if state_code is None:
            # Códigos IBGE dos principais estados produtores
            # 35=SP, 41=PR, 31=MG, 43=RS, 42=SC, 51=MT, 52=GO
            estados_principais = ['35', '41', '31', '43', '42', '51', '52']
        else:
            # Mapeia código UF para código IBGE
            uf_to_ibge = {
                'SP': '35', 'PR': '41', 'MG': '31', 'RS': '43', 'SC': '42',
                'MT': '51', 'GO': '52', 'MS': '50', 'BA': '29', 'PE': '26'
            }
            estados_principais = [uf_to_ibge.get(state_code.upper(), '1')]  # Default: Brasil
        
        try:
            # Busca dados primeiro pelo Brasil (n1/1), depois por estados se necessário
            # Variáveis principais: 109 (área plantada), 214 (quantidade produzida), 215 (valor da produção)
            variaveis_principais = ['109', '214', '215']  # Área plantada, Produção, Valor
            
            # Primeiro tenta Brasil (n1/1)
            nivel_geo_code = "1"  # Brasil
            for var_code in variaveis_principais:
                try:
                    url = f"{self.base_url}/t/{self.table_id}/n1/{nivel_geo_code}/v/{var_code}/p/{year}/c81/{product_code}"
                    
                    logger.debug(f"📥 {product} ({year}) - Brasil, Variável {var_code}...")
                    response = requests.get(url, timeout=30)
                    
                    if response.status_code != 200:
                        logger.debug(f"   ⚠️ Erro {response.status_code}")
                        continue
                    
                    try:
                        data = response.json()
                    except Exception as e:
                        logger.debug(f"   ⚠️ JSON inválido: {e}")
                        continue
                    
                    if not data or len(data) < 2:
                        continue
                    
                    # Processa dados
                    processed = self._process_ibge_data(data, product, year, nivel_geo_code)
                    if processed:
                        all_data.extend(processed)
                        logger.debug(f"   ✅ {len(processed)} registros coletados")
                    
                    # Rate limiting
                    time.sleep(0.3)
                    
                except Exception as e:
                    logger.debug(f"   ⚠️ Erro ao buscar variável {var_code}: {e}")
                    continue
            
            # Se não coletou dados do Brasil, tenta por estados principais
            if not all_data and state_code is None:
                logger.debug(f"   ℹ️ Nenhum dado do Brasil, tentando estados...")
                for estado_code in estados_principais:
                    for var_code in variaveis_principais:
                        try:
                            url = f"{self.base_url}/t/{self.table_id}/n1/{estado_code}/v/{var_code}/p/{year}/c81/{product_code}"
                            
                            logger.debug(f"📥 {product} ({year}) - Estado {estado_code}, Variável {var_code}...")
                            response = requests.get(url, timeout=30)
                            
                            if response.status_code != 200:
                                continue
                            
                            try:
                                data = response.json()
                            except:
                                continue
                            
                            if not data or len(data) < 2:
                                continue
                            
                            # Processa dados
                            processed = self._process_ibge_data(data, product, year, estado_code)
                            if processed:
                                all_data.extend(processed)
                                logger.debug(f"   ✅ {len(processed)} registros de {estado_code}")
                            
                            # Rate limiting
                            time.sleep(0.3)
                            
                        except Exception as e:
                            logger.debug(f"   ⚠️ Erro ao buscar {estado_code}/{var_code}: {e}")
                            continue
            
            # Rate limiting
            time.sleep(0.5)
            
            if all_data:
                logger.info(f"✅ IBGE: {len(all_data)} registros coletados para {product}")
            else:
                logger.info(f"ℹ️ IBGE: Nenhum dado coletado para {product}")
                logger.debug(f"   💡 Nota: API IBGE pode não ter dados disponíveis. Verifique documentação oficial.")
            
        except Exception as e:
            logger.error(f"❌ Erro ao buscar dados IBGE: {e}")
        
        return all_data
    
    def _process_ibge_data(
        self, 
        data: List, 
        product: str, 
        year: int,
        estado_ibge_code: Optional[str] = None
    ) -> List[Dict]:
        """
        Processa dados brutos do IBGE SIDRA.
        
        Args:
            data: Lista de dicionários retornados pela API
            product: Nome do produto
            year: Ano dos dados
            
        Returns:
            Lista de registros processados (uma entrada por variável)
        """
        if not data or len(data) < 2:
            return []
        
        # Primeira linha é cabeçalho com nomes das colunas
        headers = data[0] if isinstance(data[0], dict) else {}
        
        # Identifica índices das colunas importantes
        # Estrutura típica: D1C (código estado), D1N (nome estado), D2C (código variável), D2N (nome variável), V (valor)
        records = []
        
        for row in data[1:]:  # Pula cabeçalho
            if not isinstance(row, dict):
                continue
            
            try:
                # Extrai estado (pode estar em D1C ou D1N)
                estado = row.get('D1C', '') or row.get('D1N', '') or 'BR'
                
                # Extrai variável (pode estar em D2C ou D2N)
                var_code = row.get('D2C', '')
                var_name = row.get('D2N', '')
                
                # Extrai valor
                valor_str = row.get('V', '0') or '0'
                
                # Ignora valores inválidos
                if valor_str in ['...', '-', 'X', '']:
                    continue
                
                # Tenta converter valor
                try:
                    # Remove espaços e converte vírgula para ponto
                    valor_str_clean = str(valor_str).replace(' ', '').replace(',', '.').strip()
                    if not valor_str_clean or valor_str_clean == '...':
                        continue
                    valor = float(valor_str_clean)
                except:
                    continue
                
                if valor <= 0 or math.isnan(valor) or math.isinf(valor):
                    continue
                
                # Normaliza código de estado
                if estado_ibge_code:
                    # Se temos código IBGE, converte para UF
                    estado_code = self._ibge_code_to_uf(estado_ibge_code)
                else:
                    estado_code = self._normalize_state_code(estado)
                
                # Normaliza nome da variável
                variable_name = self._normalize_variable_name(var_name, var_code)
                
                if not variable_name:
                    continue
                
                # Cria registro
                record = {
                    "product_name": product,
                    "state_code": estado_code,
                    "variable": variable_name,
                    "value": valor,
                    "year": year,
                    "source": "IBGE",
                    "data_date": datetime(year, 12, 31).strftime('%Y-%m-%dT%H:%M:%S.000Z')
                }
                
                records.append(record)
                
            except Exception as e:
                logger.debug(f"⚠️ Erro ao processar linha IBGE: {e}")
                continue
        
        return records
    
    def _normalize_variable_name(self, var_name: str, var_code: str) -> Optional[str]:
        """
        Normaliza nome da variável do IBGE para formato padrão.
        
        Args:
            var_name: Nome da variável do IBGE
            var_code: Código da variável
            
        Returns:
            Nome normalizado ou None se não reconhecido
        """
        if not var_name:
            return None
        
        var_upper = var_name.upper()
        
        # Mapeamento de nomes IBGE para nossos nomes padrão
        if 'PRODUÇÃO' in var_upper or 'PRODUCAO' in var_upper or 'QUANTIDADE PRODUZIDA' in var_upper:
            return 'producao'
        elif 'ÁREA PLANTADA' in var_upper or 'AREA PLANTADA' in var_upper:
            return 'area_plantada'
        elif 'ÁREA COLHIDA' in var_upper or 'AREA COLHIDA' in var_upper:
            return 'area_colhida'
        elif 'RENDIMENTO' in var_upper or 'PRODUTIVIDADE' in var_upper:
            return 'rendimento'
        elif 'VALOR' in var_upper and 'PRODUÇÃO' in var_upper:
            return 'valor_producao'
        
        return None
    
    def _ibge_code_to_uf(self, ibge_code: str) -> str:
        """Converte código IBGE para código UF."""
        ibge_to_uf = {
            '11': 'RO', '12': 'AC', '13': 'AM', '14': 'RR', '15': 'PA',
            '16': 'AP', '17': 'TO', '21': 'MA', '22': 'PI', '23': 'CE',
            '24': 'RN', '25': 'PB', '26': 'PE', '27': 'AL', '28': 'SE',
            '29': 'BA', '31': 'MG', '32': 'ES', '33': 'RJ', '35': 'SP',
            '41': 'PR', '42': 'SC', '43': 'RS', '50': 'MS', '51': 'MT',
            '52': 'GO', '53': 'DF', '1': 'BR'
        }
        return ibge_to_uf.get(str(ibge_code), 'BR')
    
    def _normalize_state_code(self, estado: str) -> str:
        """Normaliza código de estado do IBGE."""
        # Mapeamento de nomes para códigos
        state_map = {
            'Rondônia': 'RO', 'Acre': 'AC', 'Amazonas': 'AM',
            'Roraima': 'RR', 'Pará': 'PA', 'Amapá': 'AP',
            'Tocantins': 'TO', 'Maranhão': 'MA', 'Piauí': 'PI',
            'Ceará': 'CE', 'Rio Grande do Norte': 'RN', 'Paraíba': 'PB',
            'Pernambuco': 'PE', 'Alagoas': 'AL', 'Sergipe': 'SE',
            'Bahia': 'BA', 'Minas Gerais': 'MG', 'Espírito Santo': 'ES',
            'Rio de Janeiro': 'RJ', 'São Paulo': 'SP', 'Paraná': 'PR',
            'Santa Catarina': 'SC', 'Rio Grande do Sul': 'RS',
            'Mato Grosso do Sul': 'MS', 'Mato Grosso': 'MT',
            'Goiás': 'GO', 'Distrito Federal': 'DF',
            'Brasil': 'BR'
        }
        
        # Se já é código, retorna
        if len(estado) == 2 and estado.isalpha():
            return estado.upper()
        
        # Tenta mapear nome
        for nome, codigo in state_map.items():
            if nome.upper() in estado.upper() or estado.upper() in nome.upper():
                return codigo
        
        return 'BR'  # Default
    
    def _process_sidrapy_data(self, df: pd.DataFrame, product: str, year: int) -> List[Dict]:
        """
        Processa DataFrame retornado pelo sidrapy.
        
        Args:
            df: DataFrame do sidrapy
            product: Nome do produto
            year: Ano dos dados
            
        Returns:
            Lista de registros processados
        """
        records = []
        
        try:
            for _, row in df.iterrows():
                try:
                    # Extrai informações do DataFrame
                    # Estrutura típica do sidrapy varia, mas geralmente tem colunas como:
                    # 'D1C', 'D1N', 'D2C', 'D2N', 'V', etc.
                    
                    estado = str(row.get('D1N', 'BR') or row.get('D1C', 'BR'))
                    var_name = str(row.get('D2N', '') or '')
                    valor = row.get('V', 0)
                    
                    # Converte valor
                    try:
                        if pd.isna(valor) or str(valor) in ['...', '-', 'X', '']:
                            continue
                        valor_float = float(valor)
                    except:
                        continue
                    
                    if valor_float <= 0:
                        continue
                    
                    # Normaliza
                    estado_code = self._normalize_state_code(estado)
                    variable_name = self._normalize_variable_name(var_name, '')
                    
                    if not variable_name:
                        continue
                    
                    record = {
                        "product_name": product,
                        "state_code": estado_code,
                        "variable": variable_name,
                        "value": valor_float,
                        "year": year,
                        "source": "IBGE",
                        "data_date": datetime(year, 12, 31).strftime('%Y-%m-%dT%H:%M:%S.000Z')
                    }
                    
                    records.append(record)
                    
                except Exception as e:
                    logger.debug(f"⚠️ Erro ao processar linha sidrapy: {e}")
                    continue
        
        except Exception as e:
            logger.warning(f"⚠️ Erro ao processar DataFrame sidrapy: {e}")
        
        return records
    
    def fetch_all_products(self, year: Optional[int] = None, years_back: int = 2) -> List[Dict]:
        """
        Busca dados de todos os produtos para os últimos N anos.
        
        Args:
            year: Ano específico (padrão: ano atual - 1, pois dados do ano atual podem não estar disponíveis)
            years_back: Quantos anos de histórico buscar
            
        Returns:
            Lista consolidada de todos os dados
        """
        if year is None:
            # Busca ano anterior, pois dados do ano atual podem não estar disponíveis
            year = datetime.now().year - 1
        
        all_data = []
        
        for product in self.product_codes.keys():
            logger.info(f"📊 Coletando dados IBGE para {product}...")
            
            # Busca para cada ano (do mais antigo para o mais recente)
            for y in range(year - years_back + 1, year + 1):
                try:
                    product_data = self.fetch_production_data(product, year=y)
                    if product_data:
                        all_data.extend(product_data)
                        logger.info(f"   ✅ {product} ({y}): {len(product_data)} registros")
                    else:
                        logger.debug(f"   ℹ️ {product} ({y}): Nenhum dado disponível")
                    
                    # Rate limiting entre anos
                    time.sleep(0.5)
                    
                except Exception as e:
                    logger.warning(f"⚠️ Erro ao buscar {product} ({y}): {e}")
                    continue
        
        return all_data
    
    def save_to_database(self, data: List[Dict]) -> int:
        """
        Salva dados de produção IBGE no banco.
        
        Cria tabela se não existir:
        - IBGEProduction (product_name, state_code, variable, value, year, source)
        
        Args:
            data: Lista de registros para salvar
            
        Returns:
            Número de registros salvos
        """
        if not data:
            return 0
        
        saved_count = 0
        
        try:
            with self.engine.begin() as conn:
                # Cria tabela se não existir
                create_table_sql = text("""
                    CREATE TABLE IF NOT EXISTS "IBGEProduction" (
                        id SERIAL PRIMARY KEY,
                        product_name TEXT NOT NULL,
                        state_code TEXT NOT NULL,
                        variable TEXT NOT NULL,
                        value DECIMAL(15, 2) NOT NULL,
                        year INTEGER NOT NULL,
                        source TEXT DEFAULT 'IBGE',
                        data_date TIMESTAMP NOT NULL,
                        sync_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE(product_name, state_code, variable, year)
                    );
                    
                    CREATE INDEX IF NOT EXISTS idx_ibge_product ON "IBGEProduction"(product_name);
                    CREATE INDEX IF NOT EXISTS idx_ibge_state ON "IBGEProduction"(state_code);
                    CREATE INDEX IF NOT EXISTS idx_ibge_year ON "IBGEProduction"(year);
                """)
                
                conn.execute(create_table_sql)
                logger.debug("✅ Tabela IBGEProduction verificada/criada")
                
                # Insere dados
                for record in data:
                    try:
                        upsert_sql = text("""
                            INSERT INTO "IBGEProduction" 
                            (product_name, state_code, variable, value, year, source, data_date, sync_timestamp)
                            VALUES 
                            (:product, :state, :variable, :value, :year, :source, :date, NOW())
                            ON CONFLICT (product_name, state_code, variable, year)
                            DO UPDATE SET
                                value = EXCLUDED.value,
                                sync_timestamp = NOW()
                        """)
                        
                        conn.execute(upsert_sql, {
                            "product": record["product_name"],
                            "state": record["state_code"],
                            "variable": record["variable"],
                            "value": float(record["value"]),
                            "year": record["year"],
                            "source": record.get("source", "IBGE"),
                            "date": record["data_date"]
                        })
                        
                        saved_count += 1
                    
                    except Exception as e:
                        logger.warning(f"⚠️ Erro ao salvar registro IBGE: {e}")
                        continue
                
                logger.info(f"💾 Salvos {saved_count}/{len(data)} registros na tabela IBGEProduction")
        
        except Exception as e:
            logger.error(f"❌ Erro crítico ao salvar dados IBGE: {e}")
        
        return saved_count
    
    def run_etl(self, years_back: int = 2) -> Dict:
        """
        Executa ETL completo de dados IBGE.
        
        ⚠️ NOTA: API IBGE SIDRA pode ter limitações. 
        Se não coletar dados, pode ser necessário:
        - Verificar documentação oficial atualizada
        - Usar outra tabela (ex: 5457)
        - Buscar dados por estado específico
        - Considerar scraping do portal web
        
        Args:
            years_back: Quantos anos de histórico coletar (padrão: 2)
            
        Returns:
            Dict com resultado do ETL
        """
        logger.info("="*60)
        logger.info("INICIANDO ETL IBGE (PRODUÇÃO AGRÍCOLA)")
        logger.info("="*60)
        logger.warning("⚠️ API IBGE pode ter limitações. Se não coletar dados, verifique documentação oficial.")
        
        try:
            # Coleta dados de todos os produtos
            # Usa ano anterior como padrão (dados do ano atual podem não estar disponíveis)
            current_year = datetime.now().year
            data = self.fetch_all_products(year=current_year - 1, years_back=years_back)
            
            # Salva no banco
            saved_count = 0
            if data:
                saved_count = self.save_to_database(data)
                logger.info(f"✅ IBGE: {saved_count} registros salvos no banco")
            else:
                logger.warning("⚠️ IBGE: Nenhum dado coletado. API pode não ter dados disponíveis para esses produtos.")
                logger.info("💡 Sugestão: Verifique documentação IBGE ou considere outras fontes de dados.")
            
            return {
                'success': True,
                'records': len(data),
                'saved': saved_count,
                'source': 'IBGE',
                'timestamp': datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%S.000Z'),
                'note': 'API pode ter limitações. Verifique documentação oficial se não coletar dados.'
            }
            
        except Exception as e:
            logger.error(f"❌ Erro no ETL IBGE: {e}")
            return {
                'success': False,
                'error': str(e),
                'records': 0,
                'saved': 0,
                'note': 'Erro ao acessar API IBGE. Verifique documentação oficial.'
            }


# Instância singleton
ibge_scraper = IBGEScraper()
