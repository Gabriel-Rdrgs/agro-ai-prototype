# services/data_sync/market_scraper.py
"""
Scraper de preços de mercado (CEASA-PR, Agrolink, CONAB, Outras CEASAs).

FONTES SUPORTADAS:
- CEASA-PR (Curitiba) - ✅ Corrigido
- Agrolink (Nacional) - ✅ Corrigido
- CONAB (Portal oficial) - ✅ Novo
- Outras CEASAs (SP, MG, RJ, RS) - ✅ Novo

CORREÇÕES APLICADAS (Dezembro 2025):
- CEASA-PR: Removido verify=False (inseguro), parsing robusto, melhor tratamento de erros
- Agrolink: Parsing dinâmico de colunas, validação melhorada, tratamento de erros robusto
- CONAB: Scraping do portal oficial com múltiplas URLs de fallback
- Outras CEASAs: Suporte a CEAGESP (SP), CEASA-MG, CEASA-RJ, CEASA-RS
- Persistência: Método _save_to_ceasa_price_table() para salvar todos os dados
"""

import requests
import pandas as pd
import io
import time
import math
import re
import os
import tempfile
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import logging

from config.constants import UNIT_WEIGHTS, PRODUCER_MARGINS
from utils.database import get_engine
from sqlalchemy import text

logger = logging.getLogger(__name__)


