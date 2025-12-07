# ai-service/services/rag_ingestion.py
import logging
import os
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings

# Importa a infraestrutura oficial de banco
from utils.database import get_db_session 
from models.document_model import Document

# Configuração de Log
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DocumentIngestionService:
    def __init__(self):
        # 1. Configura a API de Embeddings (OpenAI)
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            logger.warning("⚠️ OPENAI_API_KEY não encontrada! O processo falhará ao gerar vetores.")
        
        self.embeddings_model = OpenAIEmbeddings(
            model="text-embedding-3-small",
            openai_api_key=api_key
        )

        # 2. Configura o Splitter (Quebrador de texto)
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            separators=["\n\n", "\n", " ", ""]
        )

    def process_and_save(self, file_path: str):
        """
        Lê PDF, gera vetores e salva no Postgres.
        """
        try:
            logger.info(f"🚀 Iniciando ingestão: {file_path}")
            
            # A. Leitura e Chunking
            loader = PyPDFLoader(file_path)
            raw_docs = loader.load()
            chunks = self.text_splitter.split_documents(raw_docs)
            logger.info(f"   📄 Texto extraído: {len(chunks)} chunks gerados.")

            # B. Gerar Embeddings (Chamada à API OpenAI)
            logger.info("   🧠 Gerando embeddings via OpenAI... (pode demorar)")
            texts = [c.page_content for c in chunks]
            vectors = self.embeddings_model.embed_documents(texts)
            logger.info("   ✅ Embeddings gerados com sucesso.")

            # C. Salvar no Banco usando o Context Manager oficial
            with get_db_session() as session:
                count = 0
                for i, chunk in enumerate(chunks):
                    doc = Document(
                        content=chunk.page_content,
                        metadata_={
                            "source": os.path.basename(file_path),
                            "page": chunk.metadata.get("page", 0)
                        },
                        embedding=vectors[i]
                    )
                    session.add(doc)
                    count += 1
                
                # O commit é feito automaticamente pelo context manager se não houver erro
                logger.info(f"   💾 SUCESSO: {count} documentos salvos no Banco Vetorial!")

        except Exception as e:
            logger.error(f"❌ Erro crítico na ingestão: {e}")
            raise e

# --- EXECUÇÃO VIA DOCKER ---
if __name__ == "__main__":
    service = DocumentIngestionService()
    # Certifique-se que este arquivo existe dentro do container
    pdf_name = "Clima e Produção de Tomates no Brasil.pdf" 
    
    if os.path.exists(pdf_name):
        service.process_and_save(pdf_name)
    else:
        logger.error(f"Arquivo {pdf_name} não encontrado. Colocou ele na pasta ai-service?")