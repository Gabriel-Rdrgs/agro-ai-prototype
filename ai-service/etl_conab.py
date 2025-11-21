import pandas as pd
from sqlalchemy import create_engine
import os
from datetime import datetime

# 1. Configuração do Banco de Dados
# Pegue a URL do seu .env do backend (a mesma que usa no Prisma)
# Exemplo: postgresql://user:pass@host:5432/db
DATABASE_URL = "postgresql://postgres:EOJq44Y0BfyU9ICx@db.jiyqrxgyopytqvctdvir.supabase.co:5432/postgres" 

# Ajuste para o formato do SQLAlchemy (se começar com postgres:// muda para postgresql://)
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)

def run_etl():
    print("🚜 Iniciando ETL da CONAB...")

    # 2. Coleta de Dados (Extração)
    # Na vida real, bateríamos na API da CONAB: https://portaldeinformacoes.conab.gov.br/
    # Aqui, vamos criar um DataFrame que simula o dado bruto oficial baixado
    
    print("📥 Baixando dados históricos...")
    
    # Simulação de dados oficiais (Dataframe Pandas)
    data_source = {
        'produto': ['Tomate', 'Soja', 'Milho', 'Café Arábica'],
        'regiao': ['Petrolina - PE', 'Sorriso - MT', 'Rio Verde - GO', 'Patrocínio - MG'],
        'preco_atual_kg': [2.85, 122.50/60, 48.00/60, 900.00/60], # Convertendo saca 60kg p/ kg
        'data_referencia': [datetime.now()] * 4
    }
    
    df = pd.DataFrame(data_source)
    
    # 3. Transformação (Limpeza e Ajustes)
    print("⚙️ Transformando e normalizando dados...")
    
    # Exemplo: Arredondar preços
    df['preco_atual_kg'] = df['preco_atual_kg'].round(2)
    
    # 4. Carga (Salvar no PostgreSQL)
    print("💾 Salvando no Banco de Dados...")
    
    # Aqui vamos atualizar os registros existentes.
    # Como SQL puro é mais garantido para updates específicos, vamos iterar.
    
    with engine.connect() as connection:
        from sqlalchemy import text
        
        for index, row in df.iterrows():
            # Atualiza o preço de compra (buyPrice) baseado no produto
            query = text("""
                UPDATE "Opportunity"
                SET "buyPrice" = :preco
                WHERE "product" = :produto
            """)
            
            result = connection.execute(query, {
                "preco": row['preco_atual_kg'], 
                "produto": row['produto']
            })
            
            print(f"   -> Atualizado {row['produto']}: R$ {row['preco_atual_kg']}/kg")
            
        connection.commit()

    print("✅ ETL Concluído com sucesso!")

if __name__ == "__main__":
    run_etl()
    DATABASE_URL = "postgresql://postgres:EOJq44Y0BfyU9ICx@db.jiyqrxgyopytqvctdvir.supabase.co:5432/postgres"