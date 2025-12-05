# services/data_sync/market_scraper.py
"""
Scraper de preços de mercado (CEASA-PR, Agrolink).
Migrado de etl_conab.py com correções aplicadas.

CORREÇÕES:
- Margem produtor variável por produto (era fixo 70% ❌)
- Validação robusta de scraping
- Logs estruturados
"""

import requests
import pandas as pd
import io
import time
import math
from datetime import datetime
from typing import List, Dict
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
        
        self.ceasa_pr_url = "https://celepar7.pr.gov.br/ceasa/hoje.asp"
        
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
        """
        try:
            weight = UNIT_WEIGHTS.get(product, 1.0)
            
            # Preço de mercado (unidade comercial)
            market_price_unit = price_kg * weight
            
            # Margem variável por produto
            margin_factor = PRODUCER_MARGINS.get(product, 0.70)
            producer_price_unit = market_price_unit * margin_factor
            
            # Prepara valores decimais (arredondando para evitar erros de float)
            buy_price = round(producer_price_unit, 2)
            sell_price = round(market_price_unit, 2)

            with self.engine.begin() as conn:
                # 1. Verifica se a Oportunidade já existe
                check_sql = text(
                    'SELECT id FROM "Opportunity" WHERE product = :p AND state = :s'
                )
                existing = conn.execute(check_sql, {"p": product, "s": state}).fetchone()
                
                if existing:
                    opp_id = existing[0]
                    
                    # 2. ✅ NOVO: Salvar no Histórico ANTES de atualizar
                    history_sql = text("""
                        INSERT INTO "PriceHistory" ("opportunityId", "price", "createdAt")
                        VALUES (:oid, :price, NOW())
                    """)
                    conn.execute(history_sql, {"oid": opp_id, "price": sell_price})
                    
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
                    
                    logger.debug(f"🔄 {product}/{state}: Histórico salvo + Atualizado p/ R$ {sell_price}")
                
                else:
                    # 4. Se não existe, cria do zero (Primeira carga)
                    # Lat/Lng genéricos (-15, -50) apenas para constar no mapa inicialmente
                    create_sql = text("""
                        INSERT INTO "Opportunity" 
                        ("product", "category", "city", "state", "lat", "lng", 
                         "buyPrice", "sellPrice", "sellLocation", "riskLevel", "bestRoute")
                        VALUES 
                        (:p, 'Grãos/Horti', 'Capital', :s, -15.0, -50.0, 
                         :buy, :sell, 'Ceasa Local', 1, false)
                    """)
                    conn.execute(create_sql, {
                        "p": product, "s": state, "buy": buy_price, "sell": sell_price
                    })
                    logger.info(f"✨ Nova Oportunidade Criada: {product} em {state}")
        
        except Exception as e:
            logger.error(f"❌ Erro crítico ao persistir {product}/{state}: {e}")
    
    def fetch_ceasa_pr(self) -> List[Dict]:
        """Scraping CEASA-PR oficial"""
        logger.info("🚜 [Sul] Conectando CEASA-PR...")
        
        try:
            response = requests.get(
                self.ceasa_pr_url, 
                headers=self.headers, 
                verify=False, 
                timeout=15
            )
            response.encoding = 'latin-1'
            
            html_buffer = io.StringIO(response.text)
            tables = pd.read_html(html_buffer, header=0)
            
            if not tables:
                logger.warning("⚠️ Nenhuma tabela encontrada")
                return []
            
            # Encontra tabela correta
            df = None
            for t in tables:
                cols = " ".join([str(c).upper() for c in t.columns])
                if "PRODUTO" in cols and "EMBALAGEM" in cols:
                    df = t
                    break
            
            if df is None:
                logger.warning("⚠️ Tabela de produtos não encontrada")
                return []
            
            prices = []
            produtos_interesse = ['TOMATE', 'MILHO', 'SOJA']
            today = datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%S.000Z')
            
            col_produto = df.columns[0]
            col_preco = 'CURITIBA'
            
            for col in df.columns:
                if 'CURITIBA' in str(col).upper():
                    col_preco = col
                    break
            
            for _, row in df.iterrows():
                prod_raw = str(row[col_produto]).upper()
                
                if any(p in prod_raw for p in produtos_interesse):
                    try:
                        val_str = str(row.get(col_preco, row.iloc[1]))
                        val_str = val_str.replace('R$', '').replace('.', '').replace(',', '.')
                        val = float(val_str)
                    except:
                        continue
                    
                    if not self._is_valid_number(val):
                        continue
                    
                    nome = next(
                        (p for p in produtos_interesse if p in prod_raw), 
                        "OUTROS"
                    ).capitalize()
                    
                    price_kg = self._normalize_price_to_kg(nome, val)
                    
                    self._update_opportunity_table(nome, "PR", price_kg)
                    
                    prices.append({
                        "ceasa_region": "PR",
                        "ceasa_name": "Ceasa Curitiba",
                        "product_name": nome,
                        "unit_type": "kg",
                        "price_min": round(price_kg * 0.9, 2),
                        "price_max": round(price_kg * 1.1, 2),
                        "price_avg": price_kg,
                        "price_date": today
                    })
            
            logger.info(f"✅ CEASA-PR: {len(prices)} preços coletados")
            return prices
        
        except Exception as e:
            logger.error(f"❌ Erro CEASA-PR: {e}")
            return []
    
    def fetch_agrolink_national(self) -> List[Dict]:
        """Scraping Agrolink (todos os estados)"""
        logger.info("🌎 [Nacional] Conectando Agrolink...")
        
        all_prices = []
        today = datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%S.000Z')
        
        for produto, url in self.agrolink_urls.items():
            try:
                logger.debug(f"📡 Buscando {produto}...")
                
                response = requests.get(url, headers=self.headers, timeout=15)
                html_buffer = io.StringIO(response.text)
                tables = pd.read_html(html_buffer, decimal=',', thousands='.')
                
                if not tables:
                    logger.warning(f"⚠️ Sem dados para {produto}")
                    continue
                
                df = tables[0]
                
                for _, row in df.iterrows():
                    local = str(row.iloc[1]).upper()
                    
                    if any(uf in local for uf in self.target_states):
                        try:
                            price_raw = row.iloc[2]
                            if isinstance(price_raw, str):
                                price_val = float(
                                    price_raw.replace('R$', '')
                                             .replace('.', '')
                                             .replace(',', '.')
                                )
                            else:
                                price_val = float(price_raw)
                        except:
                            continue
                        
                        if not self._is_valid_number(price_val):
                            continue
                        
                        # Extrai código UF
                        state_code = "BR"
                        for uf in self.target_states:
                            if uf in local:
                                state_code = uf.replace('(', '').replace(')', '')
                                break
                        
                        price_kg = self._normalize_price_to_kg(produto, price_val)
                        
                        self._update_opportunity_table(produto, state_code, price_kg)
                        
                        all_prices.append({
                            "ceasa_region": state_code,
                            "ceasa_name": local.strip(),
                            "product_name": produto,
                            "unit_type": "kg",
                            "price_min": round(price_kg * 0.95, 2),
                            "price_max": round(price_kg * 1.05, 2),
                            "price_avg": price_kg,
                            "price_date": today
                        })
                
                time.sleep(1)  # Rate limiting
            
            except Exception as e:
                logger.error(f"❌ Erro ao ler {produto}: {e}")
        
        logger.info(f"✅ Agrolink: {len(all_prices)} preços coletados")
        return all_prices
    
    def run_etl(self) -> Dict:
        """
        Executa ETL completo.
        
        Returns:
            {'success': True, 'records': 45, 'sources': ['PR', 'Agrolink']}
        """
        logger.info("="*60)
        logger.info("INICIANDO ETL DE PREÇOS DE MERCADO")
        logger.info("="*60)
        
        dados_sul = self.fetch_ceasa_pr()
        dados_nac = self.fetch_agrolink_national()
        
        total = dados_sul + dados_nac
        
        if total:
            logger.info(f"✅ ETL concluído: {len(total)} registros")
            return {
                'success': True,
                'records': len(total),
                'sources': ['CEASA-PR', 'Agrolink'],
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
