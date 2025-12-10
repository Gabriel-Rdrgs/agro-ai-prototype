# ai-service/routers/chat.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.rag_service import rag_service
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

# Define o formato do JSON que vamos receber
class ChatQueryRequest(BaseModel):
    question: str

# Define a rota
@router.post("/query")
async def ask_agronomist(request: ChatQueryRequest):
    """
    Endpoint para conversar com o Assistente Agronômico (RAG).
    Recebe: {"question": "Texto..."}
    Retorna: {"answer": "...", "sources": [...]}
    """
    try:
        logger.info(f"💬 Chat Query: {request.question}")
        
        # Chama o serviço que acabamos de testar
        result = rag_service.ask(request.question)
        
        return {
            "status": "success",
            "answer": result["answer"],
            "sources": result["sources"]
        }
    except Exception as e:
        error_str = str(e).lower()
        
        # Detecta erros específicos da OpenAI
        if "insufficient_quota" in error_str or "quota" in error_str:
            logger.error(f"❌ OpenAI: Créditos insuficientes: {e}")
            raise HTTPException(
                status_code=402,  # Payment Required
                detail="Créditos da OpenAI esgotados. Por favor, adicione créditos à sua conta OpenAI."
            )
        elif "rate_limit" in error_str or "429" in error_str:
            logger.error(f"❌ OpenAI: Rate limit: {e}")
            raise HTTPException(
                status_code=429,  # Too Many Requests
                detail="Muitas requisições. Aguarde alguns segundos e tente novamente."
            )
        elif "invalid" in error_str and "key" in error_str or "401" in error_str:
            logger.error(f"❌ OpenAI: API key inválida: {e}")
            raise HTTPException(
                status_code=401,  # Unauthorized
                detail="Chave de API da OpenAI inválida ou não configurada."
            )
        else:
            logger.error(f"❌ Erro no Chat: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"Erro interno: {str(e)[:200]}")