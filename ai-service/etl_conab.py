import requests
import pandas as pd
import json
from datetime import datetime
import os
import time
import io
import math
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import urllib3

# Desabilita avisos de SSL para sites governamentais antigos
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
load_dotenv()

# --- CONFIGURAÇÃO DE BANCO ---
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    DATABASE_URL = os.getenv("PYTHON_DB_URL")
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)
# -----------------------------

BACKEND_URL = os.getenv("BACKEND_URL", "http://agro_backend:3001")
CEASA_PR_URL = "https://celepar7.pr.gov.br/ceasa/hoje.asp"
API_TOKEN = os.getenv("API_TOKEN")

AGROLINK_URLS = {
    'Tomate': "https://www.agrolink.com.br/cotacoes/ceasa/hortalicas/tomate/",
    'Soja': "https://www.agrolink.com.br/cotacoes/graos/soja/",
    'Milho': "https://www.agrolink.com.br/cotacoes/graos/milho/"
}

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
}

UNIT_WEIGHTS = {'Tomate': 20.0, 'Soja': 60.0, 'Milho': 60.0}

def is_valid_number(num):
    try:
        val = float(num)
        if math.isnan(val) or math.isinf(val) or val <= 0: return False
        return True
    except: return False

def normalize_price_to_kg(product_name, raw_price):
    """Converte qualquer preço (Cx/Saca) para KG"""
    weight = UNIT_WEIGHTS.get(product_name, 1.0)
    if raw_price > 10.0: return round(raw_price / weight, 2)
    return raw_price

def update_opportunity_table(product, state, price_kg):
    """
    Atualiza o preço na tabela do MAPA (Opportunity).
    LÓGICA CORRIGIDA: Preço Web = Venda (Ceasa). Compra (Produtor) = % desse valor.
    """
    try:
        weight = UNIT_WEIGHTS.get(product, 1.0)
        
        # O preço que achamos na web é o preço de MERCADO (Venda/Destino)
        market_price_unit = price_kg * weight 
        
        # O preço de COMPRA (Origem/Produtor) é menor.
        # Assumimos que o preço no produtor é ~70% do preço Ceasa (30% margem bruta)
        producer_price_unit = market_price_unit * 0.7
        
        with engine.begin() as conn:
            check = text('SELECT id FROM "Opportunity" WHERE product = :p AND state = :s')
            exists = conn.execute(check, {"p": product, "s": state}).fetchone()
            
            if exists:
                query = text("""
                    UPDATE "Opportunity"
                    SET "buyPrice" = :buy,   -- Preço Produtor (Estimado)
                        "sellPrice" = :sell, -- Preço Ceasa (Real)
                        "climate" = 'Atualizado via Mercado Real'
                    WHERE "product" = :product AND "state" = :state
                """)
                conn.execute(query, {
                    "buy": round(producer_price_unit, 2),
                    "sell": round(market_price_unit, 2),
                    "product": product,
                    "state": state
                })
                print(f"   🔄 Mapa atualizado {state}: Compra R${producer_price_unit:.2f} -> Venda R${market_price_unit:.2f}")
    except Exception as e:
        print(f"   ⚠️ Erro ao atualizar mapa: {e}")

