# ai-service/services/rag_ingestion.py
import logging
import os
import sys
import re
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings

# Garante que o diretório raiz (/app) esteja no PYTHONPATH quando rodar como script
CURRENT_DIR = os.path.dirname(__file__)
PROJECT_ROOT = os.path.dirname(CURRENT_DIR)
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

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
    
    def _clean_text(self, text: str) -> str:
        """
        Remove caracteres problemáticos que causam erro no PostgreSQL.
        - Remove caracteres NUL (0x00)
        - Remove outros caracteres de controle problemáticos
        - Normaliza espaços em branco
        """
        if not text:
            return text
        
        # Remove caracteres NUL (0x00) - principal causa do erro
        text = text.replace('\x00', '')
        
        # Remove outros caracteres de controle problemáticos (exceto \n, \r, \t)
        # Mantém apenas caracteres imprimíveis e quebras de linha normais
        cleaned = []
        for char in text:
            # Mantém caracteres imprimíveis, espaços, tabs, newlines, carriage returns
            if char.isprintable() or char in ['\n', '\r', '\t']:
                cleaned.append(char)
            # Remove outros caracteres de controle
            elif ord(char) < 32 and char not in ['\n', '\r', '\t']:
                continue
            else:
                cleaned.append(char)
        
        text = ''.join(cleaned)
        
        # Normaliza múltiplos espaços em branco (opcional, mas ajuda)
        text = re.sub(r' +', ' ', text)  # Múltiplos espaços → um espaço
        text = re.sub(r'\n{3,}', '\n\n', text)  # Múltiplas quebras de linha → duas
        
        return text.strip()

    def process_and_save(self, file_path: str, base_metadata: dict | None = None) -> int:
        """
        Lê PDF, gera vetores e salva no Postgres.
        
        Returns:
            Número de chunks salvos no banco de dados
        """
        try:
            logger.info(f"🚀 Iniciando ingestão: {file_path}")
            
            # A. Leitura e Chunking
            loader = PyPDFLoader(file_path)
            raw_docs = loader.load()
            
            # Limpa caracteres problemáticos antes de fazer chunking
            for doc in raw_docs:
                doc.page_content = self._clean_text(doc.page_content)
            
            chunks = self.text_splitter.split_documents(raw_docs)
            logger.info(f"   📄 Texto extraído: {len(chunks)} chunks gerados.")

            # B. Gerar Embeddings (Chamada à API OpenAI)
            logger.info("   🧠 Gerando embeddings via OpenAI... (pode demorar)")
            texts = [self._clean_text(c.page_content) for c in chunks]  # Limpa novamente antes de gerar embeddings
            vectors = self.embeddings_model.embed_documents(texts)
            logger.info("   ✅ Embeddings gerados com sucesso.")

            # C. Salvar no Banco usando o Context Manager oficial
            with get_db_session() as session:
                count = 0
                for i, chunk in enumerate(chunks):
                    # Monta metadata rica combinando informações do PDF e do chunk
                    metadata = {}
                    if base_metadata:
                        metadata.update(base_metadata)
                    metadata.update({
                        "source": os.path.basename(file_path),
                        "page": chunk.metadata.get("page", 0)
                    })

                    # Limpa o conteúdo antes de salvar (garante que não há caracteres NUL)
                    cleaned_content = self._clean_text(chunk.page_content)
                    
                    doc = Document(
                        content=cleaned_content,
                        metadata_=metadata,
                        embedding=vectors[i]
                    )
                    session.add(doc)
                    count += 1
                
                # O commit é feito automaticamente pelo context manager se não houver erro
                logger.info(f"   💾 SUCESSO: {count} documentos salvos no Banco Vetorial!")
                return count

        except Exception as e:
            logger.error(f"❌ Erro crítico na ingestão: {e}")
            raise e

    # --- EXECUÇÃO VIA DOCKER ---
if __name__ == "__main__":
    service = DocumentIngestionService()

    # Lista de PDFs a serem ingeridos com metadata temática
    pdf_configs = [
        {
            "paths": [
                "Clima e Produção de Tomates no Brasil.pdf",
                os.path.join("docs", "Clima e Produção de Tomates no Brasil.pdf"),
            ],
            "base_metadata": {
                "crop": "Tomate",
                "theme": "Clima",
                "source_type": "ClimaProducao"
            }
        },
        {
            "paths": [
                "Função Custo de Armazenagem de Tomate.pdf",
                os.path.join("docs", "Função Custo de Armazenagem de Tomate.pdf"),
            ],
            "base_metadata": {
                "crop": "Tomate",
                "theme": "Armazenagem",
                "source_type": "CustoArmazenagem"
            }
        },
        {
            "paths": [
                "Épocas de Plantio e Métricas de Decisão paraCultivo de Tomate no Brasil.pdf",
                os.path.join("docs", "Épocas de Plantio e Métricas de Decisão paraCultivo de Tomate no Brasil.pdf"),
            ],
            "base_metadata": {
                "crop": "Tomate",
                "theme": "PlantioDecisao",
                "source_type": "EpocasPlantioDecisao"
            }
        }
    ]

    for cfg in pdf_configs:
        existing_path = next((p for p in cfg["paths"] if os.path.exists(p)), None)
        if existing_path:
            logger.info(f"📚 Encontrado PDF para ingestão: {existing_path}")
            service.process_and_save(existing_path, base_metadata=cfg["base_metadata"])
        else:
            logger.error(
                f"Arquivo não encontrado em nenhum dos caminhos: {', '.join(cfg['paths'])}. "
                f"Verifique se o PDF foi colocado na pasta correta dentro de ai-service."
            )