class MarketScraper:
    """
    Scraper de preços agrícolas de fontes públicas.
    """
    
    def __init__(self):
        self.engine = get_engine()
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                         "AppleWebKit/537.36 (KHTML, like Gecko) "
                         "Chrome/91.0.4472.124 Safari/537.36"
        }
        
        # URLs das CEASAs principais
        self.ceasa_urls = {
            'PR': "https://celepar7.pr.gov.br/ceasa/hoje.asp",
            'SP': "https://www.ceagesp.gov.br/cotacoes",  # CEAGESP
            'MG': "https://minas1.ceasa.mg.gov.br/cotacoes",  # CEASA-MG
            'RJ': "https://www.ceasa.rj.gov.br/cotacoes",  # CEASA-RJ
            'RS': "https://www.ceasa.rs.gov.br/cotacoes",  # CEASA-RS
        }
        
        self.agrolink_urls = {
            'Tomate': "https://www.agrolink.com.br/cotacoes/ceasa/hortalicas/tomate/",
            'Soja': "https://www.agrolink.com.br/cotacoes/graos/soja/",
            'Milho': "https://www.agrolink.com.br/cotacoes/graos/milho/"
        }
        
        self.target_states = [
            '(SP)', '(MG)', '(ES)', '(RJ)',
            '(RS)', '(SC)', '(PR)',
            '(GO)', '(MT)', '(MS)', '(DF)',
            '(BA)', '(PE)', '(CE)', '(MA)', '(RN)'
        ]
        
        # Mapeamento de produtos para normalização
        self.product_keywords = {
            'Tomate': ['tomate', 'TOMATE', 'Tomate'],
            'Soja': ['soja', 'SOJA', 'Soja'],
            'Milho': ['milho', 'MILHO', 'Milho']
        }
        
        logger.info("✅ MarketScraper iniciado")
    
    def _is_valid_number(self, num) -> bool:
        """Valida se número é válido e positivo"""
        try:
            val = float(num)
            return not (math.isnan(val) or math.isinf(val) or val <= 0)
        except:
            return False
    
    def _normalize_price_to_kg(self, product_name: str, raw_price: float) -> float:
        """Converte Caixa/Saca para Kg"""
        weight = UNIT_WEIGHTS.get(product_name, 1.0)
        if raw_price > 10.0:
            return round(raw_price / weight, 2)
        return raw_price
    
    def _update_opportunity_table(
        self, 
        product: str, 
        state: str, 
        price_kg: float
    ) -> None:
        """
        Atualiza preços na tabela Opportunity E salva no PriceHistory.
        
        IMPORTANTE: Salva TUDO em R$/kg para consistência.
        O price_kg já vem normalizado (preço por kg do mercado).
        """
        # ✅ CORREÇÃO: price_kg já está em R$/kg (normalizado)
        # Não precisa multiplicar por weight novamente!
        
        # Preço de mercado (já em R$/kg)
        market_price_kg = price_kg
        
        # Margem variável por produto (produtor recebe % do preço de mercado)
        margin_factor = PRODUCER_MARGINS.get(product, 0.70)
        producer_price_kg = market_price_kg * margin_factor
        
        # Prepara valores decimais (arredondando para evitar erros de float)
        # ✅ AGORA: Tudo em R$/kg (consistente)
        buy_price = round(producer_price_kg, 2)  # Preço que produtor recebe (R$/kg)
        sell_price = round(market_price_kg, 2)   # Preço de venda no mercado (R$/kg)

        # ✅ PERFORMANCE: Retry logic + delay para evitar timeouts
        max_retries = 3
        retry_delay = 1  # segundos
        
        # ✅ BATCH: Pequeno delay antes de tentar (evita sobrecarga simultânea)
        time.sleep(0.1)  # 100ms delay
        
        for attempt in range(max_retries):
            try:
                with self.engine.begin() as conn:
                    # 1. Verifica se a Oportunidade já existe
                    check_sql = text(
                        'SELECT id FROM "Opportunity" WHERE product = :p AND state = :s'
                    )
                    existing = conn.execute(check_sql, {"p": product, "s": state}).fetchone()
                    
                    if existing:
                        opp_id = existing[0]
                        
                        # 2. ✅ NOVO: Salvar no Histórico ANTES de atualizar
                        # ✅ CORREÇÃO: PriceHistory também salva em R$/kg (consistente)
                        history_sql = text("""
                            INSERT INTO "PriceHistory" ("opportunityId", "price", "createdAt")
                            VALUES (:oid, :price, NOW())
                        """)
                        conn.execute(history_sql, {"oid": opp_id, "price": sell_price})  # sell_price já está em kg
                        
                        # 3. Atualiza a tabela principal (Snapshot atual)
                        update_sql = text("""
                            UPDATE "Opportunity"
                            SET "buyPrice" = :buy,
                                "sellPrice" = :sell,
                                "climate" = 'Atualizado via Mercado Real',
                                "createdAt" = NOW() 
                            WHERE id = :oid
                        """)
                        conn.execute(update_sql, {
                            "buy": buy_price,
                            "sell": sell_price,
                            "oid": opp_id
                        })
                        
                        # ✅ Sucesso - sai do loop de retry
                        logger.debug(f"🔄 {product}/{state}: Histórico salvo + Atualizado p/ R$ {sell_price}")
                        return  # ✅ Sucesso - retorna imediatamente
                    
                    else:
                        # 4. Se não existe, cria do zero (Primeira carga)
                        # Lat/Lng genéricos (-15, -50) apenas para constar no mapa inicialmente
                        create_sql = text("""
                            INSERT INTO "Opportunity" 
                            ("product", "category", "city", "state", "lat", "lng", 
                             "buyPrice", "sellPrice", "sellLocation", "riskLevel", "bestRoute", "volume", "climate")
                            VALUES 
                            (:p, 'Grãos/Horti', 'Capital', :s, -15.0, -50.0, 
                             :buy, :sell, 'Ceasa Local', 1, false, 0, 'Atualizado via Mercado Real')
                        """)
                        conn.execute(create_sql, {
                            "p": product, "s": state, "buy": buy_price, "sell": sell_price
                        })

                        logger.info(f"✨ Nova Oportunidade Criada: {product} em {state}")
                        return  # ✅ Sucesso - retorna imediatamente
            
            except Exception as e:
                if attempt < max_retries - 1:
                    logger.warning(f"⚠️ Tentativa {attempt + 1}/{max_retries} falhou para {product}/{state}: {e}. Aguardando {retry_delay}s...")
                    time.sleep(retry_delay)
                    retry_delay *= 2  # Backoff exponencial
                else:
                    logger.error(f"❌ Erro crítico ao persistir {product}/{state} após {max_retries} tentativas: {e}")
                    # Não re-raise para não interromper o ETL completo
    
    def fetch_ceasa_pr(self) -> List[Dict]:
        """
        Scraping CEASA-PR oficial (Curitiba).
        
        ✅ CORREÇÕES APLICADAS:
        - Removido verify=False (inseguro)
        - Melhor tratamento de erros
        - Parsing mais robusto de colunas
        - Validação de dados melhorada
        """
        logger.info("🚜 [PR] Conectando CEASA-PR (Curitiba)...")
        
        prices = []
        today = datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%S.000Z')
        
        try:
            response = requests.get(
                self.ceasa_urls['PR'], 
                headers=self.headers, 
                verify=True,  # ✅ CORRIGIDO: Segurança
                timeout=20  # ✅ AUMENTADO: Mais tempo para resposta lenta
            )
            
            if response.status_code != 200:
                logger.warning(f"⚠️ CEASA-PR retornou status {response.status_code}")
                return []
            
            # ✅ CORRIGIDO: Encoding já aplicado na resposta, não precisa passar para pd.read_html
            response.encoding = 'latin-1'  # CEASA-PR usa latin-1
            
            # Tenta extrair tabelas HTML
            try:
                html_buffer = io.StringIO(response.text)
                # ✅ CORRIGIDO: Remove encoding do pd.read_html (já está decodificado)
                tables = pd.read_html(html_buffer, header=0)
            except Exception as e:
                logger.warning(f"⚠️ Erro ao extrair tabelas HTML: {e}")
                # Tenta com encoding explícito no StringIO
                try:
                    html_buffer = io.StringIO(response.content.decode('latin-1'))
                    tables = pd.read_html(html_buffer, header=0)
                except Exception as e2:
                    logger.warning(f"⚠️ Erro ao extrair tabelas (tentativa 2): {e2}")
                    return []
            
            if not tables:
                logger.warning("⚠️ CEASA-PR: Nenhuma tabela encontrada")
                return []
            
            # ✅ CORRIGIDO: Encontra tabela com dados (pula vazias)
            df = None
            for t in tables:
                if t.empty:
                    continue  # Pula tabelas vazias
                
                cols_str = " ".join([str(c).upper() for c in t.columns])
                # Procura por tabela com produto e algum indicador de preço
                if "PRODUTO" in cols_str and ("PREÇO" in cols_str or "VALOR" in cols_str or "CURITIBA" in cols_str):
                    df = t
                    break
            
            # Se não encontrou, usa a primeira tabela não vazia
            if df is None:
                for t in tables:
                    if not t.empty and len(t) > 0:
                        df = t
                        break
            
            if df is None or df.empty:
                logger.warning("⚠️ CEASA-PR: Tabela de produtos não encontrada ou vazia")
                return []
            
            # ✅ CORRIGIDO: Remove primeira linha se for cabeçalho duplicado
            first_row_str = " ".join([str(df.iloc[0, i]) for i in range(min(3, len(df.columns)))])
            if "PRODUTO" in first_row_str.upper() or "VARIEDADE" in first_row_str.upper():
                df = df.iloc[1:].reset_index(drop=True)
                logger.debug("ℹ️ CEASA-PR: Primeira linha (cabeçalho duplicado) removida")
            
            # ✅ CORRIGIDO: Identifica colunas dinamicamente
            col_produto_idx = None
            colunas_preco = []  # Lista de todas as colunas de preço
            
            for idx, col in enumerate(df.columns):
                col_str = str(col).upper()
                if "PRODUTO" in col_str or "VARIEDADE" in col_str or "ITEM" in col_str:
                    col_produto_idx = idx
                # Identifica TODAS as colunas de preço (pode haver múltiplas - diferentes mercados)
                if "PREÇO" in col_str or "PRECO" in col_str or "VALOR" in col_str:
                    colunas_preco.append(idx)
                # Fallback: procura por "CURITIBA" se não encontrou preço
                if not colunas_preco and "CURITIBA" in col_str:
                    colunas_preco.append(idx)
            
            if col_produto_idx is None:
                # Fallback: primeira coluna
                col_produto_idx = 0
                logger.debug("ℹ️ CEASA-PR: Usando primeira coluna como produto")
            
            if not colunas_preco:
                # Fallback: tenta segunda coluna em diante
                for idx in range(1, min(6, len(df.columns))):
                    colunas_preco.append(idx)
                logger.debug(f"ℹ️ CEASA-PR: Usando colunas {colunas_preco} como preço (fallback)")
            
            # Processa linhas
            for idx, row in df.iterrows():
                try:
                    # Extrai nome do produto
                    prod_raw = str(row.iloc[col_produto_idx]).upper().strip()
                    
                    if not prod_raw or prod_raw == 'NAN' or prod_raw == 'NONE':
                        continue
                    
                    # Verifica se é produto de interesse
                    produto_match = None
                    for produto, keywords in self.product_keywords.items():
                        if any(kw in prod_raw for kw in keywords):
                            produto_match = produto
                            break
                    
                    if not produto_match:
                        continue
                    
                    # ✅ CORRIGIDO: Tenta extrair preço de todas as colunas de preço disponíveis
                    preco_val = None
                    
                    for col_preco_idx in colunas_preco:
                        try:
                            if col_preco_idx >= len(row):
                                continue
                            
                            preco_raw = row.iloc[col_preco_idx]
                            if pd.isna(preco_raw):
                                continue
                            
                            preco_str = str(preco_raw).replace('R$', '').replace(' ', '').strip()
                            
                            # Ignora valores inválidos
                            if preco_str in ['-', 'N/A', '---', '', 'nan', 'None', 'null']:
                                continue
                            
                            # ✅ NOVO: CEASA-PR pode retornar números inteiros (ex: 1800 = R$ 18,00)
                            # Tenta converter direto (pode ser número inteiro)
                            try:
                                preco_val = float(preco_str)
                                # Se for número muito grande (ex: 1800), pode ser centavos ou valor sem vírgula
                                # Assumimos que valores > 100 são em centavos ou precisam dividir por 100
                                if preco_val > 1000:
                                    preco_val = preco_val / 100  # Ex: 1800 -> 18.00
                                elif preco_val > 100:
                                    # Pode ser R$ 1,80 (180 centavos) ou R$ 18,00
                                    # Tenta dividir por 100, se ficar muito pequeno, mantém original
                                    test_val = preco_val / 100
                                    if test_val < 0.5:  # Se dividir por 100 fica muito pequeno, mantém original
                                        pass  # Mantém preco_val original
                                    else:
                                        preco_val = test_val
                                
                                break  # Encontrou preço válido, sai do loop
                            except ValueError:
                                # Se não for número, tenta parsear como string com vírgula
                                preco_str = preco_str.replace('.', '').replace(',', '.')
                                try:
                                    preco_val = float(preco_str)
                                    break
                                except:
                                    continue
                        
                        except (IndexError, TypeError):
                            continue
                    
                    # Se não encontrou preço válido em nenhuma coluna, pula
                    if preco_val is None:
                        continue
                    
                    if not self._is_valid_number(preco_val):
                        continue
                    
                    # Normaliza para kg
                    price_kg = self._normalize_price_to_kg(produto_match, preco_val)
                    
                    # Atualiza tabela Opportunity
                    self._update_opportunity_table(produto_match, "PR", price_kg)
                    
                    # Adiciona à lista
                    # Marca como histórico (dados reais coletados)
                    prices.append({
                        "ceasa_region": "PR",
                        "ceasa_name": "CEASA-PR Curitiba",
                        "product_name": produto_match,
                        "unit_type": "kg",
                        "price_min": round(price_kg * 0.9, 2),
                        "price_max": round(price_kg * 1.1, 2),
                        "price_avg": price_kg,
                        "price_date": today,
                        "is_projection": False,
                        "data_type": "historical"
                    })
                
                except Exception as e:
                    logger.debug(f"⚠️ Erro ao processar linha {idx} CEASA-PR: {e}")
                    continue
            
            logger.info(f"✅ CEASA-PR: {len(prices)} preços coletados")
            return prices
        
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Erro de conexão CEASA-PR: {e}")
            return []
        except Exception as e:
            logger.error(f"❌ Erro inesperado CEASA-PR: {e}", exc_info=True)
            return []
    
    def fetch_agrolink_national(self) -> List[Dict]:
        """
        Scraping Agrolink (todos os estados).
        
        ✅ CORREÇÕES APLICADAS:
        - Parsing robusto de colunas (não assume nomes fixos)
        - Melhor tratamento de erros
        - Validação de dados melhorada
        - Suporte a múltiplos formatos de tabela
        """
        logger.info("🌎 [Nacional] Conectando Agrolink...")
        
        all_prices = []
        today = datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%S.000Z')
        
        for produto, url in self.agrolink_urls.items():
            try:
                logger.debug(f"📡 Buscando {produto} no Agrolink...")
                
                response = requests.get(url, headers=self.headers, timeout=20)
                
                if response.status_code != 200:
                    logger.warning(f"⚠️ Agrolink retornou status {response.status_code} para {produto}")
                    continue
                
                # Tenta extrair tabelas HTML
                try:
                    html_buffer = io.StringIO(response.text)
                    # ✅ CORRIGIDO: Remove encoding (já está decodificado)
                    tables = pd.read_html(html_buffer, decimal=',', thousands='.')
                except Exception as e:
                    logger.warning(f"⚠️ Erro ao extrair tabelas Agrolink ({produto}): {e}")
                    # Tenta com encoding explícito
                    try:
                        html_buffer = io.StringIO(response.content.decode('utf-8'))
                        tables = pd.read_html(html_buffer, decimal=',', thousands='.')
                    except Exception as e2:
                        logger.warning(f"⚠️ Erro ao extrair tabelas Agrolink (tentativa 2): {e2}")
                        continue
                
                if not tables:
                    logger.warning(f"⚠️ Agrolink: Sem tabelas para {produto}")
                    continue
                
                # Usa primeira tabela (geralmente é a de preços)
                df = tables[0]
                
                if df.empty:
                    logger.warning(f"⚠️ Agrolink: Tabela vazia para {produto}")
                    continue
                
                # Identifica colunas dinamicamente
                col_ceasa_idx = None
                col_preco_idx = None
                
                for idx, col in enumerate(df.columns):
                    col_str = str(col).upper()
                    if "CEASA" in col_str or "LOCAL" in col_str or "MERCADO" in col_str:
                        col_ceasa_idx = idx
                    if "PREÇO" in col_str or "PRECO" in col_str or "VALOR" in col_str or "COTAÇÃO" in col_str:
                        col_preco_idx = idx
                
                # Fallback: tenta usar primeira e segunda coluna
                if col_ceasa_idx is None:
                    col_ceasa_idx = 0
                if col_preco_idx is None:
                    col_preco_idx = 1 if len(df.columns) > 1 else 0
                
                # Processa linhas
                for idx, row in df.iterrows():
                    try:
                        # Extrai local/CEASA
                        if col_ceasa_idx >= len(row):
                            continue
                        
                        local_raw = str(row.iloc[col_ceasa_idx]).upper().strip()
                        
                        if not local_raw or local_raw == 'NAN' or local_raw == 'NONE':
                            continue
                        
                        # Verifica se é estado de interesse
                        state_code = None
                        for uf in self.target_states:
                            if uf in local_raw:
                                state_code = uf.replace('(', '').replace(')', '')
                                break
                        
                        if not state_code:
                            continue  # Pula se não for estado de interesse
                        
                        # Extrai preço
                        if col_preco_idx >= len(row):
                            continue
                        
                        try:
                            price_raw = row.iloc[col_preco_idx]
                            
                            if pd.isna(price_raw):
                                continue
                            
                            if isinstance(price_raw, str):
                                # Remove R$, espaços, pontos de milhar, converte vírgula
                                price_str = price_raw.replace('R$', '').replace(' ', '').strip()
                                
                                # ✅ CORRIGIDO: Ignora valores inválidos
                                if price_str in ['-', 'N/A', '---', '', 'nan', 'None', 'null']:
                                    continue
                                
                                price_str = price_str.replace('.', '').replace(',', '.')
                                price_val = float(price_str)
                            else:
                                # Se não for string, tenta converter direto
                                if pd.isna(price_raw):
                                    continue
                                price_val = float(price_raw)
                        except (ValueError, TypeError) as e:
                            logger.debug(f"⚠️ Erro ao extrair preço linha {idx} ({produto}): {e}")
                            continue
                        
                        if not self._is_valid_number(price_val):
                            continue
                        
                        # Normaliza para kg
                        price_kg = self._normalize_price_to_kg(produto, price_val)
                        
                        # Atualiza tabela Opportunity
                        self._update_opportunity_table(produto, state_code, price_kg)
                        
                        # Adiciona à lista
                        all_prices.append({
                            "ceasa_region": state_code,
                            "ceasa_name": local_raw.strip(),
                            "product_name": produto,
                            "unit_type": "kg",
                            "price_min": round(price_kg * 0.95, 2),
                            "price_max": round(price_kg * 1.05, 2),
                            "price_avg": price_kg,
                            "price_date": today,
                            "is_projection": False,
                            "data_type": "historical"
                        })
                    
                    except Exception as e:
                        logger.debug(f"⚠️ Erro ao processar linha {idx} Agrolink ({produto}): {e}")
                        continue
                
                time.sleep(1.5)  # ✅ AUMENTADO: Rate limiting mais conservador
            
            except requests.exceptions.RequestException as e:
                logger.error(f"❌ Erro de conexão Agrolink ({produto}): {e}")
                continue
            except Exception as e:
                logger.error(f"❌ Erro inesperado Agrolink ({produto}): {e}", exc_info=True)
                continue
        
        logger.info(f"✅ Agrolink: {len(all_prices)} preços coletados")
        return all_prices
    
    def fetch_other_ceasas(self) -> List[Dict]:
        """
        Tenta coletar dados de outras CEASAs principais (SP, MG, RJ, RS).
        
        ✅ NOVO: Suporte a múltiplas CEASAs
        - CEAGESP (SP)
        - CEASA-MG
        - CEASA-RJ
        - CEASA-RS
        
        Estratégia: Tenta acessar cada CEASA, se falhar, continua para próxima.
        """
        logger.info("🏢 [Múltiplas CEASAs] Tentando coletar de outras CEASAs...")
        
        all_prices = []
        today = datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%S.000Z')
        
        # CEASAs para tentar (exceto PR que já tem método dedicado)
        ceasas_to_try = {
            'SP': {'name': 'CEAGESP São Paulo', 'url': self.ceasa_urls.get('SP')},
            'MG': {'name': 'CEASA-MG Belo Horizonte', 'url': self.ceasa_urls.get('MG')},
            'RJ': {'name': 'CEASA-RJ Rio de Janeiro', 'url': self.ceasa_urls.get('RJ')},
            'RS': {'name': 'CEASA-RS Porto Alegre', 'url': self.ceasa_urls.get('RS')},
        }
        
        for state_code, ceasa_info in ceasas_to_try.items():
            if not ceasa_info['url']:
                continue  # URL não configurada, pula
            
            try:
                logger.debug(f"🔍 Tentando {ceasa_info['name']}...")
                
                response = requests.get(
                    ceasa_info['url'],
                    headers=self.headers,
                    timeout=20,
                    verify=True
                )
                
                if response.status_code != 200:
                    logger.debug(f"⚠️ {ceasa_info['name']}: Status {response.status_code}")
                    continue
                
                # Tenta extrair tabelas
                try:
                    html_buffer = io.StringIO(response.text)
                    # ✅ CORRIGIDO: Remove encoding (já está decodificado)
                    tables = pd.read_html(html_buffer, header=0)
                except Exception as e:
                    logger.debug(f"⚠️ {ceasa_info['name']}: Erro ao extrair tabelas: {e}")
                    # Tenta com encoding explícito
                    try:
                        html_buffer = io.StringIO(response.content.decode('utf-8'))
                        tables = pd.read_html(html_buffer, header=0)
                    except Exception as e2:
                        logger.debug(f"⚠️ {ceasa_info['name']}: Erro ao extrair tabelas (tentativa 2): {e2}")
                        continue
                
                if not tables:
                    continue
                
                # Processa primeira tabela encontrada
                df = tables[0]
                
                if df.empty:
                    continue
                
                # Identifica colunas (produto e preço)
                col_produto_idx = None
                col_preco_idx = None
                
                for idx, col in enumerate(df.columns):
                    col_str = str(col).upper()
                    if any(word in col_str for word in ['PRODUTO', 'ITEM', 'MERCADORIA']):
                        col_produto_idx = idx
                    if any(word in col_str for word in ['PREÇO', 'PRECO', 'VALOR', 'COTAÇÃO']):
                        col_preco_idx = idx
                
                if col_produto_idx is None:
                    col_produto_idx = 0
                if col_preco_idx is None:
                    col_preco_idx = 1 if len(df.columns) > 1 else 0
                
                # Processa linhas
                for idx, row in df.iterrows():
                    try:
                        if col_produto_idx >= len(row):
                            continue
                        
                        prod_raw = str(row.iloc[col_produto_idx]).upper().strip()
                        
                        if not prod_raw or prod_raw in ['NAN', 'NONE', '']:
                            continue
                        
                        # Verifica produto
                        produto_match = None
                        for produto, keywords in self.product_keywords.items():
                            if any(kw in prod_raw for kw in keywords):
                                produto_match = produto
                                break
                        
                        if not produto_match:
                            continue
                        
                        # Extrai preço
                        if col_preco_idx >= len(row):
                            continue
                        
                        try:
                            preco_raw = row.iloc[col_preco_idx]
                            if pd.isna(preco_raw):
                                continue
                            
                            preco_str = str(preco_raw).replace('R$', '').replace(' ', '').strip()
                            
                            # ✅ CORRIGIDO: Ignora valores inválidos
                            if preco_str in ['-', 'N/A', '---', '', 'nan', 'None', 'null']:
                                continue
                            
                            preco_str = preco_str.replace('.', '').replace(',', '.')
                            preco_val = float(preco_str)
                        except (ValueError, TypeError):
                            continue
                        
                        if not self._is_valid_number(preco_val):
                            continue
                        
                        price_kg = self._normalize_price_to_kg(produto_match, preco_val)
                        
                        self._update_opportunity_table(produto_match, state_code, price_kg)
                        
                        all_prices.append({
                            "ceasa_region": state_code,
                            "ceasa_name": ceasa_info['name'],
                            "product_name": produto_match,
                            "unit_type": "kg",
                            "price_min": round(price_kg * 0.9, 2),
                            "price_max": round(price_kg * 1.1, 2),
                            "price_avg": price_kg,
                            "price_date": today,
                            "is_projection": False,
                            "data_type": "historical"
                        })
                    
                    except Exception as e:
                        logger.debug(f"⚠️ Erro linha {idx} {ceasa_info['name']}: {e}")
                        continue
                
                time.sleep(1)  # Rate limiting entre CEASAs
            
            except requests.exceptions.RequestException:
                logger.debug(f"⚠️ {ceasa_info['name']}: Erro de conexão")
                continue
            except Exception as e:
                logger.debug(f"⚠️ {ceasa_info['name']}: Erro: {e}")
                continue
        
        if all_prices:
            logger.info(f"✅ Outras CEASAs: {len(all_prices)} preços coletados")
        else:
            logger.debug("ℹ️ Outras CEASAs: Nenhum dado coletado (pode ser normal se portais mudaram)")
        
        return all_prices
    
    def fetch_conab(self) -> List[Dict]:
        """
        Scraping CONAB - Portal de Informações Agropecuárias.
        
        A CONAB disponibiliza dados históricos em:
        https://portaldeinformacoes.conab.gov.br/precos-agropecuarios-serie-historica.html
        
        ✅ MELHORADO: Múltiplas estratégias de parsing
        - Tenta tabelas HTML
        - Tenta dados JSON embutidos
        - Tenta links para downloads CSV/Excel
        
        Estratégia:
        1. Tenta acessar página de preços atuais
        2. Faz scraping de tabelas HTML
        3. Se falhar, tenta extrair dados de outras formas
        4. Normaliza dados seguindo padrão CeasaPrice
        """
        logger.info("📊 [CONAB] Conectando ao Portal de Informações...")
        
        all_prices = []
        today = datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%S.000Z')
        
        # URLs do portal CONAB (podem mudar, então temos fallbacks)
        conab_urls = [
            "https://portaldeinformacoes.conab.gov.br/precos-agropecuarios-serie-historica.html",
            "https://www.conab.gov.br/info-agro/precos/cotacoes",
            "https://www.conab.gov.br/info-agro/precos",  # Página principal
        ]
        
        # Produtos de interesse
        produtos_conab = {
            'Tomate': ['tomate', 'TOMATE'],
            'Soja': ['soja', 'SOJA'],
            'Milho': ['milho', 'MILHO']
        }
        
        for url in conab_urls:
            try:
                logger.debug(f"🔍 Tentando acessar: {url}")
                response = requests.get(
                    url,
                    headers=self.headers,
                    timeout=20,
                    verify=True
                )
                
                if response.status_code != 200:
                    logger.warning(f"⚠️ CONAB retornou status {response.status_code}")
                    continue
                
                # Tenta ler como HTML e extrair tabelas
                try:
                    html_buffer = io.StringIO(response.text)
                    # ✅ CORRIGIDO: Remove encoding (já está decodificado)
                    tables = pd.read_html(html_buffer, header=0)
                except Exception as e:
                    logger.debug(f"⚠️ Não foi possível extrair tabelas HTML: {e}")
                    # Tenta com encoding explícito
                    try:
                        html_buffer = io.StringIO(response.content.decode('utf-8'))
                        tables = pd.read_html(html_buffer, header=0)
                    except Exception as e2:
                        logger.debug(f"⚠️ Erro ao extrair tabelas CONAB (tentativa 2): {e2}")
                        # Tenta buscar dados em formato JSON (se o portal usar AJAX)
                        if 'json' in response.text.lower() or 'data' in response.text.lower():
                            logger.debug("💡 Portal pode usar dados via AJAX, mas parsing não implementado")
                        continue
                
                if not tables:
                    logger.debug(f"⚠️ CONAB ({url}): Nenhuma tabela encontrada")
                    # ✅ NOVO: Tenta buscar links para downloads CSV/Excel
                    if '.csv' in response.text.lower() or '.xls' in response.text.lower() or 'download' in response.text.lower():
                        logger.debug("💡 CONAB: Portal pode ter links para download CSV/Excel (não implementado ainda)")
                    continue
                
                logger.debug(f"✅ CONAB ({url}): {len(tables)} tabela(s) encontrada(s)")
                
                # Processa cada tabela encontrada
                for table_idx, df in enumerate(tables):
                    logger.debug(f"📋 Processando tabela {table_idx + 1}/{len(tables)} ({len(df)} linhas)")
                    # Procura colunas que indicam preços
                    cols_lower = [str(c).lower() for c in df.columns]
                    
                    # Identifica colunas relevantes
                    col_produto = None
                    col_preco = None
                    col_regiao = None
                    col_data = None
                    
                    for idx, col in enumerate(df.columns):
                        col_str = str(col).lower()
                        if any(word in col_str for word in ['produto', 'commodity', 'item']):
                            col_produto = idx
                        if any(word in col_str for word in ['preço', 'preco', 'valor', 'cotação', 'cotacao']):
                            col_preco = idx
                        if any(word in col_str for word in ['região', 'regiao', 'estado', 'uf', 'local']):
                            col_regiao = idx
                        if any(word in col_str for word in ['data', 'date', 'período', 'periodo']):
                            col_data = idx
                    
                    # Se não encontrou estrutura esperada, tenta usar primeira e segunda coluna como fallback
                    if col_produto is None:
                        col_produto = 0
                        logger.debug(f"⚠️ CONAB: Coluna produto não encontrada, usando primeira coluna")
                    if col_preco is None:
                        col_preco = 1 if len(df.columns) > 1 else 0
                        logger.debug(f"⚠️ CONAB: Coluna preço não encontrada, usando segunda coluna")
                    
                    if len(df.columns) < 2:
                        logger.debug(f"⚠️ CONAB: Tabela tem menos de 2 colunas, pulando")
                        continue
                    
                    # Processa linhas da tabela
                    for _, row in df.iterrows():
                        try:
                            # Extrai nome do produto
                            produto_raw = str(row.iloc[col_produto]).upper()
                            
                            # Verifica se é produto de interesse
                            produto_match = None
                            for produto, keywords in produtos_conab.items():
                                if any(kw in produto_raw for kw in keywords):
                                    produto_match = produto
                                    break
                            
                            if not produto_match:
                                continue
                            
                            # Extrai preço
                            preco_raw = row.iloc[col_preco]
                            if isinstance(preco_raw, str):
                                # Remove R$, espaços, converte vírgula
                                preco_str = preco_raw.replace('R$', '').replace(' ', '').replace('.', '').replace(',', '.')
                                try:
                                    preco_val = float(preco_str)
                                except:
                                    continue
                            else:
                                preco_val = float(preco_raw)
                            
                            if not self._is_valid_number(preco_val):
                                continue
                            
                            # Extrai região (se disponível)
                            regiao = "BR"  # Default: Brasil
                            if col_regiao is not None:
                                regiao_raw = str(row.iloc[col_regiao]).upper()
                                # Tenta extrair código UF
                                for uf in self.target_states:
                                    uf_code = uf.replace('(', '').replace(')', '')
                                    if uf_code in regiao_raw or regiao_raw in uf_code:
                                        regiao = uf_code
                                        break
                            
                            # Normaliza preço para kg
                            price_kg = self._normalize_price_to_kg(produto_match, preco_val)
                            
                            # Atualiza tabela Opportunity
                            if regiao != "BR":
                                self._update_opportunity_table(produto_match, regiao, price_kg)
                            
                            # Adiciona à lista
                            # Marca como histórico ou projeção baseado na data
                            today_date = datetime.utcnow().date()
                            price_date_only = datetime.strptime(today, '%Y-%m-%dT%H:%M:%S.000Z').date() if isinstance(today, str) else today.date()
                            is_proj = price_date_only > today_date
                            
                            all_prices.append({
                                "ceasa_region": regiao,
                                "ceasa_name": f"CONAB {regiao}",
                                "product_name": produto_match,
                                "unit_type": "kg",
                                "price_min": round(price_kg * 0.95, 2),
                                "price_max": round(price_kg * 1.05, 2),
                                "price_avg": price_kg,
                                "price_date": today,
                                "is_projection": is_proj,
                                "data_type": "projection" if is_proj else "historical"
                            })
                            
                        except Exception as e:
                            logger.debug(f"⚠️ Erro ao processar linha CONAB: {e}")
                            continue
                
                # Se conseguiu coletar dados, sai do loop
                if all_prices:
                    break
                
                time.sleep(2)  # Rate limiting entre tentativas
            
            except requests.exceptions.RequestException as e:
                logger.warning(f"⚠️ Erro de conexão CONAB ({url}): {e}")
                continue
            except Exception as e:
                logger.error(f"❌ Erro inesperado ao processar CONAB: {e}")
                continue
        
        if all_prices:
            logger.info(f"✅ CONAB (HTML): {len(all_prices)} preços coletados")
        else:
            logger.debug("ℹ️ CONAB (HTML): Nenhum dado coletado, tentando download CSV/Excel...")
            # ✅ NOVO: Tenta download de CSV/Excel como fallback
            try:
                csv_prices = self._fetch_conab_from_downloads()
                if csv_prices:
                    all_prices.extend(csv_prices)
                    logger.info(f"✅ CONAB (Download): {len(csv_prices)} preços coletados via CSV/Excel")
            except Exception as e:
                logger.debug(f"⚠️ CONAB (Download): Erro ao tentar download: {e}")
        
        if all_prices:
            logger.info(f"✅ CONAB: Total de {len(all_prices)} preços coletados")
        else:
            logger.info("ℹ️ CONAB: Nenhum dado coletado (portal pode usar JavaScript/AJAX ou estrutura diferente)")
            logger.info("💡 Nota: CONAB não tem API pública. Dados podem ser obtidos via download manual de CSV/Excel.")
        
        return all_prices
    
    def _fetch_conab_from_downloads(self) -> List[Dict]:
        """
        Tenta baixar dados CONAB de arquivos CSV/Excel disponíveis no portal.
        
        Estratégia:
        1. Acessa página de downloads do portal
        2. Procura links para arquivos CSV/Excel de preços
        3. Faz download e processa
        4. Retorna dados normalizados
        """
        logger.debug("📥 [CONAB] Tentando download de arquivos CSV/Excel...")
        
        all_prices = []
        today = datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%S.000Z')
        
        # URLs do portal de downloads CONAB (prioriza páginas de preços)
        download_urls = [
            "https://portaldeinformacoes.conab.gov.br/download-arquivos.html",
            "https://www.conab.gov.br/info-agro/precos",
            "https://www.conab.gov.br/info-agro/precos/cotacoes",
            "https://portaldeinformacoes.conab.gov.br/index.php/series-historicas-dos-precos",
        ]
        
        for url in download_urls:
            try:
                response = requests.get(url, headers=self.headers, timeout=20, verify=True)
                
                if response.status_code != 200:
                    continue
                
                # Procura links para arquivos CSV/Excel relacionados a PREÇOS
                # Prioriza links com palavras-chave: preco, cotacao, precos, cotacoes, mercado, agricola
                price_keywords = ['preco', 'cotacao', 'precos', 'cotacoes', 'mercado', 'agricola', 'hortalica', 'fruta']
                
                # Primeiro: links com palavras-chave de preços (CSV, Excel, TXT)
                price_links = re.findall(
                    r'href=["\']([^"\']*(?:' + '|'.join(price_keywords) + r')[^"\']*\.(?:csv|xlsx|xls|txt))["\']',
                    response.text, re.IGNORECASE
                )
                
                # Segundo: todos os links de arquivos de dados (fallback)
                csv_links = re.findall(r'href=["\']([^"\']*\.(csv|xlsx|xls|txt))["\']', response.text, re.IGNORECASE)
                
                # Combina: prioriza links de preços
                all_links = []
                for link_info in price_links:
                    link = link_info[0] if isinstance(link_info, tuple) else link_info
                    all_links.append(link)
                
                # Adiciona outros links como fallback (mas filtra alguns conhecidos que não são preços)
                excluded_keywords = ['capacidade', 'estatica', 'exportacao', 'importacao', 'mapa', 'geografico']
                for link_info in csv_links:
                    link = link_info[0] if isinstance(link_info, tuple) else link_info
                    # Pula links que claramente não são de preços
                    if not any(excluded in link.lower() for excluded in excluded_keywords):
                        if link not in all_links:
                            all_links.append(link)
                
                if not all_links:
                    logger.debug(f"⚠️ CONAB: Nenhum link CSV/Excel encontrado em {url}")
                    continue
                
                logger.debug(f"💡 CONAB: Encontrados {len(all_links)} links potenciais")
                
                # Tenta baixar e processar cada arquivo
                for link_info in all_links[:3]:  # Limita a 3 arquivos para não demorar muito
                    link = link_info[0] if isinstance(link_info, tuple) else link_info
                    
                    # Converte link relativo para absoluto
                    if link.startswith('/'):
                        link = f"https://portaldeinformacoes.conab.gov.br{link}"
                    elif not link.startswith('http'):
                        link = f"https://portaldeinformacoes.conab.gov.br/{link}"
                    
                    try:
                        file_prices = self._download_and_process_conab_file(link)
                        if file_prices:
                            all_prices.extend(file_prices)
                            logger.debug(f"✅ CONAB: Processado {link} - {len(file_prices)} registros")
                            break  # Se conseguiu processar um arquivo, para
                    except Exception as e:
                        logger.debug(f"⚠️ CONAB: Erro ao processar {link}: {e}")
                        continue
                
                if all_prices:
                    break  # Se conseguiu dados, para de tentar outras URLs
            
            except Exception as e:
                logger.debug(f"⚠️ CONAB: Erro ao acessar {url}: {e}")
                continue
        
        return all_prices
    
    def _download_and_process_conab_file(self, file_url: str, days_back: int = 365) -> List[Dict]:
        """
        Baixa e processa arquivo CSV/Excel da CONAB.
        
        Args:
            file_url: URL do arquivo para download
            days_back: Quantos dias de histórico coletar (padrão: 365 dias = 1 ano)
            
        Returns:
            Lista de preços normalizados (apenas dados do período especificado)
        """
        prices = []
        today = datetime.utcnow()
        cutoff_date = today - timedelta(days=days_back)
        
        try:
            # Faz download do arquivo
            response = requests.get(file_url, headers=self.headers, timeout=30, verify=True)
            
            if response.status_code != 200:
                return []
            
            # Determina tipo de arquivo
            is_csv = file_url.endswith('.csv') or 'csv' in file_url.lower()
            is_excel = file_url.endswith(('.xlsx', '.xls')) or any(ext in file_url.lower() for ext in ['.xlsx', '.xls'])
            is_txt = file_url.endswith('.txt') or 'txt' in file_url.lower()
            
            # Processa arquivo
            if is_txt:
                # Arquivos TXT da CONAB geralmente são delimitados por ponto-e-vírgula
                try:
                    # Tenta ponto-e-vírgula primeiro (padrão CONAB)
                    df = pd.read_csv(io.StringIO(response.text), delimiter=';', encoding='utf-8', low_memory=False)
                except:
                    try:
                        # Tenta tab
                        df = pd.read_csv(io.StringIO(response.text), delimiter='\t', encoding='utf-8', low_memory=False)
                    except:
                        try:
                            # Tenta vírgula
                            df = pd.read_csv(io.StringIO(response.text), delimiter=',', encoding='utf-8', low_memory=False)
                        except:
                            # Última tentativa: encoding latin-1 com ponto-e-vírgula
                            df = pd.read_csv(io.StringIO(response.text), delimiter=';', encoding='latin-1', low_memory=False)
            
            elif is_csv:
                # Tenta diferentes delimitadores (; ou ,)
                try:
                    df = pd.read_csv(io.StringIO(response.text), delimiter=';', encoding='utf-8')
                except:
                    try:
                        df = pd.read_csv(io.StringIO(response.text), delimiter=',', encoding='utf-8')
                    except:
                        df = pd.read_csv(io.StringIO(response.text), encoding='latin-1')
            
            elif is_excel:
                # Salva temporariamente para pandas ler
                with tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx') as tmp_file:
                    tmp_file.write(response.content)
                    tmp_path = tmp_file.name
                
                try:
                    df = pd.read_excel(tmp_path, engine='openpyxl')
                except:
                    try:
                        df = pd.read_excel(tmp_path, engine='xlrd')
                    except:
                        return []
                finally:
                    # Remove arquivo temporário
                    try:
                        os.unlink(tmp_path)
                    except:
                        pass
            else:
                return []
            
            if df.empty:
                return []
            
            # Identifica colunas relevantes
            col_produto = None
            col_preco = None
            col_regiao = None
            col_ano = None
            col_mes = None
            col_data_str = None
            
            for idx, col in enumerate(df.columns):
                col_str = str(col).upper().strip()
                # Produto: produto, item, mercadoria, cultura, classificao_produto
                if any(word in col_str for word in ['PRODUTO', 'ITEM', 'MERCADORIA', 'CULTURA', 'CLASSIFICAO']):
                    if col_produto is None:
                        col_produto = idx
                # Preço: valor_produto_kg, preco, valor, cotacao
                if any(word in col_str for word in ['VALOR_PRODUTO', 'PREÇO', 'PRECO', 'VALOR', 'COTAÇÃO', 'COTACAO']):
                    if col_preco is None:
                        col_preco = idx
                # Região: uf, regiao, estado, local
                if any(word in col_str for word in ['UF', 'REGIÃO', 'REGIAO', 'ESTADO', 'LOCAL']):
                    if col_regiao is None:
                        col_regiao = idx
                # Ano e Mês (específico para CONAB)
                if 'ANO' in col_str and col_ano is None:
                    col_ano = idx
                if 'MES' in col_str and col_mes is None:
                    col_mes = idx
                # Data string: data_inicial_final_semana
                if 'DATA' in col_str and col_data_str is None:
                    col_data_str = idx
            
            if col_produto is None:
                col_produto = 0
            if col_preco is None:
                # Procura por coluna que contenha "valor" ou "preco" em qualquer posição
                for idx, col in enumerate(df.columns):
                    col_str = str(col).upper()
                    if 'VALOR' in col_str or 'PRECO' in col_str or 'PRICE' in col_str:
                        col_preco = idx
                        break
                if col_preco is None:
                    col_preco = 1 if len(df.columns) > 1 else 0
            
            # Processa linhas
            current_year = today.year
            registros_filtrados = 0
            for _, row in df.iterrows():
                try:
                    # ✅ FILTRO PRÉ-PROCESSAMENTO: Valida ano antes de processar
                    if col_ano is not None and col_ano < len(row):
                        try:
                            ano_val = row.iloc[col_ano]
                            if pd.notna(ano_val):
                                ano = int(ano_val)
                                # Permite até 1 ano no futuro (projeções), mas bloqueia muito antigos
                                if ano < 2000 or ano > current_year + 1:
                                    registros_filtrados += 1
                                    continue  # Pula registro muito antigo ou muito futuro
                        except:
                            pass  # Se não conseguir ler ano, continua processamento
                    
                    # Extrai produto
                    produto_raw = str(row.iloc[col_produto]).upper().strip()
                    
                    if not produto_raw or produto_raw in ['NAN', 'NONE', '']:
                        continue
                    
                    # Verifica se é produto de interesse
                    produto_match = None
                    for produto, keywords in self.product_keywords.items():
                        if any(kw in produto_raw for kw in keywords):
                            produto_match = produto
                            break
                    
                    if not produto_match:
                        continue
                    
                    # Extrai preço
                    if col_preco >= len(row):
                        continue
                    
                    preco_raw = row.iloc[col_preco]
                    if pd.isna(preco_raw):
                        continue
                    
                    preco_str = str(preco_raw).replace('R$', '').replace(' ', '').strip()
                    
                    if preco_str in ['-', 'N/A', '---', '', 'nan', 'None', 'null']:
                        continue
                    
                    # Converte para float
                    try:
                        preco_str = preco_str.replace('.', '').replace(',', '.')
                        preco_val = float(preco_str)
                    except:
                        continue
                    
                    if not self._is_valid_number(preco_val):
                        continue
                    
                    # Extrai região
                    regiao = "BR"
                    if col_regiao is not None and col_regiao < len(row):
                        regiao_raw = str(row.iloc[col_regiao]).upper()
                        for uf in self.target_states:
                            uf_code = uf.replace('(', '').replace(')', '')
                            if uf_code in regiao_raw:
                                regiao = uf_code
                                break
                    
                    # Normaliza para kg
                    price_kg = self._normalize_price_to_kg(produto_match, preco_val)
                    
                    # ✅ CORRIGIDO: Extrai data corretamente (prioriza data string, depois ano+mês validado)
                    price_date_obj = None
                    current_year = today.year
                    
                    try:
                        # Prioridade 1: Tenta extrair da string de data (mais precisa)
                        if col_data_str is not None and col_data_str < len(row):
                            data_str = str(row.iloc[col_data_str]).strip()
                            if pd.notna(data_str) and data_str and data_str != 'nan' and data_str != 'None':
                                try:
                                    if ' - ' in data_str:
                                        data_str = data_str.split(' - ')[0].strip()
                                    parts = data_str.split('-')
                                    if len(parts) == 3:
                                        dia = int(parts[0].strip())
                                        mes = int(parts[1].strip())
                                        ano = int(parts[2].strip())
                                        
                                        # Validação: Permite até 1 ano no futuro (projeções), mas valida formato
                                        if ano < 2000 or ano > current_year + 1:
                                            continue  # Pula registros muito antigos ou muito futuros
                                        if mes < 1 or mes > 12:
                                            continue  # Pula registros com mês inválido
                                        price_date_obj = datetime(ano, mes, dia)
                                except Exception as e:
                                    logger.debug(f"⚠️ Erro ao parsear data string '{data_str}': {e}")
                        
                        # Prioridade 2: Se não conseguiu da string, usa ano + mês (mas valida ano primeiro)
                        if price_date_obj is None and col_ano is not None and col_mes is not None:
                            skip_record = False
                            try:
                                ano_val = row.iloc[col_ano] if col_ano < len(row) else None
                                mes_val = row.iloc[col_mes] if col_mes < len(row) else None
                                
                                if pd.notna(ano_val) and pd.notna(mes_val):
                                    ano = int(ano_val)
                                    mes = int(mes_val)
                                    
                                    # ✅ VALIDAÇÃO RIGOROSA: ano não pode ser futuro
                                    if ano > current_year:
                                        skip_record = True
                                    elif ano < 2000 or mes < 1 or mes > 12:
                                        skip_record = True
                                    elif ano == current_year and mes > today.month + 1:
                                        skip_record = True
                                    
                                    if skip_record:
                                        continue  # Pula registro fora do try
                                    
                                    # Tenta extrair dia da string de data se disponível
                                    dia = 15  # Default: meio do mês
                                    if col_data_str is not None and col_data_str < len(row):
                                        try:
                                            data_str = str(row.iloc[col_data_str]).strip()
                                            if pd.notna(data_str) and data_str and data_str != 'nan':
                                                # Extrai dia da string "DD-MM-YYYY"
                                                if ' - ' in data_str:
                                                    data_str = data_str.split(' - ')[0].strip()
                                                parts = data_str.split('-')
                                                if len(parts) == 3:
                                                    dia_parsed = int(parts[0].strip())
                                                    mes_parsed = int(parts[1].strip())
                                                    ano_parsed = int(parts[2].strip())
                                                    # ✅ VALIDAÇÃO CRÍTICA: ano da string não pode ser futuro
                                                    if ano_parsed > current_year:
                                                        continue  # Pula se string tem ano futuro
                                                    # Valida que ano/mês batem com colunas
                                                    if ano_parsed == ano and mes_parsed == mes:
                                                        dia = dia_parsed
                                                    # Se anos não batem, usa ano da string (mais confiável)
                                                    elif ano_parsed <= current_year:
                                                        ano = ano_parsed  # Usa ano da string
                                                        mes = mes_parsed  # Usa mês da string
                                                        dia = dia_parsed
                                        except:
                                            pass  # Usa dia default
                                    
                                    # ✅ VALIDAÇÃO FINAL: Permite até 1 ano no futuro (projeções)
                                    if ano < 2000 or ano > current_year + 1:
                                        continue  # Pula registro muito antigo ou muito futuro
                                    
                                    price_date_obj = datetime(ano, mes, dia)
                            except Exception as e:
                                logger.debug(f"⚠️ Erro ao extrair ano/mês: {e}")
                        
                        # Se ainda não tem data válida, pula o registro (não usa fallback)
                        if price_date_obj is None:
                            continue  # Pula registro sem data válida
                            
                    except Exception as e:
                        logger.debug(f"⚠️ Erro geral ao extrair data: {e}")
                        continue  # Pula registro em caso de erro
                    
                    # ✅ FILTRO TEMPORAL: Apenas dados dos últimos N dias (mas permite projeções futuras)
                    # Se a data é muito antiga (antes do cutoff), pula
                    # Mas se é futura (projeção), mantém mesmo que esteja além do cutoff
                    if price_date_obj < cutoff_date and price_date_obj <= today:
                        continue  # Pula dados muito antigos (mas não projeções futuras)
                    
                    price_date = price_date_obj.strftime('%Y-%m-%dT%H:%M:%S.000Z')
                    
                    # ✅ OPÇÃO 3: Marca claramente se é projeção ou histórico
                    # Compara apenas data (sem hora) para determinar se é futuro
                    today_date = today.date()
                    price_date_only = price_date_obj.date()
                    is_projection = price_date_only > today_date
                    
                    prices.append({
                        "ceasa_region": regiao,
                        "ceasa_name": f"CONAB {regiao}",
                        "product_name": produto_match,
                        "unit_type": "kg",
                        "price_min": round(price_kg * 0.95, 2),
                        "price_max": round(price_kg * 1.05, 2),
                        "price_avg": price_kg,
                        "price_date": price_date,
                        "is_projection": is_projection,  # ✅ NOVO: Indica se é projeção
                        "data_type": "projection" if is_projection else "historical"  # ✅ NOVO: Tipo de dado
                    })
                
                except Exception as e:
                    logger.debug(f"⚠️ Erro ao processar linha CONAB CSV/Excel: {e}")
                    continue
        
        except Exception as e:
            logger.debug(f"⚠️ Erro ao baixar/processar arquivo CONAB: {e}")
            return []
        
        if registros_filtrados > 0:
            logger.debug(f"ℹ️ CONAB: {registros_filtrados} registros filtrados (ano futuro)")
        
        return prices
    
    def _save_to_ceasa_price_table(self, prices: List[Dict]) -> int:
        """
        Salva preços coletados na tabela CeasaPrice.
        
        ✅ PERFORMANCE: Processa em lotes (batch) para evitar timeouts.
        
        Args:
            prices: Lista de dicionários com estrutura CeasaPrice
            
        Returns:
            Número de registros salvos
        """
        if not prices:
            return 0
        
        saved_count = 0
        batch_size = 100  # ✅ BATCH: Processa 100 por vez
        total_batches = (len(prices) + batch_size - 1) // batch_size
        
        logger.info(f"📦 Processando {len(prices)} registros em {total_batches} lotes de {batch_size}")
        
        try:
            for batch_num in range(total_batches):
                start_idx = batch_num * batch_size
                end_idx = min(start_idx + batch_size, len(prices))
                batch = prices[start_idx:end_idx]
                
                try:
                    with self.engine.begin() as conn:
                        # ✅ BATCH: Prepara dados para inserção em lote
                        for price_data in batch:
                            try:
                                upsert_sql = text("""
                                    INSERT INTO "CeasaPrice" 
                                    (ceasa_region, ceasa_name, product_name, unit_type, 
                                     price_min, price_max, price_avg, price_date, sync_timestamp,
                                     is_projection, data_type)
                                    VALUES 
                                    (:region, :name, :product, :unit, :min, :max, :avg, :date, NOW(),
                                     :is_projection, :data_type)
                                    ON CONFLICT (ceasa_region, product_name, price_date)
                                    DO UPDATE SET
                                        price_min = EXCLUDED.price_min,
                                        price_max = EXCLUDED.price_max,
                                        price_avg = EXCLUDED.price_avg,
                                        sync_timestamp = NOW(),
                                        is_projection = EXCLUDED.is_projection,
                                        data_type = EXCLUDED.data_type
                                """)
                                
                                conn.execute(upsert_sql, {
                                    "region": price_data["ceasa_region"],
                                    "name": price_data["ceasa_name"],
                                    "product": price_data["product_name"],
                                    "unit": price_data.get("unit_type", "kg"),
                                    "min": float(price_data["price_min"]),
                                    "max": float(price_data["price_max"]),
                                    "avg": float(price_data["price_avg"]),
                                    "date": price_data["price_date"],
                                    "is_projection": price_data.get("is_projection", False),
                                    "data_type": price_data.get("data_type", "historical")
                                })
                                
                                saved_count += 1
                            
                            except Exception as e:
                                logger.warning(f"⚠️ Erro ao salvar preço {price_data.get('product_name', '?')}: {e}")
                                continue
                        
                        logger.debug(f"✅ Lote {batch_num + 1}/{total_batches}: {len(batch)} registros processados")
                    
                    # ✅ BATCH: Delay entre lotes para não sobrecarregar Supabase
                    if batch_num < total_batches - 1:  # Não espera após o último lote
                        time.sleep(0.5)  # 500ms entre lotes
                
                except Exception as e:
                    logger.warning(f"⚠️ Erro no lote {batch_num + 1}/{total_batches}: {e}")
                    # Tenta novamente com retry
                    max_retries = 2
                    for retry in range(max_retries):
                        try:
                            time.sleep(1 * (retry + 1))  # Backoff
                            with self.engine.begin() as conn:
                                # Tenta salvar lote novamente (um por um desta vez)
                                for price_data in batch:
                                    try:
                                        upsert_sql = text("""
                                            INSERT INTO "CeasaPrice" 
                                            (ceasa_region, ceasa_name, product_name, unit_type, 
                                             price_min, price_max, price_avg, price_date, sync_timestamp,
                                             is_projection, data_type)
                                            VALUES 
                                            (:region, :name, :product, :unit, :min, :max, :avg, :date, NOW(),
                                             :is_projection, :data_type)
                                            ON CONFLICT (ceasa_region, product_name, price_date)
                                            DO UPDATE SET
                                                price_min = EXCLUDED.price_min,
                                                price_max = EXCLUDED.price_max,
                                                price_avg = EXCLUDED.price_avg,
                                                sync_timestamp = NOW(),
                                                is_projection = EXCLUDED.is_projection,
                                                data_type = EXCLUDED.data_type
                                        """)
                                        conn.execute(upsert_sql, {
                                            "region": price_data["ceasa_region"],
                                            "name": price_data["ceasa_name"],
                                            "product": price_data["product_name"],
                                            "unit": price_data.get("unit_type", "kg"),
                                            "min": float(price_data["price_min"]),
                                            "max": float(price_data["price_max"]),
                                            "avg": float(price_data["price_avg"]),
                                            "date": price_data["price_date"],
                                            "is_projection": price_data.get("is_projection", False),
                                            "data_type": price_data.get("data_type", "historical")
                                        })
                                        saved_count += 1
                                    except:
                                        continue
                            logger.info(f"✅ Lote {batch_num + 1} recuperado após retry")
                            break
                        except Exception as retry_error:
                            if retry == max_retries - 1:
                                logger.error(f"❌ Lote {batch_num + 1} falhou após {max_retries} tentativas")
                            continue
                
                # Progresso
                if (batch_num + 1) % 5 == 0 or batch_num == total_batches - 1:
                    logger.info(f"📊 Progresso: {saved_count}/{len(prices)} registros salvos ({((saved_count / len(prices)) * 100):.1f}%)")
            
            logger.info(f"💾 ETL concluído: {saved_count}/{len(prices)} registros salvos na tabela CeasaPrice")
        
        except Exception as e:
            logger.error(f"❌ Erro crítico ao salvar em CeasaPrice: {e}")
        
        return saved_count

    def run_etl(self) -> Dict:
        """
        Executa ETL completo de preços de mercado.
        
        Coleta dados de:
        - CEASA-PR (scraping oficial)
        - Agrolink (scraping nacional)
        - CONAB (scraping portal oficial) ✅ NOVO
        
        Salva automaticamente na tabela CeasaPrice.
        
        Returns:
            {
                'success': True,
                'records': 45,  # Total coletado
                'saved': 43,    # Total salvo (pode ser menor se houver duplicatas)
                'sources': ['CEASA-PR', 'Agrolink', 'CONAB'],
                'timestamp': '2025-12-10T12:00:00.000Z'
            }
        """
        logger.info("="*60)
        logger.info("INICIANDO ETL DE PREÇOS DE MERCADO")
        logger.info("="*60)
        
        dados_sul = self.fetch_ceasa_pr()
        dados_nac = self.fetch_agrolink_national()
        dados_outras_ceasas = self.fetch_other_ceasas()  # ✅ NOVO: Outras CEASAs
        dados_conab = self.fetch_conab()  # ✅ NOVO: ETL CONAB
        
        total = dados_sul + dados_nac + dados_outras_ceasas + dados_conab
        
        sources = []
        if dados_sul:
            sources.append('CEASA-PR')
        if dados_nac:
            sources.append('Agrolink')
        if dados_outras_ceasas:
            sources.append('Outras-CEASAs')
        if dados_conab:
            sources.append('CONAB')
        
        # ✅ NOVO: ETL IBGE (produção agrícola) - roda separadamente
        # Nota: IBGE é de produção, não preços, então não mistura com CeasaPrice
        
        # ✅ NOVO: Salva todos os dados coletados na tabela CeasaPrice
        saved_count = 0
        if total:
            saved_count = self._save_to_ceasa_price_table(total)
            logger.info(f"✅ ETL concluído: {len(total)} registros coletados, {saved_count} salvos na tabela CeasaPrice")
        
        if total:
            return {
                'success': True,
                'records': len(total),
                'saved': saved_count,
                'sources': sources,
                'timestamp': datetime.utcnow().isoformat()
            }
        else:
            logger.warning("⚠️ Nenhum dado coletado")
            return {
                'success': False,
                'records': 0,
                'error': 'No data collected'
            }


# ========================================
# INSTÂNCIA GLOBAL (Singleton)
# ========================================
market_scraper = MarketScraper()
