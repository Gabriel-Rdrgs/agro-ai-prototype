# ai-service/test_rag_chat.py
import logging
from services.rag_service import rag_service

# Configura log para vermos o que acontece
logging.basicConfig(level=logging.ERROR) 

if __name__ == "__main__":
    print("\n🍅 --- TESTE DO CONSULTOR IA (RAG) ---\n")
    
    # Pergunta real baseada no PDF que você subiu (Clima e Produção de Tomates)
    pergunta = "Qual a temperatura ideal para a germinação do tomate?"
    
    print(f"❓ Pergunta: {pergunta}")
    print("⏳ Pesquisando nos manuais e gerando resposta...\n")
    
    resultado = rag_service.ask(pergunta)
    
    print("🤖 RESPOSTA DA IA:")
    print("-" * 40)
    print(resultado["answer"])
    print("-" * 40)
    print(f"📚 Fontes: {resultado['sources']}")
    print("\n---------------------------------------\n")