def fetch_ceasa_pr():
    print(f"🚜 [Sul] Conectando CEASA-PR Oficial...")
    try:
        response = requests.get(CEASA_PR_URL, headers=HEADERS, verify=False, timeout=15)
        response.encoding = 'latin-1'
        html_buffer = io.StringIO(response.text)
        tables = pd.read_html(html_buffer, header=0)
        if not tables: return []
        
        df = None
        for t in tables:
            cols = " ".join([str(c).upper() for c in t.columns])
            if "PRODUTO" in cols and "EMBALAGEM" in cols: df = t; break
        
        if df is None: return []
        prices = []
        produtos_interesse = ['TOMATE', 'MILHO', 'SOJA']
        today = datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%S.000Z')
        
        col_produto = df.columns[0]
        col_preco = 'CURITIBA'
        for col in df.columns:
            if 'CURITIBA' in str(col).upper(): col_preco = col; break

        for _, row in df.iterrows():
            prod_raw = str(row[col_produto]).upper()
            if any(p in prod_raw for p in produtos_interesse):
                try:
                    val_str = str(row.get(col_preco, row.iloc[1])).replace('R$', '').replace('.', '').replace(',', '.')
                    val = float(val_str)
                except: continue
                if not is_valid_number(val): continue

                nome = next((p for p in produtos_interesse if p in prod_raw), "OUTROS").capitalize()
                price_kg = normalize_price_to_kg(nome, val)

                update_opportunity_table(nome, "PR", price_kg)
                
                prices.append({
                    "ceasa_region": "PR", "ceasa_name": "Ceasa Curitiba",
                    "product_name": nome, "unit_type": "kg",
                    "price_min": price_kg * 0.9, "price_max": price_kg * 1.1,
                    "price_avg": price_kg, "price_date": today
                })
        return prices
    except Exception as e:
        print(f"❌ Erro PR: {e}")
        return []

def fetch_agrolink_national():
    print(f"🌎 [Nacional] Conectando Agrolink (Todos os Estados)...")
    all_prices = []
    today = datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%S.000Z')
    target_states = [
        '(SP)', '(MG)', '(ES)', '(RJ)', 
        '(RS)', '(SC)', '(PR)',         
        '(GO)', '(MT)', '(MS)', '(DF)', 
        '(BA)', '(PE)', '(CE)', '(MA)', '(RN)'
    ]

    for produto, url in AGROLINK_URLS.items():
        try:
            response = requests.get(url, headers=HEADERS, timeout=15)
            html_buffer = io.StringIO(response.text)
            tables = pd.read_html(html_buffer, decimal=',', thousands='.')
            if not tables: continue
            df = tables[0]
            
            for _, row in df.iterrows():
                local = str(row.iloc[1]).upper()
                if any(uf in local for uf in target_states):
                    try:
                        price_raw = row.iloc[2]
                        if isinstance(price_raw, str):
                            price_val = float(price_raw.replace('R$', '').replace('.', '').replace(',', '.'))
                        else: price_val = float(price_raw)
                    except: continue

                    if not is_valid_number(price_val): continue

                    state_code = "BR"
                    for uf in target_states:
                        if uf in local: state_code = uf.replace('(', '').replace(')', ''); break

                    price_kg = normalize_price_to_kg(produto, price_val)
                    
                    update_opportunity_table(produto, state_code, price_kg)

                    all_prices.append({
                        "ceasa_region": state_code, "ceasa_name": local.strip(),
                        "product_name": produto, "unit_type": "kg",
                        "price_min": price_kg * 0.95, "price_max": price_kg * 1.05,
                        "price_avg": price_kg, "price_date": today
                    })
            time.sleep(1)
        except Exception as e:
            print(f"   ⚠️ Erro ao ler {produto}: {e}")
    return all_prices

def send_to_backend(prices):
    if not prices: return
    print(f"📤 Enviando {len(prices)} cotações para o Histórico...")
    url = f"{BACKEND_URL}/api/ceasa/import"
    headers = {"Content-Type": "application/json", "Authorization": f"Bearer {API_TOKEN}"}
    try:
        batch_size = 50
        for i in range(0, len(prices), batch_size):
            batch = prices[i:i + batch_size]
            clean = [p for p in batch if is_valid_number(p['price_avg'])]
            if not clean: continue
            requests.post(url, json={"prices": clean}, headers=headers)
            print(f"   -> Histórico arquivado (Lote {i//batch_size + 1}).")
    except Exception as e:
        print(f"❌ Falha no envio: {e}")

def run_etl():
    print("--- INICIANDO ETL V4 (Lógica Produtor/Venda) ---")
    dados_sul = fetch_ceasa_pr()
    dados_nac = fetch_agrolink_national()
    total = dados_sul + dados_nac
    
    if total:
        print(f"✅ Processamento concluído: {len(total)} registros atualizados.")
        send_to_backend(total)
    else:
        print("⚠️ Nenhum dado encontrado.")

if __name__ == "__main__":
    run_etl()