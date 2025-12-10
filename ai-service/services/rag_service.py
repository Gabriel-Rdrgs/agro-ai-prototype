# ai-service/services/rag_service.py
import logging
import os
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain.schema import SystemMessage, HumanMessage
from sqlalchemy import select

from utils.database import get_db_session
from models.document_model import Document

print("🚀 Carregando Serviço RAG...")

logger = logging.getLogger(__name__)

class RagService:
    def __init__(self):
        api_key = os.getenv("OPENAI_API_KEY")
        
        if not api_key:
            logger.warning("⚠️ OPENAI_API_KEY não encontrada! Chat IA não funcionará.")
            self.embeddings = None
            self.llm = None
            return
        
        try:
            # 1. Modelo de Embeddings
            self.embeddings = OpenAIEmbeddings(
                model="text-embedding-3-small",
                openai_api_key=api_key
            )
            
            # 2. LLM (Cérebro)
            self.llm = ChatOpenAI(
                model="gpt-4o-mini",
                temperature=0,
                openai_api_key=api_key
            )
            logger.info("✅ OpenAI configurado com sucesso")
        except Exception as e:
            logger.error(f"❌ Erro ao configurar OpenAI: {e}")
            self.embeddings = None
            self.llm = None

    def ask(self, question: str) -> dict:
        """
        Recebe uma pergunta, busca contexto e retorna a resposta.
        """
        # Verifica se OpenAI está configurado
        if not self.llm or not self.embeddings:
            return {
                "answer": "⚠️ **Serviço de IA não configurado.**\n\nA chave de API da OpenAI (OPENAI_API_KEY) não foi encontrada ou está inválida. Por favor, configure a variável de ambiente.",
                "sources": [],
                "error_type": "not_configured"
            }
        
        try:
            # A. Buscar Contexto Relevante
            relevant_docs = self._retrieve_context(question)
            
            if not relevant_docs:
                return {
                    "answer": "Não encontrei informações nos manuais técnicos sobre esse assunto.",
                    "sources": []
                }

            # B. Montar o Prompt (Agora acessando dicts)
            context_text = "\n\n".join([d['content'] for d in relevant_docs])
            
            # --- DEBUG MENTOR SENIOR ---
            logger.info(f"🔍 Contexto Recuperado ({len(relevant_docs)} chunks):")
            # Imprime os primeiros 200 caracteres de cada chunk para conferência
            for i, doc in enumerate(relevant_docs):
                logger.info(f"Chunk {i+1}: {doc['content'][:200]}...")
            # ---------------------------

            # Extrai fontes únicas
            sources = list(set([d['metadata'].get("source", "Desconhecido") for d in relevant_docs]))

            system_prompt = """
            Você é um Agrônomo Senior IA especialista em Tomate.
            Use o contexto fornecido para responder à pergunta do produtor.
            
            Diretrizes:
            1. Se a resposta exata estiver no texto, responda diretamente.
            2. Se a resposta não for explícita, mas houver dados relevantes (ex: faixas ideais, limites de dano, fatores prejudiciais), use-os para construir uma resposta útil.
            3. Se realmente não houver nada relacionado, diga que não sabe.
            4. Cite a fonte baseada no contexto.
            """
            
            user_prompt = f"""
            CONTEXTO TÉCNICO:
            {context_text}

            PERGUNTA DO USUÁRIO:
            {question}
            """

            # C. Gerar Resposta
            response = self.llm.invoke([
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_prompt)
            ])

            return {
                "answer": response.content,
                "sources": sources
            }

        except Exception as e:
            error_str = str(e).lower()
            error_type = type(e).__name__
            
            # Detecta erros específicos da OpenAI
            if "insufficient_quota" in error_str or "quota" in error_str:
                logger.error(f"❌ OpenAI: Créditos insuficientes ou quota excedida: {e}")
                return {
                    "answer": "⚠️ **Créditos da OpenAI esgotados ou quota excedida.**\n\nPor favor, verifique sua conta OpenAI e adicione créditos se necessário. A funcionalidade de chat IA está temporariamente indisponível.",
                    "sources": [],
                    "error_type": "insufficient_quota"
                }
            elif "rate_limit" in error_str or "429" in error_str:
                logger.error(f"❌ OpenAI: Rate limit excedido: {e}")
                return {
                    "answer": "⚠️ **Muitas requisições em pouco tempo.**\n\nPor favor, aguarde alguns segundos e tente novamente.",
                    "sources": [],
                    "error_type": "rate_limit"
                }
            elif "invalid" in error_str and "key" in error_str or "401" in error_str or "authentication" in error_str:
                logger.error(f"❌ OpenAI: Chave de API inválida ou ausente: {e}")
                return {
                    "answer": "⚠️ **Chave de API da OpenAI inválida ou não configurada.**\n\nVerifique se a variável OPENAI_API_KEY está configurada corretamente no ambiente.",
                    "sources": [],
                    "error_type": "invalid_api_key"
                }
            else:
                logger.error(f"❌ Erro no RAG ({error_type}): {e}", exc_info=True)
                return {
                    "answer": f"Erro ao processar sua pergunta: {str(e)[:200]}",
                    "sources": [],
                    "error_type": error_type
                }

    def _retrieve_context(self, question: str, k=8):
        """
        Busca os k trechos mais similares no Postgres e retorna como DICIONÁRIOS.
        """
        # 1. Vetoriza a pergunta
        query_vector = self.embeddings.embed_query(question)
        
        with get_db_session() as session:
            # 2. Busca vetorial
            stmt = select(Document).order_by(
                Document.embedding.cosine_distance(query_vector)
            ).limit(k)
            
            results = session.execute(stmt).scalars().all()
            
            # 3. CORREÇÃO CRÍTICA: Converter para dict dentro da sessão
            # Isso carrega os dados na memória antes da sessão fechar.
            return [
                {
                    "content": doc.content,
                    "metadata": doc.metadata_ or {}
                }
                for doc in results
            ]

# Instância Global
rag_service = RagService()