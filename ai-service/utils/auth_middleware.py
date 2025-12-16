# ai-service/utils/auth_middleware.py
"""
Middleware de autenticação para proteger endpoints internos.
Valida header X-Internal-API-Key compartilhado entre Node.js e Python.
"""

import logging
from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from config.settings import get_settings

logger = logging.getLogger(__name__)


async def verify_internal_api_key(request: Request, call_next):
    """
    Middleware que verifica a chave de API interna (X-Internal-API-Key).
    
    Regras:
    - Endpoints públicos (health, docs, root) são sempre permitidos
    - Endpoints internos (/api/v1/*) exigem header X-Internal-API-Key válido
    - Se INTERNAL_API_KEY não estiver configurado, desabilita autenticação (dev mode)
    """
    settings = get_settings()
    
    # Lista de paths públicos (não exigem autenticação)
    public_paths = [
        "/",
        "/health",
        "/version",
        "/docs",
        "/redoc",
        "/openapi.json",
        "/favicon.ico"
    ]
    
    # Se o path é público, passa direto
    if request.url.path in public_paths or request.url.path.startswith("/docs") or request.url.path.startswith("/redoc"):
        return await call_next(request)
    
    # Se INTERNAL_API_KEY não está configurado, permite tudo (modo desenvolvimento)
    # Em produção, isso deve estar SEMPRE configurado
    if not settings.internal_api_key:
        logger.warning(
            "⚠️ INTERNAL_API_KEY não configurado. Autenticação desabilitada (modo desenvolvimento). "
            "Configure INTERNAL_API_KEY em produção!"
        )
        return await call_next(request)
    
    # Para endpoints internos, exige autenticação
    if request.url.path.startswith("/api/v1/"):
        api_key_header = request.headers.get("X-Internal-API-Key")
        
        if not api_key_header:
            logger.warning(f"❌ Requisição sem X-Internal-API-Key: {request.method} {request.url.path}")
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={
                    "error": "Unauthorized",
                    "message": "Header X-Internal-API-Key é obrigatório para endpoints internos"
                }
            )
        
        if api_key_header != settings.internal_api_key:
            logger.warning(
                f"❌ Chave de API inválida para {request.method} {request.url.path} "
                f"(recebida: {api_key_header[:10]}...)"
            )
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={
                    "error": "Forbidden",
                    "message": "Chave de API inválida"
                }
            )
        
        # Chave válida, continua
        logger.debug(f"✅ Autenticação válida: {request.method} {request.url.path}")
    
    return await call_next(request)

