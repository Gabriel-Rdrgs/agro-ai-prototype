# test_env.py
import os
from dotenv import load_dotenv

load_dotenv()

print("="*60)
print("TESTE DE VARIÁVEIS DE AMBIENTE")
print("="*60)

# Testa variáveis principais
db_url = os.getenv('DATABASE_URL')
env = os.getenv('ENV', 'não definido')
log_level = os.getenv('LOG_LEVEL', 'não definido')

print(f"✅ DATABASE_URL: {db_url[:50] if db_url else '❌ NÃO DEFINIDA'}")
print(f"✅ ENV: {env}")
print(f"✅ LOG_LEVEL: {log_level}")
print("="*60)

if not db_url:
    print("⚠️ ATENÇÃO: DATABASE_URL não está definida!")
    print("Crie/edite o arquivo .env na pasta ai-service/")
else:
    print("✅ .env carregado com sucesso!")
