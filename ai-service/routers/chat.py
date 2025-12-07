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
        logger.error(f"❌ Erro no Chat: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno ao processar pergunta")