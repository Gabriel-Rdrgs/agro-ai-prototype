# ai-service/scripts/verify_intelligence.py
import requests
import os
from dotenv import load_dotenv

# Carrega as variáveis (para pegar a senha interna)
load_dotenv()

API_URL = "http://127.0.0.1:8000/api/v1/chat/general" # Ajuste se a rota for diferente no chat.py
INTERNAL_KEY = os.getenv("INTERNAL_API_KEY")

def test_security():
    print("\n🕵️  1. TESTE DE SEGURANÇA (Tentando entrar sem chave)...")
    try:
        response = requests.post(
            API_URL, 
            json={"message": "Oi"},
            headers={} # Sem header de auth
        )
        if response.status_code == 403:
            print("   ✅ SUCESSO: A API bloqueou o invasor! (403 Forbidden)")
        else:
            print(f"   ❌ FALHA: A API deixou entrar! Status: {response.status_code}")
    except Exception as e:
        print(f"   Erro de conexão: {e}")

def test_intelligence():
    print("\n🧠  2. TESTE DE INTELIGÊNCIA (Perguntando sobre Tomates)...")
    
    # Pergunta técnica que SÓ TEM NO PDF que ingerimos
    pergunta = "Qual a temperatura ideal para o desenvolvimento do tomateiro?"
    
    headers = {
        "X-API-Key": INTERNAL_KEY, # A senha correta
        "Content-Type": "application/json"
    }
    
    payload = {
        "message": pergunta,
        "history": [] # Histórico vazio
    }
    
    try:
        response = requests.post(API_URL, json=payload, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            print("   ✅ RESPOSTA DA IA:")
            print("   " + "-"*40)
            print(f"   🤖: {data.get('answer', 'Sem resposta')}")
            print("   " + "-"*40)
            
            # Verifica se citou a fonte
            sources = data.get('sources', [])
            if sources:
                print(f"   📚 Fontes citadas: {sources}")
            else:
                print("   ⚠️ Aviso: Nenhuma fonte citada.")
        else:
            print(f"   ❌ Erro na requisição: {response.text}")

    except Exception as e:
        print(f"   Erro crítico: {e}")

if __name__ == "__main__":
    if not INTERNAL_KEY:
        print("❌ ERRO: INTERNAL_API_KEY não encontrada no .env")
    else:
        test_security()
        test_intelligence()