# test_agrolink.py
import requests
import pandas as pd
import io

url = "https://www.agrolink.com.br/cotacoes/ceasa/hortalicas/tomate/"
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}

try:
    response = requests.get(url, headers=headers, timeout=15)
    print(f"Status: {response.status_code}")
    print(f"Encoding: {response.encoding}")
    
    # Tenta ler tabelas
    html_buffer = io.StringIO(response.text)
    tables = pd.read_html(html_buffer)
    print(f"Tabelas encontradas: {len(tables)}")
    
    if tables:
        print("\nPrimeira tabela:")
        print(tables[0].head())
        print(f"\nColunas: {tables[0].columns.tolist()}")
    
except Exception as e:
    print(f"Erro: {e}")
