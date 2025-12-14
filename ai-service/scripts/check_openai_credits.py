#!/usr/bin/env python3
"""
Script para verificar se a API da OpenAI está funcionando e se há créditos disponíveis.
"""
import os
import sys
from dotenv import load_dotenv

# Adiciona o diretório pai ao path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

load_dotenv()

def check_openai():
    """Verifica status da API OpenAI."""
    api_key = os.getenv("OPENAI_API_KEY")
    
    if not api_key:
        print("❌ OPENAI_API_KEY não encontrada no ambiente!")
        print("   Configure a variável OPENAI_API_KEY no arquivo .env")
        return False
    
    print(f"✅ Chave de API encontrada: {api_key[:10]}...{api_key[-4:]}")
    
    try:
        from openai import OpenAI
        
        client = OpenAI(api_key=api_key)
        
        # Tenta fazer uma chamada simples para verificar créditos
        print("\n🔍 Testando API da OpenAI...")
        
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": "Diga apenas 'OK'"}],
            max_tokens=5
        )
        
        print("✅ API respondeu com sucesso!")
        print(f"   Resposta: {response.choices[0].message.content}")
        print("\n✅ **Créditos disponíveis!** A API está funcionando normalmente.")
        return True
        
    except Exception as e:
        error_str = str(e).lower()
        
        if "insufficient_quota" in error_str or "quota" in error_str:
            print("\n❌ **CRÉDITOS ESGOTADOS!**")
            print("   A API da OpenAI retornou: insufficient_quota")
            print("   Acesse: https://platform.openai.com/account/billing")
            print("   e adicione créditos à sua conta.")
            return False
        elif "rate_limit" in error_str or "429" in error_str:
            print("\n⚠️ **RATE LIMIT EXCEDIDO**")
            print("   Muitas requisições em pouco tempo.")
            print("   Aguarde alguns minutos e tente novamente.")
            return False
        elif "invalid" in error_str and "key" in error_str or "401" in error_str:
            print("\n❌ **CHAVE DE API INVÁLIDA**")
            print("   A chave de API não é válida ou foi revogada.")
            print("   Verifique: https://platform.openai.com/api-keys")
            return False
        else:
            print(f"\n❌ **ERRO DESCONHECIDO:** {e}")
            print("   Tipo: " + type(e).__name__)
            return False

if __name__ == "__main__":
    print("=" * 60)
    print("🔍 VERIFICAÇÃO DE CRÉDITOS OPENAI")
    print("=" * 60)
    print()
    
    success = check_openai()
    
    print()
    print("=" * 60)
    sys.exit(0 if success else 1)












